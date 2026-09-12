"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/modules/configuracion/components/Campo";
import { formatCOP } from "@/lib/utils";
import type { ArqueoResumen } from "../types/tesoreria.types";

const CONTROL = "h-11 rounded-xl px-4";
const hoy = () => new Date().toISOString().slice(0, 10);

const esquemaAbrir = z.object({
  fecha: z.string().min(1, "Requerido"),
  nota: z.string().max(300).optional(),
});
export type DatosAbrirArqueo = z.infer<typeof esquemaAbrir>;

/** Abre el arqueo del día. El saldo del sistema lo congela el backend, no acá. */
export function FormularioAbrirArqueo({
  id,
  alGuardar,
}: {
  id: string;
  alGuardar: (datos: DatosAbrirArqueo) => void;
}) {
  const form = useForm<DatosAbrirArqueo>({
    resolver: zodResolver(esquemaAbrir),
    defaultValues: { fecha: hoy(), nota: "" },
  });
  const errores = form.formState.errors;

  return (
    <form id={id} className="flex flex-col gap-5" onSubmit={form.handleSubmit(alGuardar)}>
      <Campo id="fecha" etiqueta="Fecha *" error={errores.fecha?.message} escala="grande">
        <Input id="fecha" type="date" className={CONTROL} {...form.register("fecha")} />
      </Campo>
      <Campo id="nota" etiqueta="Nota" escala="grande">
        <Textarea id="nota" className="min-h-20 rounded-xl px-4 py-3" placeholder="Opcional" {...form.register("nota")} />
      </Campo>
    </form>
  );
}

const esquemaCerrar = z.object({
  saldoContado: z.number().min(0, "No puede ser negativo"),
  nota: z.string().max(300).optional(),
});
export type DatosCerrarArqueo = z.infer<typeof esquemaCerrar>;

/**
 * Cierra el arqueo abierto de una caja. El saldo del sistema va en modo
 * lectura —lo congeló `abrir`, no se recalcula acá— y la diferencia se ve
 * en vivo a medida que se cuenta: positiva es sobrante, negativa es
 * faltante, mismo signo que `calcularDiferenciaArqueo` del backend.
 */
export function FormularioCerrarArqueo({
  id,
  arqueo,
  alGuardar,
}: {
  id: string;
  arqueo: ArqueoResumen;
  alGuardar: (datos: DatosCerrarArqueo) => void;
}) {
  const form = useForm<DatosCerrarArqueo>({
    resolver: zodResolver(esquemaCerrar),
    defaultValues: { saldoContado: Number(arqueo.saldo_sistema), nota: "" },
  });
  const errores = form.formState.errors;

  const saldoContado = form.watch("saldoContado");
  const diferencia = (Number.isFinite(saldoContado) ? saldoContado : 0) - Number(arqueo.saldo_sistema);
  const tono = diferencia === 0 ? "text-muted-foreground" : diferencia > 0 ? "text-success" : "text-danger";

  return (
    <form id={id} className="flex flex-col gap-5" onSubmit={form.handleSubmit(alGuardar)}>
      <p className="rounded-2xl bg-muted p-4 text-sm">
        Saldo del sistema: <span className="font-mono font-semibold">{formatCOP(Number(arqueo.saldo_sistema))}</span>
      </p>

      <Campo id="saldoContado" etiqueta="Saldo contado *" error={errores.saldoContado?.message} escala="grande">
        <Input
          id="saldoContado"
          type="number"
          min="0"
          step="0.01"
          className={CONTROL}
          {...form.register("saldoContado", { valueAsNumber: true })}
        />
      </Campo>

      <div className={`rounded-2xl bg-muted p-4 text-sm ${tono}`}>
        {diferencia === 0 ? (
          "Sin diferencia: el cierre no va a generar ningún asiento."
        ) : diferencia > 0 ? (
          <>
            Sobrante: <span className="font-mono font-semibold">{formatCOP(diferencia)}</span> — se va a asentar
            contra la cuenta de diferencia configurada.
          </>
        ) : (
          <>
            Faltante: <span className="font-mono font-semibold">{formatCOP(Math.abs(diferencia))}</span> — se va a
            asentar contra la cuenta de diferencia configurada.
          </>
        )}
      </div>

      <Campo id="nota" etiqueta="Nota" escala="grande">
        <Textarea id="nota" className="min-h-20 rounded-xl px-4 py-3" placeholder="Opcional" {...form.register("nota")} />
      </Campo>
    </form>
  );
}
