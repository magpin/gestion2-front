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
  const { data: movimientos, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => movimientosBancoApi.listar(cuenta!.id),
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
      });
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
          disabled={!cuenta || !puedeOperar}
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
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="font-semibold">Elegí una cuenta bancaria para ver su libro</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : movimientos && movimientos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Fecha", "Movimiento", "Concepto", "Valor", "Saldo", "Conciliado"].map((x) => (
                    <th key={x} scope="col" className="px-5 py-4">
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
                    <td className="px-5 py-5 font-mono font-semibold">{formatCOP(Number(m.valor))}</td>
                    <td className={`px-5 py-5 font-mono font-semibold ${Number(m.saldo_valor) < 0 ? "text-danger" : ""}`}>
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
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="font-semibold">Esta cuenta todavía no tiene movimientos</p>
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
