"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { z } from "zod";

import {
  CampoPesos,
  comoNumero,
  comoTexto,
} from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import { formatCOP } from "@/lib/utils";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import type { TipoMovimientoCaja } from "../types/tesoreria.types";

const esquema = z.object({
  fecha: z.string().min(1, "Requerido"),
  valor: z.number().positive("Tiene que ser mayor a cero"),
  concepto: z.string().min(3, "Indique de qué se trata").max(300),
});

export type DatosMovimientoCaja = z.infer<typeof esquema> & {
  contraCuentaId?: string;
};

const CONTROL = "h-11 rounded-xl px-4";
const hoy = () => new Date().toISOString().slice(0, 10);

const NOTA: Record<TipoMovimientoCaja, string> = {
  SALDO_INICIAL:
    "Esta carga no genera asiento contable: es el saldo con el que arranca la caja.",
  INGRESO: "Esto va a generar un comprobante de ingreso (CI).",
  EGRESO: "Esto va a generar un comprobante de egreso (CE).",
};

/**
 * Uno solo para los tres tipos de movimiento manual: comparten fecha, valor
 * y concepto. Solo `SALDO_INICIAL` no pide contracuenta —no genera
 * asiento, mismo motivo que `ENTRADA_INICIAL` del kardex— así que ese
 * campo se oculta y no se exige para ese caso.
 */
export function FormularioMovimientoCaja({
  id,
  tipo,
  saldoActual,
  contraCuenta,
  onContraCuenta,
  alGuardar,
}: {
  id: string;
  tipo: TipoMovimientoCaja;
  /** El saldo corrido vigente, solo para mostrarlo — el rechazo por negativo lo decide el backend. */
  saldoActual: string | null;
  contraCuenta: CuentaEmpresa | null;
  onContraCuenta: (cuenta: CuentaEmpresa) => void;
  alGuardar: (datos: DatosMovimientoCaja) => void;
}) {
  const requiereContraCuenta = tipo !== "SALDO_INICIAL";

  const form = useForm<z.infer<typeof esquema>>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: hoy(), valor: 0, concepto: "" },
  });
  const errores = form.formState.errors;

  return (
    <form
      id={id}
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((d) => {
        if (requiereContraCuenta && !contraCuenta) {
          form.setError("root", { message: "Elija la contracuenta" });
          return;
        }
        alGuardar({ ...d, contraCuentaId: contraCuenta?.id });
      })}
    >
      {saldoActual !== null && (
        <p className="rounded-2xl bg-muted p-4 text-sm">
          Saldo actual: <span className="font-mono font-semibold">{formatCOP(Number(saldoActual))}</span>
        </p>
      )}

      <div
        className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
          tipo === "SALDO_INICIAL" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        }`}
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        {NOTA[tipo]}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="fecha" etiqueta="Fecha *" error={errores.fecha?.message} escala="grande">
          <Input id="fecha" type="date" className={CONTROL} {...form.register("fecha")} />
        </Campo>

        <Campo id="valor" etiqueta="Valor *" error={errores.valor?.message} escala="grande">
          <Controller
            control={form.control}
            name="valor"
            render={({ field }) => (
              <CampoPesos
                id="valor"
                className={CONTROL}
                value={comoTexto(field.value)}
                onChange={(v) => field.onChange(comoNumero(v))}
                onBlur={field.onBlur}
              />
            )}
          />
        </Campo>
      </div>

      {requiereContraCuenta && (
        <Campo
          id="contraCuentaId"
          etiqueta={`Cuenta ${tipo === "INGRESO" ? "que se acredita" : "que se debita"} *`}
          error={form.formState.errors.root?.message}
          escala="grande"
        >
          <SelectorCuenta
            crear={{ madres: "cualquiera" }}
            valor={contraCuenta}
            onElegir={onContraCuenta}
            invalido={Boolean(form.formState.errors.root)}
          />
        </Campo>
      )}

      <Campo id="concepto" etiqueta="Concepto *" error={errores.concepto?.message} escala="grande">
        <Textarea
          id="concepto"
          className="min-h-24 rounded-xl px-4 py-3"
          placeholder="Explica de qué se trata este movimiento"
          {...form.register("concepto")}
        />
      </Campo>
    </form>
  );
}
