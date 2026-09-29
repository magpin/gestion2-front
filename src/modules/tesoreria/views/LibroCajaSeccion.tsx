"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Undo2 } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { Textarea } from "@/components/ui/textarea";
import { formatCOP, formatFecha, hoyEnColombia } from "@/lib/utils";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import {
  FormularioMovimientoCaja,
  type DatosMovimientoCaja,
} from "../components/FormularioMovimientoCaja";
import { SelectorCaja } from "../components/SelectorCaja";
import { movimientosCajaApi } from "../services/tesoreria.service";
import { NOMBRE_MOVIMIENTO_CAJA } from "../types/tesoreria.types";
import type {
  CajaResumen,
  MovimientoCajaResumen,
  TipoMovimientoCaja,
} from "../types/tesoreria.types";

const ID_FORMULARIO = "formulario-movimiento-caja";

/**
 * El libro de una caja. Requiere elegir una caja primero — cada movimiento
 * vive bajo `/cajas/:id/movimientos`, no hay listado global.
 *
 * Sin movimientos todavía, la única acción posible es cargar el saldo
 * inicial (no genera asiento). Con movimientos, se registra ingreso o
 * egreso — el tipo lo elige el `Select` de al lado del botón, mismo
 * patrón que `KardexSeccion`.
 */
