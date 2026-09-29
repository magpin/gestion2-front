"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, FileText, HandCoins, Loader2, PiggyBank, ReceiptText, Search, SearchX } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { ListaMovimientosConcepto } from "@/modules/tesoreria/components/ListaMovimientosConcepto";
import { MovimientoConceptoDialog } from "@/modules/tesoreria/components/MovimientoConceptoDialog";
import { AnticiposYCruces } from "../components/AnticiposYCruces";
import { ReciboCajaDialog, type ClienteInicial } from "../components/ReciboCajaDialog";
import { cobrosApi } from "../services/cobros.service";
import { EDADES, NOMBRE_EDAD, type ReciboCaja } from "../types/cobros.types";

type Seccion = "Por cobrar" | "Recibos de caja" | "Ingresos sin factura" | "Anticipos y cruces";

const SECCIONES: Array<[Seccion, typeof FileText]> = [
  ["Por cobrar", HandCoins],
  ["Recibos de caja", FileText],
  ["Ingresos sin factura", PiggyBank],
  ["Anticipos y cruces", ArrowLeftRight],
];

/**
 * Ingresos → Cobros: lo que deben los clientes y cada peso que entra, con su
 * recibo de caja.
 *
 * «Por cobrar» es la cartera por cliente, lo más vencido primero; «Recibos de
 * caja», lo que ya entró; «Ingresos sin factura», lo que entra por concepto
 * (intereses, reintegros, aportes); «Anticipos y cruces», la plata que el
 * cliente dejó adelantada o a favor, aplicada a lo que debe.
 */
export function CobrosView() {
  const puedeCobrar = useTieneRol("CAJA", "DIRECTOR");
  const [seccion, setSeccion] = useState<Seccion>("Por cobrar");
  const [recibo, setRecibo] = useState<{ cliente: ClienteInicial | null } | null>(null);
  const [ingreso, setIngreso] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Ingresos
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Cobros<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lo que te deben los clientes y cada peso que entra, con su recibo de caja.
          </p>
        </div>
        {puedeCobrar &&
          (seccion === "Ingresos sin factura" ? (
            <BotonNuevo etiqueta="Nuevo ingreso sin factura" onClick={() => setIngreso(true)} />
          ) : (
            <BotonNuevo etiqueta="Nuevo recibo de caja" onClick={() => setRecibo({ cliente: null })} />
          ))}
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

      {seccion === "Por cobrar" && (
        <PorCobrar onCobrar={puedeCobrar ? (cliente) => setRecibo({ cliente }) : undefined} />
      )}
      {seccion === "Recibos de caja" && <Recibos puedeAnular={puedeCobrar} />}
      {seccion === "Ingresos sin factura" && (
        <ListaMovimientosConcepto direccion="ENTRADA" puedeAnular={puedeCobrar} />
      )}
      {seccion === "Anticipos y cruces" && <AnticiposYCruces puedeCruzar={puedeCobrar} />}

      <MovimientoConceptoDialog abierto={ingreso} direccion="ENTRADA" onCerrar={() => setIngreso(false)} />

      <ReciboCajaDialog
        abierto={recibo !== null}
        cliente={recibo?.cliente}
        onCerrar={() => setRecibo(null)}
      />
    </div>
  );
}

