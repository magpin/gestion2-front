"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CalendarClock, FileText, HandCoins, ListFilter, Loader2, Receipt, ReceiptText, Search, Wallet } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { EmptyState } from "@/components/shared/EmptyState";
import { funcionActiva } from "@/core/config/funciones";
import { DeclaracionesPorPagar } from "@/modules/impuestos/components/DeclaracionesPorPagar";
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
import { Textarea } from "@/components/ui/textarea";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP, hoyEnColombia } from "@/lib/utils";
import { BotonImprimir } from "@/components/shared/BotonImprimir";
import { NavegadorMes } from "@/components/shared/NavegadorMes";
import { Input } from "@/components/ui/input";
import { nombreMes } from "@/modules/gastos/lib/mes";
import { fechaCorta } from "@/modules/impuestos/lib/impuestos";
import { ResumenPorMedio } from "@/modules/tesoreria/components/ResumenPorMedio";
import { ListaMovimientosConcepto } from "@/modules/tesoreria/components/ListaMovimientosConcepto";
import { MovimientoConceptoDialog } from "@/modules/tesoreria/components/MovimientoConceptoDialog";
import { AnticiposGlobales, PROVEEDORES } from "@/modules/tesoreria/components/AnticiposGlobales";
import { ListaCruces } from "../components/AnticiposProveedor";
import { ComprobanteEgresoDialog, type ProveedorInicial } from "../components/ComprobanteEgresoDialog";
import { PagosProgramados } from "../components/PagosProgramados";
import { pagosApi } from "../services/pagos.service";
import { NOMBRE_TIPO_EGRESO, NOMBRE_TRAMO, TRAMOS, type ComprobanteEgreso, type TipoEgreso, type TramoPago } from "../types/pagos.types";

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

      {/* En el móvil las pestañas se desplazan de lado: partidas en dos líneas no se leen. */}
      <nav className="mb-7 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm md:flex-wrap">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex shrink-0 items-center whitespace-nowrap md:flex-1 justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
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
      {seccion === "Anticipos" && (
        <div className="flex flex-col gap-7">
          <AnticiposGlobales lado={PROVEEDORES} puedeMover={puedePagar} />
          <ListaCruces puedeAnular={puedePagar} />
        </div>
      )}

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
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["pagos", "por-pagar"],
    queryFn: pagosApi.porPagar,
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudo leer lo que falta pagar" onReintentar={refetch} />
    ) : (
      <SkeletonTable />
    );
  }

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

      {funcionActiva("impuestos") && (
        <div className="mb-7">
          <DeclaracionesPorPagar />
        </div>
      )}
      {proveedores.length === 0 ? (
        <EmptyState
          titulo={tramo ? "Nada en este tramo" : "No le debés a ningún proveedor"}
          descripcion={
            tramo
              ? "Ninguna compra pendiente vence en ese tramo."
              : "Cuando registrés una compra a crédito, aparece acá con su vencimiento."
          }
          icon={tramo ? ListFilter : HandCoins}
          accion={tramo ? undefined : { label: "Registrar compra", href: "/dashboard/compras" }}
          accionSecundaria={tramo ? { label: "Ver todo", onClick: () => setTramo(null) } : undefined}
        />
      ) : (
        <>
        {/* En el móvil (pantalla 67), una tarjeta por factura, en el orden en
            que vencen. En pantallas grandes, la tabla por proveedor. */}
        <ul className="flex flex-col gap-3 md:hidden">
          {proveedores
            .flatMap((p) => p.compras.map((c) => ({ ...c, proveedor: p })))
            .sort((x, y) => x.venceEfectivo.localeCompare(y.venceEfectivo))
            .map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card px-4 py-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.proveedor.nombre}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={
                        c.tramo === "VENCIDO"
                          ? "rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 font-medium text-foreground"
                          : undefined
                      }
                    >
                      {c.tramo === "VENCIDO" ? "Venció" : "Vence"} {c.venceEfectivo}
                    </span>
                    {c.descuentoSugerido > 0 && (
                      <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-medium text-foreground">
                        Pronto pago hasta el {c.descuentoHasta}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.numero}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(c.pendiente)}</span>
                  {onPagar && (
                    <Button
                      type="button"
                      variant={c.tramo === "VENCIDO" ? "default" : "outline"}
                      className="h-9 rounded-lg px-4"
                      onClick={() => onPagar({ id: c.proveedor.terceroId, nombre: c.proveedor.nombre })}
                    >
                      Pagar
                    </Button>
                  )}
                </div>
              </li>
            ))}
        </ul>
        <div className="hidden flex-col gap-4 md:flex">
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
        </>
      )}
    </>
  );
}

const TIPOS: Array<TipoEgreso | null> = [null, "PROVEEDOR", "SIN_FACTURA", "NO_GASTO", "IMPUESTO"];

const TONO_TIPO: Record<TipoEgreso, string> = {
  PROVEEDOR: "border-border bg-muted",
  SIN_FACTURA: "border-warning/30 bg-warning/15",
  NO_GASTO: "border-info/30 bg-info/15",
  IMPUESTO: "border-info/30 bg-info/10",
};

/**
 * Todo lo que salió en el mes (PC12): los comprobantes de egreso a
 * proveedores, lo que se pagó por concepto y las declaraciones, con el
 * resumen por caja y cuenta y un filtro por tipo.
 */
