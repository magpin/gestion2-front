"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AsientoPrevio } from "@/components/shared/AsientoPrevio";
import { CabeceraPagina } from "@/components/shared/CabeceraPagina";
import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { DocumentoCompra, LineasCompra, PlazoCompra, QueSeCompro, Seccion } from "../components/CamposCompra";
import { useBorradorCompra, type BorradorCompra } from "../hooks/useBorradorCompra";
import { comprasApi } from "../services/compras.service";
import type { CompraPrevia, CrearCompraInput } from "../types/compras.types";

/**
 * La compra nueva como página (pantallas 09 y 10), como en el diseño:
 * Documento y Plazo y pago a la izquierda, el Resumen a la derecha, las líneas
 * y el asiento a lo ancho, y abajo qué pasa al registrarla.
 *
 * El resumen lo arma el servidor corriendo la compra de verdad y deshaciéndola
 * (`POST /compras/previo`): no hay una segunda cuenta en el navegador que se
 * pueda desalinear de la que se guarda.
 */
export function CompraNuevaView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const b = useBorradorCompra();

  const datos = b.datos();
  const pedido = useQuieto(datos === null ? null : JSON.stringify(datos), 500);
  const previo = useQuery({
    queryKey: ["compras", "previo", pedido],
    queryFn: () => comprasApi.previo(JSON.parse(pedido!) as CrearCompraInput),
    enabled: pedido !== null,
    retry: false,
    staleTime: 30_000,
    // El error se muestra en el resumen, no en un aviso que tapa la página.
    meta: SILENCIOSO,
  });
  const previa = pedido === null ? undefined : previo.data;

  const crear = useMutation({
    mutationFn: comprasApi.crear,
    onSuccess: async (c) => {
      await queryClient.invalidateQueries({ queryKey: ["compras"] });
      aviso.exito(b.soporte ? `Documento soporte ${c.numero_factura_proveedor} registrado` : "Compra registrada");
      router.push("/dashboard/compras");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  // «Te ahorrás»: el pronto pago sobre lo que se le va a pagar (PC24).
  const ahorro = previa && b.conPronto && Number(b.prontoPct) > 0 ? (previa.neto * Number(b.prontoPct)) / 100 : null;

  return (
    // Una región con el nombre del documento: se lee igual que el diálogo que
    // reemplaza, y desaparece al guardar.
    <div role="region" aria-label={b.soporte ? "Documento soporte" : "Nueva compra"} className="flex w-full flex-col gap-5">
      <CabeceraPagina
        ruta={[{ etiqueta: "Egresos" }, { etiqueta: "Compras", href: "/dashboard/compras" }, { etiqueta: "Nueva" }]}
        titulo={b.soporte ? "Documento soporte" : "Nueva compra"}
        subtitulo={
          b.soporte
            ? "Para comprarle a quien no factura. Lo emitís vos con tu numeración; queda sin transmitir."
            : "Mercancía y gastos en la misma factura. Cada línea va a su cuenta según el concepto."
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccion id="c-doc" titulo="Documento">
            <DocumentoCompra b={b} completa />
          </Seccion>
          {b.soporte ? (
            <Seccion id="ds-lin" titulo="Qué se compró">
              <QueSeCompro b={b} />
            </Seccion>
          ) : (
            <Seccion id="c-plazo" titulo="Plazo y pago">
              <PlazoCompra b={b} ahorro={ahorro} />
            </Seccion>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <Resumen
            b={b}
            previa={previa}
            cargando={pedido !== null && previo.isFetching}
            error={pedido !== null && previo.isError ? mensajeDe(previo.error) : null}
          />
        </aside>
      </div>

      {!b.soporte && (
        <section
          aria-labelledby="c-lineas"
          className="overflow-hidden rounded-[26px] border border-border bg-card shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-5 pb-4">
            <h2 id="c-lineas" className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Líneas de la factura
            </h2>
            <p className="text-xs text-muted-foreground">Mercancía entra al inventario · gasto va por concepto</p>
          </div>
          <LineasCompra b={b} completa />
        </section>
      )}

      {previa && <AsientoPrevio lineas={previa.asiento} />}

      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-grow text-[13px] text-muted-foreground">{b.problema ?? pie(b)}</p>
        <Button variant="outline" className="h-12 rounded-[16.8px] px-6" render={<Link href="/dashboard/compras" />}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="h-12 rounded-[16.8px] px-6 shadow-[0_8px_20px_rgb(0_0_0/0.15)]"
          disabled={datos === null || crear.isPending}
          onClick={() => datos !== null && crear.mutate(datos)}
        >
          {crear.isPending && <Loader2 className="size-4 animate-spin" />}
          {b.soporte ? "Registrar documento soporte" : "Registrar compra"}
        </Button>
      </div>
    </div>
  );
}

/** Lo que pasa al registrarla, en una frase (pie del diseño). */
function pie(b: BorradorCompra): string {
  if (b.soporte) return "Al registrarlo queda numerado con tu resolución y sin transmitir.";
  const unidades = b.lineas
    .filter((l) => l.tipo === "PRODUCTO" && l.producto !== null)
    .reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
  const destino = b.formaPago.modo === "CREDITO" ? "la factura aparece en Por pagar" : "se paga de contado";
  return unidades > 0
    ? `Al registrarla, suben ${unidades.toLocaleString("es-CO")} ${unidades === 1 ? "unidad" : "unidades"} al inventario y ${destino}.`
    : `Al registrarla, ${destino}.`;
}

function mensajeDe(e: unknown): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m[0] : (m ?? "No se pudo armar el resumen.");
}

/** La tarifa de IVA si todas las líneas llevan la misma: «IVA 19 %». */
function tarifaUnica(previa: CompraPrevia): string {
  if (previa.subtotal <= 0 || previa.iva <= 0) return "";
  const t = Math.round((previa.iva / previa.subtotal) * 1000) / 10;
  return [19, 5].includes(t) ? ` ${t} %` : "";
}

/** Resumen: subtotal, IVA, total, cada retención y lo que se le va a pagar. */
function Resumen({
  b,
  previa,
  cargando,
  error,
}: {
  b: BorradorCompra;
  previa: CompraPrevia | undefined;
  cargando: boolean;
  error: string | null;
}) {
  const fila = (etiqueta: string, valor: string, fuerte = false) => (
    <p className={`flex justify-between gap-3 text-sm ${fuerte ? "font-semibold" : ""}`}>
      <span className={fuerte ? "" : "text-muted-foreground"}>{etiqueta}</span>
      <span className="font-mono whitespace-nowrap tabular-nums">{valor}</span>
    </p>
  );
  const medio =
    b.formaPago.modo === "EFECTIVO"
      ? b.formaPago.caja?.nombre
      : b.formaPago.modo === "TRANSFERENCIA"
        ? b.formaPago.cuenta?.banco
        : undefined;

  return (
    <section
      aria-labelledby="c-res"
      className={`flex flex-col gap-2.5 rounded-[26px] border border-border bg-card p-5 shadow-sm ${cargando ? "opacity-60" : ""}`}
    >
      <h2 id="c-res" className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Resumen
      </h2>
      {previa === undefined ? (
        <p className="text-sm text-muted-foreground">
          {cargando ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Armando el resumen…
            </span>
          ) : error !== null ? (
            <span className="text-danger">{error}</span>
          ) : (
            "Cuando esté todo, acá ves cuánto queda, qué se retiene y el asiento, antes de guardar."
          )}
        </p>
      ) : (
        <>
          {fila(b.soporte ? "Valor" : "Subtotal", formatCOP(previa.subtotal))}
          {b.soporte ? fila("IVA", previa.iva > 0 ? formatCOP(previa.iva) : "No aplica") : fila(`IVA${tarifaUnica(previa)}`, formatCOP(previa.iva))}
          {!b.soporte && fila("Total factura", formatCOP(previa.total), true)}
          {previa.detalleRetenciones.map((r, i) => (
            <p key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {r.nombre}
                {r.tarifa !== null && ` ${(r.tarifa * 100).toLocaleString("es-CO", { maximumFractionDigits: 3 })} %`}
              </span>
              <span className="font-mono whitespace-nowrap tabular-nums">− {formatCOP(r.valor)}</span>
            </p>
          ))}
          <div className="mt-2 border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {b.soporte ? "Le entregás" : "Le vas a pagar"}
            </p>
            <p className="mt-1 font-mono text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">
              {formatCOP(previa.neto)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.formaPago.modo === "CREDITO"
                ? `Queda en Pagos → Por pagar${previa.vence ? `, vence el ${fechaCorta(previa.vence)}` : ""}`
                : `Sale de ${medio ?? "la caja o el banco"} con comprobante de egreso`}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

/** «28 oct». */
function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]}`;
}