function PorCobrar({ onCobrar }: { onCobrar?: (cliente: ClienteInicial) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const { data: cartera, isError, error, refetch } = useQuery({
    queryKey: ["cartera", "por-cobrar"],
    queryFn: cobrosApi.porCobrar,
    meta: SILENCIOSO,
  });

  if (cartera === undefined) {
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudo leer lo que te deben" onReintentar={refetch} />
    ) : (
      <SkeletonTable />
    );
  }

  const q = busqueda.trim().toLowerCase();
  const clientes =
    q === ""
      ? cartera.clientes
      : cartera.clientes.filter(
          (c) => c.nombre.toLowerCase().includes(q) || c.identificacion.toLowerCase().includes(q),
        );

  return (
    <>
      <section className="mb-7 rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-5 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Te deben</p>
            <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">
              {formatCOP(cartera.total)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {cartera.facturas} {cartera.facturas === 1 ? "factura" : "facturas"} · {cartera.clientes.length}{" "}
            {cartera.clientes.length === 1 ? "cliente" : "clientes"}
          </p>
        </div>
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {EDADES.map((e) => (
            <div key={e} className="bg-card px-6 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {e !== "POR_VENCER" && <span className="size-2 rounded-full bg-warning" />}
                {NOMBRE_EDAD[e].titulo}
              </p>
              <p className="text-xs text-muted-foreground">{NOMBRE_EDAD[e].detalle}</p>
              <p className="mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">
                {formatCOP(cartera.edades[e])}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o NIT"
          aria-label="Buscar cliente"
          className="h-11 rounded-xl pl-10"
        />
      </div>

      {clientes.length === 0 ? (
        <EmptyState
          titulo={q ? "Nada coincide con esa búsqueda" : "Nadie te debe"}
          descripcion={
            q
              ? `Ningún cliente con saldo tiene «${busqueda.trim()}» en el nombre o el NIT.`
              : "Cuando emitás una factura a crédito, aparece acá con su vencimiento."
          }
          icon={q ? SearchX : HandCoins}
          accion={q ? undefined : { label: "Nueva factura de venta", href: "/dashboard/ventas" }}
          accionSecundaria={q ? { label: "Limpiar búsqueda", onClick: () => setBusqueda("") } : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3 text-right">Por vencer</th>
                <th className="px-5 py-3 text-right">Vencido</th>
                <th className="px-5 py-3 text-right">Total</th>
                {onCobrar && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.terceroId} className="border-t border-border">
                  <td className="px-5 py-3">
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {c.identificacion} · {c.facturas} {c.facturas === 1 ? "factura" : "facturas"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right font-mono whitespace-nowrap tabular-nums">
                    {c.porVencer > 0 ? formatCOP(c.porVencer) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.vencido > 0 ? (
                      <>
                        <p className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(c.vencido)}</p>
                        <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
                          {c.maxDiasVencidos} {c.maxDiasVencidos === 1 ? "día" : "días"}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                    {formatCOP(c.total)}
                  </td>
                  {onCobrar && (
                    <td className="px-5 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg px-4"
                        onClick={() => onCobrar({ id: c.terceroId, nombre: c.nombre })}
                      >
                        Cobrar
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Recibos({ puedeAnular }: { puedeAnular: boolean }) {
  const [anulando, setAnulando] = useState<ReciboCaja | null>(null);
  const consulta = useQuery({
    queryKey: ["recibos-caja"],
    queryFn: cobrosApi.recibos,
    meta: SILENCIOSO,
  });
  const recibos = consulta.data;

  if (recibos === undefined) {
    return consulta.isError ? (
      <ErrorCarga error={consulta.error} titulo="No se pudieron leer los recibos" onReintentar={consulta.refetch} />
    ) : (
      <SkeletonTable />
    );
  }
  if (recibos.length === 0) {
    return (
      <EmptyState
        titulo="Sin recibos todavía"
        descripcion="Cada cobro que registres queda acá con su número. Se cobra desde Por cobrar o desde la factura."
        icon={ReceiptText}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Recibo</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Entró a</th>
              <th className="px-5 py-3">Facturas</th>
              <th className="px-5 py-3 text-right">Total</th>
              {puedeAnular && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {recibos.map((r) => (
              <tr key={r.id} className={`border-t border-border ${r.estado === "ANULADO" ? "text-muted-foreground" : ""}`}>
                <td className="px-5 py-3 font-mono font-semibold">
                  {r.numero}
                  {r.estado === "ANULADO" && (
                    <span
                      title={r.motivoAnulacion ?? undefined}
                      className="ml-2 rounded-full border border-border px-2 py-0.5 font-sans text-[11px] font-medium"
                    >
                      Anulado
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 whitespace-nowrap">{r.fecha}</td>
                <td className="px-5 py-3">{r.terceroNombre}</td>
                <td className="px-5 py-3">{r.destino}</td>
                <td className="px-5 py-3 font-mono text-xs">
                  {r.aplicaciones.map((a) => a.factura).join(", ")}
                  {r.anticipo > 0 && <span className="block font-sans">+ anticipo {formatCOP(r.anticipo)}</span>}
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(r.total)}
                  {r.comision > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      comisión {formatCOP(r.comision)}
                    </span>
                  )}
                </td>
                {puedeAnular && (
                  <td className="px-5 py-3 text-right">
                    {r.estado === "VIGENTE" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg px-3"
                        onClick={() => setAnulando(r)}
                      >
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
      <DialogoAnular recibo={anulando} onCerrar={() => setAnulando(null)} />
    </>
  );
}

/**
 * Anular devuelve cada cobro del recibo por la devolución de siempre: la
 * plata sale del mismo medio y las facturas vuelven a deber lo abonado.
 */
function DialogoAnular({ recibo, onCerrar }: { recibo: ReciboCaja | null; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const anular = useMutation({
    mutationFn: () => cobrosApi.anularRecibo(recibo!.id, motivo.trim()),
    onSuccess: async (r) => {
      await Promise.all(
        [["cartera"], ["recibos-caja"], ["facturas"], ["cajas"], ["cuentas-bancarias"], ["cruces-cartera"]].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito(`Recibo ${r.numero} anulado`);
      setMotivo("");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open={recibo !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Anular {recibo?.numero}</DialogTitle>
            <DialogDescription>
              Sale {formatCOP((recibo?.total ?? 0) - (recibo?.comision ?? 0))} de {recibo?.destino} y las
              facturas vuelven a deber lo que se les abonó y descontó. Si el anticipo ya se cruzó, primero
              anulá el cruce. El recibo queda en el historial.
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
            Anular recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
