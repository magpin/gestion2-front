"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  CampoPesos,
  comoNumero,
  comoTexto,
} from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import { Campo } from "@/modules/configuracion/components/Campo";

const esquema = z.object({
  fechaDesde: z.string().min(1, "Requerido"),
  fechaHasta: z.string().min(1, "Requerido"),
  saldoInicialBanco: z.number(),
  saldoFinalBanco: z.number(),
});

export type DatosExtracto = z.infer<typeof esquema>;

const CONTROL = "h-11 rounded-xl px-4";
const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * La cabecera de un extracto: un rango de fechas, no un día — no
 * encadena con el anterior, el banco lleva su propio calendario. Las
 * líneas se cargan después, una por una, desde el detalle
 * (`FormularioLineaExtracto`).
 */
export function FormularioExtracto({
  id,
  alGuardar,
}: {
  id: string;
  alGuardar: (datos: DatosExtracto) => void;
}) {
  const form = useForm<DatosExtracto>({
    resolver: zodResolver(esquema),
    defaultValues: {
      fechaDesde: hoy(),
      fechaHasta: hoy(),
      saldoInicialBanco: 0,
      saldoFinalBanco: 0,
    },
  });
  const errores = form.formState.errors;

  return (
    <form id={id} className="flex flex-col gap-5" onSubmit={form.handleSubmit(alGuardar)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="fechaDesde" etiqueta="Desde *" error={errores.fechaDesde?.message} escala="grande">
          <Input id="fechaDesde" type="date" className={CONTROL} {...form.register("fechaDesde")} />
        </Campo>

        <Campo id="fechaHasta" etiqueta="Hasta *" error={errores.fechaHasta?.message} escala="grande">
          <Input id="fechaHasta" type="date" className={CONTROL} {...form.register("fechaHasta")} />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="saldoInicialBanco"
          etiqueta="Saldo inicial (según el banco) *"
          error={errores.saldoInicialBanco?.message}
          escala="grande"
        >
          <Controller
            control={form.control}
            name="saldoInicialBanco"
            render={({ field }) => (
              <CampoPesos
                id="saldoInicialBanco"
                negativo
                className={CONTROL}
                value={comoTexto(field.value)}
                onChange={(v) => field.onChange(comoNumero(v))}
                onBlur={field.onBlur}
              />
            )}
          />
        </Campo>

        <Campo
          id="saldoFinalBanco"
          etiqueta="Saldo final (según el banco) *"
          error={errores.saldoFinalBanco?.message}
          escala="grande"
        >
          <Controller
            control={form.control}
            name="saldoFinalBanco"
            render={({ field }) => (
              <CampoPesos
                id="saldoFinalBanco"
                negativo
                className={CONTROL}
                value={comoTexto(field.value)}
                onChange={(v) => field.onChange(comoNumero(v))}
                onBlur={field.onBlur}
              />
            )}
          />
        </Campo>
      </div>
    </form>
  );
}
