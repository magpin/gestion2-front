"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";

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
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import {
  FormularioMovimientoCaja,
  type DatosMovimientoCaja,
} from "../components/FormularioMovimientoCaja";
import { SelectorCaja } from "../components/SelectorCaja";
import { movimientosCajaApi } from "../services/tesoreria.service";
import { NOMBRE_MOVIMIENTO_CAJA } from "../types/tesoreria.types";
import type { CajaResumen, TipoMovimientoCaja } from "../types/tesoreria.types";

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

  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [tipo, setTipo] = useState<Exclude<TipoMovimientoCaja, "SALDO_INICIAL">>("INGRESO");
  const [contraCuenta, setContraCuenta] = useState<CuentaEmpresa | null>(null);
  const [abierto, setAbierto] = useState(false);

  const clave = ["cajas", "movimientos", caja?.id];
  const { data: movimientos, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => movimientosCajaApi.listar(caja!.id),
    enabled: caja !== null,
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
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

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
          disabled={!caja || !puedeOperar}
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
            Un movimiento no se edita ni se anula: se corrige con el movimiento contrario.
          </p>
        </div>

        {!caja ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="font-semibold">Elegí una caja para ver su libro</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : movimientos && movimientos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Fecha", "Movimiento", "Concepto", "Entrada", "Salida", "Saldo"].map(
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
                    <td className="px-5 py-5 text-sm">{m.concepto}</td>
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
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="font-semibold">Esta caja todavía no tiene movimientos</p>
            <p className="max-w-md text-sm text-muted-foreground">Empezá con su saldo inicial.</p>
          </div>
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
    </>
  );
}
