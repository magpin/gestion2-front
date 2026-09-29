"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import {
  abonosIniciales,
  alternar,
  cambiarDescuento,
  cambiarValor,
  problemaDelRecibo,
  totalDescuentos,
  totalRecibo,
  type AbonoBorrador,
} from "@/modules/cobros/lib/recibo";
import { SelectorProveedor } from "@/modules/compras/components/SelectorProveedor";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { problemaDelMedio, SelectorMedio, type Medio } from "@/modules/tesoreria/components/SelectorMedio";
import { movimientosConceptoApi } from "@/modules/tesoreria/services/movimientos-concepto.service";
import type { CuentaBancariaResumen } from "@/modules/tesoreria/types/bancos.types";
import type { CajaResumen } from "@/modules/tesoreria/types/tesoreria.types";
import { problemaDelAnticipo, retencionDelAnticipo, salePlata } from "../lib/comprobante";
import { pagosApi } from "../services/pagos.service";
import { NOMBRE_TRAMO, type CompraPorPagar } from "../types/pagos.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface ProveedorInicial {
  id: string;
  nombre: string;
}

/**
 * El comprobante de egreso: un proveedor, una fecha, de dónde sale la plata,
 * cuánto se le paga a cada compra y, si hay, el anticipo que se le entrega.
 *
 * Es el documento de toda plata que sale hacia un proveedor: el «Pagar» de
 * Compras y el de Pagos abren este mismo diálogo. El descuento por pronto
 * pago se propone solo mientras está en plazo; el anticipo lleva la retención
 * que calcula el motor, porque la ley manda retener en el pago o abono en
 * cuenta, lo que ocurra primero.
 */
