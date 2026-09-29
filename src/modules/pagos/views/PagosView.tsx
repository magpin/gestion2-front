"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CalendarClock, FileText, Loader2, Receipt, Wallet } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
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
import { Textarea } from "@/components/ui/textarea";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { ListaMovimientosConcepto } from "@/modules/tesoreria/components/ListaMovimientosConcepto";
import { MovimientoConceptoDialog } from "@/modules/tesoreria/components/MovimientoConceptoDialog";
import { AnticiposProveedor } from "../components/AnticiposProveedor";
import { ComprobanteEgresoDialog, type ProveedorInicial } from "../components/ComprobanteEgresoDialog";
import { PagosProgramados } from "../components/PagosProgramados";
import { pagosApi } from "../services/pagos.service";
import { NOMBRE_TRAMO, TRAMOS, type ComprobanteEgreso, type TramoPago } from "../types/pagos.types";

type Seccion = "Por pagar" | "Comprobantes" | "Programados" | "Sin factura" | "Anticipos";

const SECCIONES: Array<[Seccion, typeof FileText]> = [
  ["Por pagar", Wallet],
  ["Comprobantes", FileText],
  ["Programados", CalendarClock],
  ["Sin factura", Receipt],
  ["Anticipos", ArrowLeftRight],
];

/**
 * Egresos → Pagos: lo que se les debe a los proveedores y cada peso que sale,
 * con su comprobante de egreso.
 *
 * «Por pagar» ordena las compras por cuándo vencen; «Comprobantes», lo que ya
 * salió; «Programados», lo que viene sin factura todavía; «Sin factura», lo
 * que se paga por concepto (intereses, impuestos, retiros); «Anticipos», la
 * plata adelantada a un proveedor, cruzada contra su compra.
 */
export function PagosView() {
  const puedePagar = useTieneRol("CAJA", "DIRECTOR");
  const puedeProgramar = useTieneRol("CAJA", "DIRECTOR", "COMPRAS", "CONTADOR");
  const [seccion, setSeccion] = useState<Seccion>("Por pagar");
  const [comprobante, setComprobante] = useState<{ proveedor: ProveedorInicial | null } | null>(null);
  const [egreso, setEgreso] = useState(false);
  const [programar, setProgramar] = useState(false);

  const boton =
    seccion === "Programados" ? (
      puedeProgramar && <BotonNuevo etiqueta="Programar un pago" onClick={() => setProgramar(true)} />
    ) : seccion === "Sin factura" ? (
      puedePagar && <BotonNuevo etiqueta="Nuevo pago sin factura" onClick={() => setEgreso(true)} />
    ) : (
      puedePagar && (
        <BotonNuevo etiqueta="Nuevo comprobante de egreso" onClick={() => setComprobante({ proveedor: null })} />
      )
    );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Egresos
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Pagos<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lo que les debés a los proveedores y cada peso que sale, con su comprobante de egreso.
          </p>
        </div>
        {boton}
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Por pagar" && (
        <PorPagar onPagar={puedePagar ? (proveedor) => setComprobante({ proveedor }) : undefined} />
      )}
      {seccion === "Comprobantes" && <Comprobantes puedeAnular={puedePagar} />}
      {seccion === "Programados" && (
        <PagosProgramados
          puedeProgramar={puedeProgramar}
          puedePagar={puedePagar}
          nuevo={programar}
          onCerrarNuevo={() => setProgramar(false)}
        />
      )}
      {seccion === "Sin factura" && <ListaMovimientosConcepto direccion="SALIDA" puedeAnular={puedePagar} />}
      {seccion === "Anticipos" && <AnticiposProveedor puedeCruzar={puedePagar} />}

      <ComprobanteEgresoDialog
        abierto={comprobante !== null}
        proveedor={comprobante?.proveedor}
        onCerrar={() => setComprobante(null)}
      />
      <MovimientoConceptoDialog abierto={egreso} direccion="SALIDA" onCerrar={() => setEgreso(false)} />
    </div>
  );
}

