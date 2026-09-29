"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, FileText, HandCoins, Loader2, PiggyBank, ReceiptText, Search, SearchX, Wallet } from "lucide-react";

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
import { formatCOP, hoyEnColombia } from "@/lib/utils";
import { BotonImprimir } from "@/components/shared/BotonImprimir";
import { NavegadorMes } from "@/components/shared/NavegadorMes";
import { nombreMes } from "@/modules/gastos/lib/mes";
import { fechaCorta } from "@/modules/impuestos/lib/impuestos";
import { ResumenPorMedio } from "@/modules/tesoreria/components/ResumenPorMedio";
import { ListaMovimientosConcepto } from "@/modules/tesoreria/components/ListaMovimientosConcepto";
import { MovimientoConceptoDialog } from "@/modules/tesoreria/components/MovimientoConceptoDialog";
import { AnticiposGlobales, CLIENTES, SALDOS_A_FAVOR } from "@/modules/tesoreria/components/AnticiposGlobales";
import { ListaCruces } from "../components/AnticiposYCruces";
import { ReciboCajaDialog, type ClienteInicial } from "../components/ReciboCajaDialog";
import { cobrosApi } from "../services/cobros.service";
import { EDADES, NOMBRE_EDAD, type ReciboCaja } from "../types/cobros.types";

type Seccion = "Por cobrar" | "Recibos de caja" | "Ingresos sin factura" | "Anticipos" | "Saldos a favor";