export function ComprobanteEgresoDialog({
  abierto,
  proveedor,
  compraId,
  onCerrar,
  onRegistrado,
}: {
  abierto: boolean;
  proveedor?: ProveedorInicial | null;
  /** La compra desde la que se abrió: arranca marcada por su saldo. */
  compraId?: string;
  onCerrar: () => void;
  /** Después de guardar, antes de cerrar: el programado lo usa para quedar pagado. */
  onRegistrado?: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="xl">
        {abierto && (
          <Contenido
            key={`${proveedor?.id ?? "nuevo"}-${compraId ?? ""}`}
            proveedorInicial={proveedor ?? null}
            compraId={compraId}
            onCerrar={onCerrar}
            onRegistrado={onRegistrado}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  proveedorInicial,
  compraId,
  onCerrar,
  onRegistrado,
}: {
  proveedorInicial: ProveedorInicial | null;
  compraId?: string;
  onCerrar: () => void;
  onRegistrado?: () => void;
}) {
  const queryClient = useQueryClient();
  const [proveedor, setProveedor] = useState<TerceroResumen | null>(
    proveedorInicial ? ({ id: proveedorInicial.id, nombre: proveedorInicial.nombre } as TerceroResumen) : null,
  );
  const [fecha, setFecha] = useState(hoy());
  const [medio, setMedio] = useState<Medio>("BANCO");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [abonos, setAbonos] = useState<AbonoBorrador<CompraPorPagar>[] | null>(null);
  const [anticipo, setAnticipo] = useState("");
  const [conceptoRetencion, setConceptoRetencion] = useState<string | null>(null);

  const { data: compras, isFetching } = useQuery({
    queryKey: ["pagos", "compras", proveedor?.id],
    queryFn: () => pagosApi.comprasDe(proveedor!.id),
    enabled: proveedor !== null,
  });
  const renglones = abonos ?? (compras ? abonosIniciales(compras, compraId) : []);
  const cambiar = (f: (a: AbonoBorrador<CompraPorPagar>[]) => AbonoBorrador<CompraPorPagar>[]) =>
    setAbonos(f(renglones));

  const pagos = totalRecibo(renglones);
  const descuentos = totalDescuentos(renglones);
  const anticipoValor = Number(anticipo) > 0 ? Number(anticipo) : 0;

  // La retención del anticipo: la calcula el motor, igual que al guardar.
  const anticipoQuieto = useQuieto(anticipoValor);
  const pideRetencion = proveedor !== null && anticipoQuieto > 0 && fecha !== "";
  const propuestaQuery = useQuery({
    queryKey: ["pagos", "retencion-anticipo", proveedor?.id, fecha, anticipoQuieto, conceptoRetencion],
    queryFn: () =>
      pagosApi.retencionAnticipo({
        terceroId: proveedor!.id,
        fecha,
        base: anticipoQuieto,
        conceptoCodigo: conceptoRetencion ?? undefined,
      }),
    enabled: pideRetencion,
  });
  const propuesta = pideRetencion ? propuestaQuery.data : undefined;
  const retencion = anticipoValor > 0 ? retencionDelAnticipo(propuesta) : 0;
  const sale = salePlata(pagos, anticipoValor, retencion);

  // El 4×1000 que cobraría el banco, sobre lo que sale.
  const saleQuieto = useQuieto(sale);
  const { data: gmf = 0 } = useQuery({
    queryKey: ["tesoreria", "gmf-previsto", cuenta?.id, saleQuieto],
    queryFn: () => movimientosConceptoApi.gmfPrevisto(cuenta!.id, saleQuieto),
    enabled: medio === "BANCO" && cuenta !== null && saleQuieto > 0,
  });
  const gmfMostrado = medio === "BANCO" && cuenta !== null && sale > 0 ? gmf : 0;

  const problema =
    proveedor === null
      ? "Elegí el proveedor."
      : fecha === ""
        ? "Elegí la fecha."
        : (problemaDelMedio(medio, caja, cuenta) ??
          problemaDelRecibo(renglones, anticipo, "", "compra") ??
          (anticipoValor > 0
            ? anticipoQuieto !== anticipoValor
              ? "Calculando la retención del anticipo…"
              : problemaDelAnticipo(propuesta, propuestaQuery.isFetching)
            : null));

  const guardar = useMutation({
    mutationFn: () =>
      pagosApi.crearComprobante({
        terceroId: proveedor!.id,
        fecha,
        medio,
        cajaId: medio === "CAJA" ? caja!.id : undefined,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : undefined,
        aplicaciones: renglones
          .filter((a) => a.marcada)
          .map((a) => ({
            compraId: a.factura.id,
            valor: Number(a.valor || 0),
            descuento: Number(a.descuento) > 0 ? Number(a.descuento) : undefined,
          })),
        anticipo: anticipoValor > 0 ? anticipoValor : undefined,
        conceptoRetencionAnticipo: anticipoValor > 0 ? (conceptoRetencion ?? undefined) : undefined,
      }),
    onSuccess: async (c) => {
      await Promise.all(
        [["pagos"], ["comprobantes-egreso"], ["compras"], ["cajas"], ["cuentas-bancarias"], ["movimientos-concepto"]].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito(
        `Comprobante ${c.numero} registrado`,
        `Salieron ${formatCOP(c.total)}${c.gmf > 0 ? ` más ${formatCOP(c.gmf)} de 4×1000` : ""}.`,
      );
      onRegistrado?.();
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const conceptos = propuesta?.conceptos ?? [];

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Comprobante de egreso</DialogTitle>
          <DialogDescription>
            Pago de una o varias compras del mismo proveedor, o un anticipo. Se asienta al guardar.
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_1.2fr]">
          <Campo id="egreso-proveedor" etiqueta="Proveedor">
            <SelectorProveedor
              valor={proveedor}
              onElegir={(t) => {
                setProveedor(t);
                setAbonos(null);
                setConceptoRetencion(null);
              }}
            />
          </Campo>
          <Campo id="egreso-fecha" etiqueta="Fecha">
            <Input
              id="egreso-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
          <Campo id="egreso-medio" etiqueta="Sale de">
            <SelectorMedio
              medio={medio}
              onMedio={setMedio}
              caja={caja}
              onCaja={setCaja}
              cuenta={cuenta}
              onCuenta={setCuenta}
            />
          </Campo>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border">
          <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">
            Compras por pagar a este proveedor
          </h3>
          {proveedor === null ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Elegí el proveedor para ver lo que se le debe.</p>
          ) : isFetching && compras === undefined ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : renglones.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No se le debe nada: si le vas a adelantar plata, escribí el anticipo abajo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-muted/60 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="w-10 px-4 py-2" />
                    <th className="px-4 py-2">Compra</th>
                    <th className="px-4 py-2">Vence</th>
                    <th className="px-4 py-2 text-right">Saldo</th>
                    <th className="w-40 px-4 py-2 text-right">Descuento</th>
                    <th className="w-44 px-4 py-2 text-right">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((a) => (
                    <tr key={a.factura.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={a.marcada}
                          onChange={() => cambiar((x) => alternar(x, a.factura.id))}
                          aria-label={`Pagar ${a.factura.numero}`}
                          className="size-4 accent-primary"
                        />
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold">{a.factura.numero}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            a.factura.tramo === "VENCIDO"
                              ? "rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
                              : "text-muted-foreground whitespace-nowrap"
                          }
                        >
                          {a.factura.venceEfectivo} · {NOMBRE_TRAMO[a.factura.tramo].toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                        {formatCOP(a.factura.pendiente)}
                      </td>
                      <td className="px-4 py-2">
                        <CampoPesos
                          value={a.descuento}
                          onChange={(v) => cambiar((x) => cambiarDescuento(x, a.factura.id, v))}
                          placeholder="—"
                          aria-label={`Descuento de ${a.factura.numero}`}
                          className="h-10 rounded-xl px-3 text-right font-mono"
                        />
                        {a.factura.descuentoSugerido > 0 && (
                          <p className="mt-1 text-right text-[11px] text-muted-foreground">
                            {a.factura.descuentoPct}% hasta el {a.factura.descuentoHasta}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <CampoPesos
                          value={a.valor}
                          onChange={(v) => cambiar((x) => cambiarValor(x, a.factura.id, v))}
                          placeholder="—"
                          aria-label={`Pago de ${a.factura.numero}`}
                          className="h-10 rounded-xl px-3 text-right font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo id="egreso-anticipo" etiqueta="Anticipo (plata adelantada, sin factura)">
            <CampoPesos
              id="egreso-anticipo"
              value={anticipo}
              onChange={setAnticipo}
              placeholder="—"
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          {anticipoValor > 0 && conceptos.length > 0 && (
            <Campo id="egreso-concepto-retencion" etiqueta="Concepto de retención del anticipo">
              <Select
                items={conceptos.map((c) => ({ value: c.codigo, label: c.nombre }))}
                value={conceptoRetencion}
                onValueChange={(v) => setConceptoRetencion(v as string | null)}
              >
                <SelectTrigger id="egreso-concepto-retencion" className="h-11 w-full rounded-xl px-4">
                  <SelectValue placeholder="Elegí el concepto" />
                </SelectTrigger>
                <SelectContent>
                  {conceptos.map((c) => (
                    <SelectItem key={c.codigo} value={c.codigo}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            Cada pago se registra como el pago de su compra: débito a Proveedores (220505) y crédito a{" "}
            {medio === "CAJA" ? "la caja" : "la cuenta bancaria"}, con el número del comprobante en el libro.
            {descuentos > 0 && " El descuento por pronto pago es un ingreso y salda la compra sin plata."}
            {anticipoValor > 0 &&
              ` El anticipo va a Anticipos a proveedores (133005)${retencion > 0 ? ` y se le retienen ${formatCOP(retencion)} en la fuente` : ""}.`}
            {gmfMostrado > 0 && ` El banco cobra ${formatCOP(gmfMostrado)} de 4×1000, que se registra como gasto.`}
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Sale {medio === "CAJA" ? "de la caja" : "del banco"}
            </p>
            <p className="font-mono text-3xl font-semibold whitespace-nowrap tabular-nums">
              {formatCOP(sale + gmfMostrado)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {renglones.filter((a) => a.marcada).length} de {renglones.length} compras
              {descuentos > 0 && ` · descuentos ${formatCOP(descuentos)}`}
              {retencion > 0 && ` · retención ${formatCOP(retencion)}`}
              {gmfMostrado > 0 && ` · 4×1000 ${formatCOP(gmfMostrado)}`}
            </p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ?? "Un comprobante guardado no se edita: se anula y queda en su historial."}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={problema !== null || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar comprobante
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