export function LibroCajaSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CAJA", "DIRECTOR");
  // Reversar es corregir, no operar la caja: mismo criterio que anular una factura.
  const puedeReversar = useTieneRol("DIRECTOR", "CONTADOR");
  const [porReversar, setPorReversar] = useState<MovimientoCajaResumen | null>(null);
  const [motivo, setMotivo] = useState("");

  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [tipo, setTipo] = useState<Exclude<TipoMovimientoCaja, "SALDO_INICIAL">>("INGRESO");
  const [contraCuenta, setContraCuenta] = useState<CuentaEmpresa | null>(null);
  const [abierto, setAbierto] = useState(false);

  const clave = ["cajas", "movimientos", caja?.id];
  const { data: movimientos, isError, error, refetch } = useQuery({
    queryKey: clave,
    queryFn: () => movimientosCajaApi.listar(caja!.id),
    enabled: caja !== null,
    meta: SILENCIOSO,
  });

  // Cuánto entró y cuánto salió en el libro ENTERO. No se suma la página: el
  // libro viene paginado y sumar cincuenta renglones para titularlo "entradas"
  // sería mentir.
  const { data: resumen } = useQuery({
    queryKey: [...clave, "resumen"],
    queryFn: () => movimientosCajaApi.resumen(caja!.id),
    enabled: caja !== null,
  });

  const hayMovimientos = (movimientos?.datos.length ?? 0) > 0;
  const tipoFormulario: TipoMovimientoCaja = hayMovimientos ? tipo : "SALDO_INICIAL";
  const saldoActual = movimientos?.datos[0]?.saldo_valor ?? null;

  const registrar = useMutation({
    mutationFn: (d: DatosMovimientoCaja) => {
      const id = caja!.id;
      if (tipoFormulario === "SALDO_INICIAL") {
        return movimientosCajaApi.saldoInicial(id, {
          fecha: d.fecha,
          valor: d.valor,
          concepto: d.concepto,
        });
      }
      const datos = { fecha: d.fecha, valor: d.valor, concepto: d.concepto, contraCuentaId: d.contraCuentaId! };
      return tipoFormulario === "INGRESO"
        ? movimientosCajaApi.ingreso(id, datos)
        : movimientosCajaApi.egreso(id, datos);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clave });
      aviso.exito("Movimiento registrado");
      setAbierto(false);
      setContraCuenta(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const reversar = useMutation({
    mutationFn: (m: MovimientoCajaResumen) =>
      movimientosCajaApi.reversar(caja!.id, m.id, { fecha: hoyEnColombia(), motivo: motivo.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clave });
      aviso.exito("Movimiento reversado");
      setPorReversar(null);
      setMotivo("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  /**
   * Lo mismo que rechaza el backend, para no ofrecer un botón que va a fallar:
   * los cobros y pagos se corrigen desde su documento, el ajuste de un arqueo
   * con otro arqueo, y una reversa no se reversa.
   */
  const sePuedeReversar = (m: MovimientoCajaResumen) =>
    puedeReversar &&
    m.tipo !== "SALDO_INICIAL" &&
    m.origen_tipo === null &&
    m.reversa_de === null &&
    m.reversado_por === null &&
    !m.es_ajuste_arqueo;

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Caja</span>
          <SelectorCaja valor={caja} onElegir={setCaja} />
        </div>

        {hayMovimientos && (
          <label className="flex min-h-12 min-w-[170px] flex-col justify-center rounded-2xl border border-border bg-card px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Tipo</span>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-sm font-semibold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INGRESO">Ingreso</SelectItem>
                <SelectItem value="EGRESO">Egreso</SelectItem>
              </SelectContent>
            </Select>
          </label>
        )}

        <Button
          type="button"
          // Sin el libro leído no se sabe si toca saldo inicial o movimiento.
          disabled={!caja || !puedeOperar || movimientos === undefined}
          onClick={() => setAbierto(true)}
          className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
        >
          {hayMovimientos ? "Registrar movimiento" : "Cargar saldo inicial"}
        </Button>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Libro de caja</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un movimiento no se edita ni se borra: se corrige reversándolo, con su motivo.
          </p>
        </div>

        {!caja ? (
          <EmptyState
            sinMarco
            icon={History}
            titulo="Elegí una caja para ver su libro"
            descripcion="Arriba, en «Caja»: acá aparece cada peso que entró y salió de ella, con su saldo."
          />
        ) : movimientos === undefined ? (
          isError ? (
            <ErrorCarga sinMarco error={error} titulo="No se pudo leer el libro de esta caja" onReintentar={refetch} />
          ) : (
            <div className="flex justify-center py-24 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )
        ) : movimientos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Fecha", "Movimiento", "Concepto", "Entrada", "Salida", "Saldo", ""].map(
                    (x) => (
                      <th
                        key={x}
                        scope="col"
                        className={`px-5 py-4 ${
                          x === "Entrada" || x === "Salida" || x === "Saldo"
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {x}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimientos.datos.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-5 text-sm text-muted-foreground">{formatFecha(m.fecha)}</td>
                    <td className="px-5 py-5">
                      <span className="rounded-full border border-border px-3 py-1.5 text-xs">{NOMBRE_MOVIMIENTO_CAJA[m.tipo]}</span>
                    </td>
                    <td className="px-5 py-5 text-sm">
                      {m.concepto}
                      {/* El rastro de la corrección, en el renglón: sin esto el libro
                          muestra dos movimientos que se anulan y nadie sabe por qué. */}
                      {m.reversado_por !== null && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          Reversado
                        </span>
                      )}
                      {m.motivo_reversa !== null && (
                        <span className="mt-1 block text-xs text-muted-foreground">Motivo: {m.motivo_reversa}</span>
                      )}
                    </td>
                    {/* El saldo inicial no va en ninguna de las dos columnas:
                        no es plata que entró, es de dónde arrancó la caja. Si
                        fuera a "Entrada", la columna dejaría de sumar lo mismo
                        que el total del pie. */}
                    <td className="px-5 py-5 text-right font-mono font-semibold text-success">
                      {m.tipo === "INGRESO" ? formatCOP(Number(m.valor)) : ""}
                    </td>
                    <td className="px-5 py-5 text-right font-mono font-semibold text-danger">
                      {m.tipo === "EGRESO" ? formatCOP(Number(m.valor)) : ""}
                    </td>
                    <td className="px-5 py-5 text-right font-mono font-semibold">{formatCOP(Number(m.saldo_valor))}</td>
                    <td className="px-3 py-5 text-right">
                      {sePuedeReversar(m) && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 rounded-xl px-3 text-muted-foreground"
                          onClick={() => setPorReversar(m)}
                        >
                          <Undo2 className="size-4" />
                          Reversar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {resumen !== undefined && (
                <tfoot className="border-t-2 border-border bg-muted/40">
                  <tr>
                    <td colSpan={3} className="px-5 py-4 text-sm font-semibold">
                      Todo el libro
                      <span className="ml-2 font-normal text-muted-foreground">
                        · arrancó con {formatCOP(Number(resumen.saldo_inicial))}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-success">
                      {formatCOP(Number(resumen.entradas))}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-danger">
                      {formatCOP(Number(resumen.salidas))}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold">
                      {formatCOP(Number(resumen.saldo))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <EmptyState
            sinMarco
            icon={History}
            titulo="Esta caja todavía no tiene movimientos"
            descripcion="Cargá la plata que tiene hoy como saldo inicial: desde ahí se suma cada entrada y se resta cada salida."
            accion={puedeOperar ? { label: "Cargar saldo inicial", onClick: () => setAbierto(true) } : undefined}
          />
        )}
      </section>

      <Dialog
        open={abierto}
        onOpenChange={(a) => {
          setAbierto(a);
          if (!a) setContraCuenta(null);
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>
                {tipoFormulario === "SALDO_INICIAL" ? "Cargar saldo inicial" : `Registrar ${NOMBRE_MOVIMIENTO_CAJA[tipoFormulario].toLowerCase()}`}
              </DialogTitle>
              <DialogDescription>
                {tipoFormulario === "SALDO_INICIAL"
                  ? "Solo una vez por caja: el saldo con el que arranca."
                  : "Cada movimiento queda fijo: no se edita ni se anula."}
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioMovimientoCaja
              id={ID_FORMULARIO}
              tipo={tipoFormulario}
              saldoActual={tipoFormulario !== "SALDO_INICIAL" ? saldoActual : null}
              contraCuenta={contraCuenta}
              onContraCuenta={setContraCuenta}
              alGuardar={(d) => registrar.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORMULARIO} className="h-12 rounded-xl px-6" disabled={registrar.isPending}>
              {registrar.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={porReversar !== null}
        onOpenChange={(a) => {
          if (!a) {
            setPorReversar(null);
            setMotivo("");
          }
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Reversar movimiento</DialogTitle>
              <DialogDescription>
                Se registra el movimiento contrario por{" "}
                <b className="font-mono">{formatCOP(Number(porReversar?.valor ?? 0))}</b>, con fecha de hoy y un
                asiento que invierte el original. Los dos quedan en el libro.
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3">
            <p className="rounded-2xl bg-muted p-4 text-sm">
              {porReversar && NOMBRE_MOVIMIENTO_CAJA[porReversar.tipo]} del {porReversar && formatFecha(porReversar.fecha)}:{" "}
              <span className="font-semibold">{porReversar?.concepto}</span>
            </p>
            <label htmlFor="motivo-reversa" className="text-sm font-semibold">
              ¿Por qué se reversa? *
            </label>
            <Textarea
              id="motivo-reversa"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Se cargó dos veces, el valor era otro…"
              className="min-h-20 rounded-xl px-4 py-3"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setPorReversar(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-12 rounded-xl px-6"
              disabled={motivo.trim().length < 3 || reversar.isPending}
              onClick={() => porReversar && reversar.mutate(porReversar)}
            >
              {reversar.isPending && <Loader2 className="size-4 animate-spin" />}
              Reversar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
