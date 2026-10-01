"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CalendarClock, FileText, ListFilter, Loader2, Receipt, ReceiptText, Search, Wallet } from "lucide-react";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { CabeceraPagina } from "@/components/shared/CabeceraPagina";
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
import { PorPagarLista } from "../components/PorPagarLista";
import { pagosApi } from "../services/pagos.service";
import { NOMBRE_TIPO_EGRESO, type ComprobanteEgreso, type TipoEgreso } from "../types/pagos.types";

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
        <BotonNuevo
          etiqueta={seccion === "Anticipos" ? "Dar un anticipo" : "Nuevo comprobante de egreso"}
          onClick={() => setComprobante({ proveedor: null })}
        />
      )
    );

  return (
    <div className="w-full">
      <CabeceraPagina
        ruta={[{ etiqueta: "Egresos" }, { etiqueta: "Pagos" }]}
        cuando={format(parseISO(hoyEnColombia()), "EEEE d MMM", { locale: es }).replace(".", "")}
        titulo="Pagos"
        subtitulo="Lo que le debe a proveedores, a la DIAN y al municipio, en una sola lista."
        derecha={boton}
      />

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
        <PorPagarLista onPagar={puedePagar ? (proveedor) => setComprobante({ proveedor }) : undefined} />
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
              ? "Cada pago que registre queda aquí con su número: a proveedores, sin factura y de impuestos."
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
              Vuelve el dinero a {comprobante?.destino}, las compras vuelven a deber lo pagado y descontado y se
              reversa la retención del anticipo. Si el anticipo ya se cruzó, primero anule el cruce.
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