function Comprobantes({ puedeAnular }: { puedeAnular: boolean }) {
  const mesHoy = hoyEnColombia().slice(0, 7);
  const [mes, setMes] = useState(mesHoy);
  const [medio, setMedio] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoEgreso | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [anulando, setAnulando] = useState<Anulable | null>(null);
  const consulta = useQuery({
    queryKey: ["pagos", "egresos", mes],
    queryFn: () => pagosApi.egresos(mes),
    meta: SILENCIOSO,
  });
  const data = consulta.data;

  if (data === undefined) {
    return consulta.isError ? (
      <ErrorCarga error={consulta.error} titulo="No se pudieron leer los comprobantes" onReintentar={consulta.refetch} />
    ) : (
      <SkeletonTable />
    );
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = data.egresos.filter(
    (e) =>
      (medio === null || e.medioId === medio) &&
      (tipo === null || e.tipo === tipo) &&
      (q === "" ||
        e.numero.toLowerCase().includes(q) ||
        (e.tercero ?? "").toLowerCase().includes(q) ||
        e.detalle.toLowerCase().includes(q)),
  );
  const r = data.resumen;
  const mesTexto = nombreMes(mes).split(" ")[0].toLowerCase();
  const conGmf = data.egresos.some((e) => e.gmf > 0);

  return (
    <>
      <ResumenPorMedio
        titulo={`Salió en ${mesTexto}`}
        pie={`${r.cantidad} ${r.cantidad === 1 ? "egreso" : "egresos"}${conGmf ? " · incluye el 4×1000" : ""}`}
        resumen={r}
        medio={medio}
        onMedio={setMedio}
        palabra={["egreso", "egresos"]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tercero, comprobante o factura"
            aria-label="Buscar egreso"
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <NavegadorMes
          mes={mes}
          maximo={mesHoy}
          onMes={(m) => {
            setMes(m);
            setMedio(null);
          }}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Tipo de egreso">
        {TIPOS.map((t) => (
          <button
            key={t ?? "todos"}
            type="button"
            aria-pressed={tipo === t}
            onClick={() => setTipo(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              tipo === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
            }`}
          >
            {t === null ? "Todos" : NOMBRE_TIPO_EGRESO[t]}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          titulo={data.egresos.length === 0 ? `Nada salió en ${mesTexto}` : "Nada coincide"}
          descripcion={
            data.egresos.length === 0
              ? "Cada pago que registres queda acá con su número: a proveedores, sin factura y de impuestos."
              : "Ningún egreso del mes coincide con la búsqueda, el tipo o el medio elegido."
          }
          icon={data.egresos.length === 0 ? ReceiptText : ListFilter}
          accionSecundaria={
            data.egresos.length === 0
              ? undefined
              : {
                  label: "Ver todos",
                  onClick: () => {
                    setBusqueda("");
                    setMedio(null);
                    setTipo(null);
                  },
                }
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3">Comprobante</th>
                <th className="px-5 py-3">Pagado a</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Salió de</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => {
                const anulado = e.estado === "ANULADO";
                return (
                  <tr key={`${e.origen}-${e.id}`} className={`border-t border-border ${anulado ? "text-muted-foreground" : ""}`}>
                    <td className="px-5 py-3">
                      <p className={`font-mono font-semibold ${anulado ? "line-through" : ""}`}>{e.numero}</p>
                      <p className="text-xs text-muted-foreground">{fechaCorta(e.fecha)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium">{e.tercero ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{e.detalle}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONO_TIPO[e.tipo]}`}>
                        {anulado ? "Anulado" : NOMBRE_TIPO_EGRESO[e.tipo]}
                      </span>
                    </td>
                    <td className="px-5 py-3">{e.destino}</td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums ${anulado ? "line-through" : ""}`}>
                      {formatCOP(e.valor)}
                      {e.gmf > 0 && <span className="block text-xs font-normal text-muted-foreground">+ 4×1000 {formatCOP(e.gmf)}</span>}
                    </td>
                    <td className="px-5 py-3">
                      {/* Los de proveedores se anulan con su comprobante; los sin factura, en su pestaña; los impuestos no se anulan. */}
                      {e.origen === "COMPROBANTE" && (
                        <div className="flex justify-end gap-2">
                          {puedeAnular && !anulado && (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-lg px-3"
                              onClick={() => setAnulando({ id: e.id, numero: e.numero, destino: e.destino })}
                            >
                              Anular
                            </Button>
                          )}
                          <BotonImprimir ruta={`/documentos/comprobantes-egreso/${e.id}/pdf`} nombre={e.numero} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <DialogoAnular comprobante={anulando} onCerrar={() => setAnulando(null)} />
    </>
  );
}

type Anulable = Pick<ComprobanteEgreso, "id" | "numero" | "destino">;

/**
 * Anular devuelve cada pago por la devolución de siempre: la plata vuelve al
 * mismo medio, las compras vuelven a deber y la retención del anticipo se
 * reversa. Si el anticipo ya se cruzó, primero se anula el cruce.
 */
function DialogoAnular({ comprobante, onCerrar }: { comprobante: Anulable | null; onCerrar: () => void }) {
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