const SECCIONES: Array<[Seccion, typeof FileText]> = [
  ["Por cobrar", HandCoins],
  ["Recibos de caja", FileText],
  ["Ingresos sin factura", PiggyBank],
  ["Anticipos", Wallet],
  ["Saldos a favor", ArrowLeftRight],
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
    <div className="w-full">
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
        {/* El botón dice lo que se hace en cada pestaña. En Saldos a favor no
            hay nada que crear: el saldo lo deja una nota crédito. */}
        {puedeCobrar &&
          seccion !== "Saldos a favor" &&
          (seccion === "Ingresos sin factura" ? (
            <BotonNuevo etiqueta="Nuevo ingreso sin factura" onClick={() => setIngreso(true)} />
          ) : (
            <BotonNuevo
              etiqueta={seccion === "Anticipos" ? "Recibir anticipo" : "Nuevo recibo de caja"}
              onClick={() => setRecibo({ cliente: null })}
            />
          ))}
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
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
      {seccion === "Anticipos" && (
        <div className="flex flex-col gap-7">
          <AnticiposGlobales lado={CLIENTES} puedeMover={puedeCobrar} />
          <ListaCruces puedeAnular={puedeCobrar} />
        </div>
      )}
      {seccion === "Saldos a favor" && <AnticiposGlobales lado={SALDOS_A_FAVOR} puedeMover={puedeCobrar} />}

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
  const mesHoy = hoyEnColombia().slice(0, 7);
  const [mes, setMes] = useState(mesHoy);
  const [medio, setMedio] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [anulando, setAnulando] = useState<ReciboCaja | null>(null);
  const consulta = useQuery({
    queryKey: ["recibos-caja", mes],
    queryFn: () => cobrosApi.recibos(mes),
    meta: SILENCIOSO,
  });
  const resumen = useQuery({
    queryKey: ["recibos-caja", "resumen", mes],
    queryFn: () => cobrosApi.resumenRecibos(mes),
    meta: SILENCIOSO,
  });
  const recibos = consulta.data;

  if (recibos === undefined || resumen.data === undefined) {
    return consulta.isError || resumen.isError ? (
      <ErrorCarga
        error={consulta.error ?? resumen.error}
        titulo="No se pudieron leer los recibos"
        onReintentar={() => {
          void consulta.refetch();
          void resumen.refetch();
        }}
      />
    ) : (
      <SkeletonTable />
    );
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = recibos.filter(
    (r) =>
      (medio === null || r.cajaId === medio || r.cuentaBancariaId === medio) &&
      (q === "" ||
        r.numero.toLowerCase().includes(q) ||
        r.terceroNombre.toLowerCase().includes(q) ||
        r.aplicaciones.some((a) => a.factura.toLowerCase().includes(q))),
  );
  const r = resumen.data;
  const mesTexto = nombreMes(mes).split(" ")[0].toLowerCase();

  return (
    <>
      <ResumenPorMedio
        titulo={`Cobrado en ${mesTexto}`}
        pie={`${r.cantidad} ${r.cantidad === 1 ? "recibo" : "recibos"}${r.anulados > 0 ? ` · ${r.anulados} ${r.anulados === 1 ? "anulado" : "anulados"}` : ""}`}
        resumen={r}
        medio={medio}
        onMedio={setMedio}
        palabra={["recibo", "recibos"]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, recibo o factura"
            aria-label="Buscar recibo"
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

      {visibles.length === 0 ? (
        <EmptyState
          titulo={recibos.length === 0 ? `Sin recibos en ${mesTexto}` : "Nada coincide"}
          descripcion={
            recibos.length === 0
              ? "Cada cobro que registres queda acá con su número. Se cobra desde Por cobrar o desde la factura."
              : "Ningún recibo del mes coincide con la búsqueda o con el medio elegido."
          }
          icon={recibos.length === 0 ? ReceiptText : SearchX}
          accionSecundaria={
            recibos.length === 0
              ? undefined
              : {
                  label: "Ver todos",
                  onClick: () => {
                    setBusqueda("");
                    setMedio(null);
                  },
                }
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{visibles.length}</span> de {recibos.length}{" "}
            {recibos.length === 1 ? "recibo" : "recibos"} · los más recientes primero
          </p>
          <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-3">Recibo</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Aplicado a</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((x) => {
                  const anulado = x.estado === "ANULADO";
                  return (
                    <tr key={x.id} className={`border-t border-border ${anulado ? "text-muted-foreground" : ""}`}>
                      <td className="px-5 py-3">
                        <p className={`font-mono font-semibold ${anulado ? "line-through" : ""}`}>{x.numero}</p>
                        <p className="text-xs text-muted-foreground">
                          {fechaCorta(x.fecha)} · {x.destino}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-medium">{x.terceroNombre}</td>
                      <td className="px-5 py-3">
                        {anulado ? (
                          <Chip tono="neutro" title={x.motivoAnulacion ?? undefined}>
                            Anulado{x.motivoAnulacion ? ` · ${x.motivoAnulacion}` : ""}
                          </Chip>
                        ) : (
                          <span className="flex flex-wrap gap-1.5">
                            {x.aplicaciones.length > 0 && (
                              <Chip tono="exito">{x.aplicaciones.map((a) => a.factura).join(" y ")}</Chip>
                            )}
                            {x.anticipo > 0 && <Chip tono="info">Anticipo · {formatCOP(x.anticipo)}</Chip>}
                          </span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums ${anulado ? "line-through" : ""}`}>
                        {formatCOP(x.total)}
                        {x.comision > 0 && (
                          <span className="block text-xs font-normal text-muted-foreground">comisión {formatCOP(x.comision)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {puedeAnular && !anulado && (
                            <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={() => setAnulando(x)}>
                              Anular
                            </Button>
                          )}
                          <BotonImprimir ruta={`/documentos/recibos-caja/${x.id}/pdf`} nombre={x.numero} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <DialogoAnular recibo={anulando} onCerrar={() => setAnulando(null)} />
    </>
  );
}

const TONOS = {
  exito: "border-success/30 bg-success/15",
  info: "border-info/30 bg-info/15",
  neutro: "border-border bg-muted",
} as const;

function Chip({ tono, title, children }: { tono: keyof typeof TONOS; title?: string; children: React.ReactNode }) {
  return (
    <span title={title} className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONOS[tono]}`}>
      {children}
    </span>
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