function PorPagar({ onPagar }: { onPagar?: (proveedor: ProveedorInicial) => void }) {
  const [tramo, setTramo] = useState<TramoPago | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["pagos", "por-pagar"], queryFn: pagosApi.porPagar });

  if (isLoading || data === undefined) return <SkeletonTable />;

  const proveedores = data.proveedores
    .map((p) => {
      const compras = tramo === null ? p.compras : p.compras.filter((c) => c.tramo === tramo);
      return { ...p, compras, total: compras.reduce((t, c) => t + c.pendiente, 0) };
    })
    .filter((p) => p.compras.length > 0);

  return (
    <>
      <section className="mb-7 rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-5 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Les debés</p>
            <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">
              {formatCOP(data.total)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.compras} {data.compras === 1 ? "compra" : "compras"} · {data.proveedores.length}{" "}
            {data.proveedores.length === 1 ? "proveedor" : "proveedores"}
          </p>
        </div>
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {TRAMOS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tramo === t}
              onClick={() => setTramo(tramo === t ? null : t)}
              className={`px-6 py-4 text-left transition-colors ${tramo === t ? "bg-accent" : "bg-card hover:bg-accent/60"}`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                {t === "VENCIDO" && <span className="size-2 rounded-full bg-warning" />}
                {NOMBRE_TRAMO[t]}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">
                {formatCOP(data.tramos[t])}
              </p>
            </button>
          ))}
        </div>
      </section>

      {proveedores.length === 0 ? (
        <EmptyState
          titulo={tramo ? "Nada en este tramo" : "No le debés a nadie"}
          descripcion={tramo ? "Tocá el tramo otra vez para ver todo." : "Todas las compras están pagadas."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {proveedores.map((p) => (
            <section key={p.terceroId} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p.identificacion}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-semibold whitespace-nowrap tabular-nums">{formatCOP(p.total)}</span>
                  {onPagar && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-lg px-4"
                      onClick={() => onPagar({ id: p.terceroId, nombre: p.nombre })}
                    >
                      Pagar
                    </Button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <tbody>
                    {p.compras.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-5 py-2.5 font-mono font-semibold">{c.numero}</td>
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <span
                            className={
                              c.tramo === "VENCIDO"
                                ? "rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            Vence {c.venceEfectivo}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">
                          {c.descuentoSugerido > 0 &&
                            `Pronto pago: ${formatCOP(c.descuentoSugerido)} hasta el ${c.descuentoHasta}`}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono whitespace-nowrap tabular-nums">
                          {formatCOP(c.pendiente)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Comprobantes({ puedeAnular }: { puedeAnular: boolean }) {
  const [anulando, setAnulando] = useState<ComprobanteEgreso | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["comprobantes-egreso"],
    queryFn: pagosApi.comprobantes,
  });

  if (isLoading) return <SkeletonTable />;
  if (data.length === 0) {
    return <EmptyState titulo="Sin comprobantes todavía" descripcion="Cada pago que registres queda acá con su número." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Comprobante</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Proveedor</th>
              <th className="px-5 py-3">Salió de</th>
              <th className="px-5 py-3">Compras</th>
              <th className="px-5 py-3 text-right">Salió</th>
              {puedeAnular && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className={`border-t border-border ${c.estado === "ANULADO" ? "text-muted-foreground" : ""}`}>
                <td className="px-5 py-3 font-mono font-semibold">
                  {c.numero}
                  {c.estado === "ANULADO" && (
                    <span
                      title={c.motivoAnulacion ?? undefined}
                      className="ml-2 rounded-full border border-border px-2 py-0.5 font-sans text-[11px] font-medium"
                    >
                      Anulado
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 whitespace-nowrap">{c.fecha}</td>
                <td className="px-5 py-3">{c.terceroNombre}</td>
                <td className="px-5 py-3">{c.destino}</td>
                <td className="px-5 py-3 font-mono text-xs">
                  {c.aplicaciones.map((a) => a.compra).join(", ")}
                  {c.anticipo > 0 && <span className="block font-sans">+ anticipo {formatCOP(c.anticipo)}</span>}
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(c.total + c.anticipo - c.retencionAnticipo)}
                  {c.gmf > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground">4×1000 {formatCOP(c.gmf)}</span>
                  )}
                </td>
                {puedeAnular && (
                  <td className="px-5 py-3 text-right">
                    {c.estado === "VIGENTE" && (
                      <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={() => setAnulando(c)}>
                        Anular
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DialogoAnular comprobante={anulando} onCerrar={() => setAnulando(null)} />
    </>
  );
}

/**
 * Anular devuelve cada pago por la devolución de siempre: la plata vuelve al
 * mismo medio, las compras vuelven a deber y la retención del anticipo se
 * reversa. Si el anticipo ya se cruzó, primero se anula el cruce.
 */
function DialogoAnular({ comprobante, onCerrar }: { comprobante: ComprobanteEgreso | null; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const anular = useMutation({
    mutationFn: () => pagosApi.anularComprobante(comprobante!.id, motivo.trim()),
    onSuccess: async (c) => {
      await Promise.all(
        [["pagos"], ["comprobantes-egreso"], ["compras"], ["cajas"], ["cuentas-bancarias"], ["cruces-pago"]].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito(`Comprobante ${c.numero} anulado`);
      setMotivo("");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open={comprobante !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Anular {comprobante?.numero}</DialogTitle>
            <DialogDescription>
              Vuelve la plata a {comprobante?.destino}, las compras vuelven a deber lo pagado y descontado y se
              reversa la retención del anticipo. Si el anticipo ya se cruzó, primero anulá el cruce.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por qué se anula"
            aria-label="Motivo de la anulación"
            maxLength={300}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={motivo.trim().length < 3 || anular.isPending}
            onClick={() => anular.mutate()}
          >
            {anular.isPending && <Loader2 className="size-4 animate-spin" />}
            Anular comprobante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
