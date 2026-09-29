"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { formatCOP, formatFecha } from "@/lib/utils";
import { CamposCompra } from "../components/CamposCompra";
import { useBorradorCompra } from "../hooks/useBorradorCompra";
import { comprasApi } from "../services/compras.service";
import type { CompraPrevia, CrearCompraInput } from "../types/compras.types";

/**
 * La compra nueva como página (pantallas 09 y 10): el formulario a la
 * izquierda y, a la derecha, cómo queda antes de guardar —totales, cada
 * retención, lo que se le va a pagar y el asiento—.
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

  const crear = useMutation({
    mutationFn: comprasApi.crear,
    onSuccess: async (c) => {
      await queryClient.invalidateQueries({ queryKey: ["compras"] });
      aviso.exito(b.soporte ? `Documento soporte ${c.numero_factura_proveedor} registrado` : "Compra registrada");
      router.push("/dashboard/compras");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const accion = b.soporte ? "Registrar documento soporte" : "Registrar compra";

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
        <Link
          href="/dashboard/compras"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Compras
        </Link>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          {b.soporte ? "Documento soporte" : "Nueva compra"}
          <span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {b.soporte
            ? "Para lo que le comprás a quien no factura. Lo numerás vos con tu resolución; queda sin transmitir."
            : "Asienta y aumenta el kardex al guardar. El costo de cada línea es el que dice la factura del proveedor."}
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <CamposCompra b={b} completa />
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <ResumenCompra
            previa={pedido === null ? undefined : previo.data}
            cargando={pedido !== null && previo.isFetching}
            error={pedido !== null && previo.isError ? mensajeDe(previo.error) : null}
            soporte={b.soporte}
          />
          <p className="text-sm text-muted-foreground">{b.problema ?? "Listo para guardar."}</p>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={datos === null || crear.isPending}
            onClick={() => datos !== null && crear.mutate(datos)}
          >
            {crear.isPending && <Loader2 className="size-4 animate-spin" />}
            {accion}
          </Button>
          <Button variant="outline" className="h-12 rounded-xl px-6" render={<Link href="/dashboard/compras" />}>
            Cancelar
          </Button>
        </aside>
      </div>
    </div>
  );
}

function mensajeDe(e: unknown): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m[0] : (m ?? "No se pudo armar el resumen.");
}

/** Totales, retenciones, «Le vas a pagar», vence y el asiento que haría. */
function ResumenCompra({
  previa,
  cargando,
  error,
  soporte,
}: {
  previa: CompraPrevia | undefined;
  cargando: boolean;
  error: string | null;
  soporte: boolean;
}) {
  if (previa === undefined) {
    return (
      <div className="rounded-3xl border border-dashed border-border px-5 py-6 text-sm text-muted-foreground">
        {cargando ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Armando el resumen…
          </span>
        ) : error !== null ? (
          <span className="text-danger">{error}</span>
        ) : (
          "Cuando esté todo, acá ves cuánto queda, qué se retiene y el asiento, antes de guardar."
        )}
      </div>
    );
  }

  const fila = (etiqueta: string, valor: number, fuerte = false) => (
    <div className="flex justify-between gap-3">
      <span className={fuerte ? "font-semibold" : "text-muted-foreground"}>{etiqueta}</span>
      <span className={`font-mono tabular-nums ${fuerte ? "font-semibold" : ""}`}>{formatCOP(valor)}</span>
    </div>
  );

  return (
    <div className={`flex flex-col gap-4 ${cargando ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-5 text-sm shadow-sm">
        {soporte && (
          <p className="mb-1 font-mono text-xs text-muted-foreground">Número {previa.numero}</p>
        )}
        {fila("Subtotal", previa.subtotal)}
        {previa.iva > 0 && fila("IVA", previa.iva)}
        {fila("Total", previa.total, true)}
        {previa.detalleRetenciones.map((r, i) => (
          <div key={i} className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {r.nombre}
              {r.tarifa !== null && (
                <span className="ml-1 text-xs">({(r.tarifa * 100).toLocaleString("es-CO", { maximumFractionDigits: 3 })} %)</span>
              )}
            </span>
            <span className="font-mono tabular-nums">−{formatCOP(r.valor)}</span>
          </div>
        ))}
        <div className="mt-2 border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">Le vas a pagar</span>
            <span className="font-mono text-xl font-semibold tabular-nums">{formatCOP(previa.neto)}</span>
          </div>
          {previa.vence !== null && (
            <p className="mt-1 text-right text-xs text-muted-foreground">Vence el {formatFecha(previa.vence)}</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 text-xs shadow-sm">
        <p className="mb-2 font-bold uppercase tracking-[0.14em] text-muted-foreground">Así queda en el libro</p>
        <table className="w-full">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 text-left font-medium">Cuenta</th>
              <th className="py-1 text-right font-medium">Débito</th>
              <th className="py-1 text-right font-medium">Crédito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {previa.asiento.map((l, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-2">
                  <span className="font-mono text-muted-foreground">{l.codigo}</span> {l.nombre}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">{l.debito > 0 ? formatCOP(l.debito) : ""}</td>
                <td className="py-1.5 text-right font-mono tabular-nums">{l.credito > 0 ? formatCOP(l.credito) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
