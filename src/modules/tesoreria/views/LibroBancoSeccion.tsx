"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";

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
import { formatCOP, formatFecha } from "@/lib/utils";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import {
  FormularioMovimientoBanco,
  type DatosMovimientoBanco,
} from "../components/FormularioMovimientoBanco";
import { SelectorCuentaBancaria } from "../components/SelectorCuentaBancaria";
import { movimientosBancoApi } from "../services/bancos.service";
import {
  NOMBRE_MOVIMIENTO_BANCO,
  TIPOS_MOVIMIENTO_BANCO_MANUAL,
} from "../types/bancos.types";
import type {
  CuentaBancariaResumen,
  TipoMovimientoBanco,
  TipoMovimientoBancoManual,
} from "../types/bancos.types";

const ID_FORMULARIO = "formulario-movimiento-banco";

/**
 * El libro de una cuenta bancaria. Requiere elegir una cuenta primero —
 * cada movimiento vive bajo `/cuentas-bancarias/:id/movimientos`, no hay
 * listado global.
 *
 * Sin movimientos todavía, la única acción posible es cargar el saldo
 * inicial (no genera asiento). Con movimientos, se registra cualquiera
 * de los 7 tipos manuales — mismo patrón que `LibroCajaSeccion`, sin el
 * aviso de saldo insuficiente: una cuenta bancaria puede sobregirarse.
 */
export function LibroBancoSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CAJA", "DIRECTOR");

  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [tipo, setTipo] = useState<TipoMovimientoBancoManual>("CONSIGNACION");
  const [contraCuenta, setContraCuenta] = useState<CuentaEmpresa | null>(null);
  const [abierto, setAbierto] = useState(false);

  const clave = ["cuentas-bancarias", "movimientos", cuenta?.id];
  const { data: movimientos, isError, error, refetch } = useQuery({
    queryKey: clave,
    queryFn: () => movimientosBancoApi.listar(cuenta!.id),
    enabled: cuenta !== null,
    meta: SILENCIOSO,
  });

  // El libro entero, no la página. Mismo criterio que en el de caja.
  const { data: resumen } = useQuery({
    queryKey: [...clave, "resumen"],
    queryFn: () => movimientosBancoApi.resumen(cuenta!.id),
    enabled: cuenta !== null,
  });

  const hayMovimientos = (movimientos?.datos.length ?? 0) > 0;
  const tipoFormulario: TipoMovimientoBanco = hayMovimientos ? tipo : "SALDO_INICIAL";
  const saldoActual = movimientos?.datos[0]?.saldo_valor ?? null;

  const registrar = useMutation({
    mutationFn: (d: DatosMovimientoBanco) => {
      const id = cuenta!.id;
      if (tipoFormulario === "SALDO_INICIAL") {
        return movimientosBancoApi.saldoInicial(id, {
          fecha: d.fecha,
          valor: d.valor,
          concepto: d.concepto,
        });
      }
      return movimientosBancoApi.registrar(id, {
        tipo: tipoFormulario,
        fecha: d.fecha,
        valor: d.valor,
        concepto: d.concepto,
        contraCuentaId: d.contraCuentaId!,
        referencia: d.referencia || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clave });
      aviso.exito("Movimiento registrado");
      setAbierto(false);
      setContraCuenta(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Cuenta bancaria</span>
          <SelectorCuentaBancaria valor={cuenta} onElegir={setCuenta} />
        </div>

        {hayMovimientos && (
          <label className="flex min-h-12 min-w-[220px] flex-col justify-center rounded-2xl border border-border bg-card px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Tipo</span>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimientoBancoManual)}>
              <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-sm font-semibold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_MOVIMIENTO_BANCO_MANUAL.map((t) => (
                  <SelectItem key={t} value={t}>
                    {NOMBRE_MOVIMIENTO_BANCO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        <Button
          type="button"
          // Sin el libro leído no se sabe si toca saldo inicial o movimiento.
          disabled={!cuenta || !puedeOperar || movimientos === undefined}
          onClick={() => setAbierto(true)}
          className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
        >
          {hayMovimientos ? "Registrar movimiento" : "Cargar saldo inicial"}
        </Button>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Libro de bancos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un movimiento no se edita ni se anula: se corrige con el movimiento contrario.
          </p>
        </div>

        {!cuenta ? (
          <EmptyState
            sinMarco
            icon={History}
            titulo="Elija una cuenta bancaria para ver su libro"
            descripcion="Arriba, en «Cuenta bancaria»: aquí aparece cada consignación, retiro y transferencia, con su saldo."
          />
        ) : movimientos === undefined ? (
          isError ? (
            <ErrorCarga sinMarco error={error} titulo="No se pudo leer el libro de esta cuenta" onReintentar={refetch} />
          ) : (
            <div className="flex justify-center py-24 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )
        ) : movimientos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {[
                    "Fecha",
                    "Movimiento",
                    "Concepto",
                    "Entrada",
                    "Salida",
                    "Saldo",
                    "Conciliado",
                  ].map((x) => (
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
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimientos.datos.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-5 text-sm text-muted-foreground">{formatFecha(m.fecha)}</td>
                    <td className="px-5 py-5">
                      <span className="rounded-full border border-border px-3 py-1.5 text-xs">{NOMBRE_MOVIMIENTO_BANCO[m.tipo]}</span>
                    </td>
                    <td className="px-5 py-5 text-sm">{m.concepto}</td>
                    {/* En un banco la entrada son dos tipos y la salida otros
                        dos. El saldo inicial no va en ninguna: ver el libro de
                        caja, donde está escrito el porqué. */}
                    <td className="px-5 py-5 text-right font-mono font-semibold text-success">
                      {m.tipo === "CONSIGNACION" ||
                      m.tipo === "TRANSFERENCIA_ENTRANTE"
                        ? formatCOP(Number(m.valor))
                        : ""}
                    </td>
                    <td className="px-5 py-5 text-right font-mono font-semibold text-danger">
                      {m.tipo === "RETIRO" || m.tipo === "TRANSFERENCIA_SALIENTE"
                        ? formatCOP(Number(m.valor))
                        : ""}
                    </td>
                    <td className={`px-5 py-5 text-right font-mono font-semibold ${Number(m.saldo_valor) < 0 ? "text-danger" : ""}`}>
                      {formatCOP(Number(m.saldo_valor))}
                    </td>
                    <td className="px-5 py-5">
                      {m.conciliado ? (
                        <span className="text-xs font-semibold text-success">Sí</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
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
                    <td
                      className={`px-5 py-4 text-right font-mono font-bold ${
                        Number(resumen.saldo) < 0 ? "text-danger" : ""
                      }`}
                    >
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
            titulo="Esta cuenta todavía no tiene movimientos"
            descripcion="Cargue el saldo que dice el banco hoy como saldo inicial: desde ahí se suma y se resta cada movimiento."
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
                {tipoFormulario === "SALDO_INICIAL" ? "Cargar saldo inicial" : `Registrar ${NOMBRE_MOVIMIENTO_BANCO[tipoFormulario].toLowerCase()}`}
              </DialogTitle>
              <DialogDescription>
                {tipoFormulario === "SALDO_INICIAL"
                  ? "Solo una vez por cuenta: el saldo con el que arranca."
                  : "Cada movimiento queda fijo: no se edita ni se anula."}
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioMovimientoBanco
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
