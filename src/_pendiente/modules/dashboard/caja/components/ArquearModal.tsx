"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/shared/FormDialog";
import { formatCOP } from "@/lib/utils";
import { arqueoSchema, type ArqueoFormData } from "@/lib/validators";
import { useGetSaldoCaja } from "../hooks/useCaja";
import { clasificarArqueo, hoyLocal } from "../lib/ciclo-caja";

interface ArquearModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirmar: (datos: ArqueoFormData) => void;
}

/**
 * Evento A6 · cerrar la caja del día.
 *
 * El saldo del sistema lo pone el sistema y no se puede escribir: si el cajero
 * pudiera editarlo, el arqueo dejaría de ser un contraste y pasaría a ser una
 * declaración.
 *
 * La diferencia se clasifica acá con la misma función del backend —en centavos,
 * para que una resta de flotantes no convierta en faltante un arqueo que
 * cuadra— y por eso la pantalla puede exigir la observación en el mismo momento
 * en que la exigiría el servidor, y no un viaje después.
 */
export function ArquearModal({
  open,
  onOpenChange,
  loading = false,
  onConfirmar,
}: ArquearModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ArqueoFormData>({
    resolver: zodResolver(arqueoSchema),
    defaultValues: { fecha: hoyLocal(), saldoContado: 0, observacion: "" },
  });

  // Se limpia al abrir: el conteo de ayer no debería aparecer escrito hoy.
  useEffect(() => {
    if (open) reset({ fecha: hoyLocal(), saldoContado: 0, observacion: "" });
  }, [open, reset]);

  const fecha = useWatch({ control, name: "fecha" }) || hoyLocal();
  const contado = Number(useWatch({ control, name: "saldoContado" }) ?? 0);
  const observacion = useWatch({ control, name: "observacion" }) ?? "";

  const { data: saldoSistema = 0, isLoading: cargandoSaldo } = useGetSaldoCaja(fecha);
  const { diferencia, resultado } = clasificarArqueo(saldoSistema, contado);

  const cuadra = resultado === "CUADRA";
  // El backend pide entre 5 y 500 caracteres cuando no cuadra. Mismo umbral acá
  // para que el botón no mande algo que va a volver con un 400.
  const faltaObservacion = !cuadra && observacion.trim().length < 5;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} titulo="Cerrar caja" ancho={560}>
      <form onSubmit={handleSubmit((datos) => onConfirmar(datos))} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
            <Input type="date" {...register("fecha")} />
            {errors.fecha && (
              <p className="mt-1 text-xs text-destructive">{errors.fecha.message}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground/70">
              Un arqueo por día: el segundo del mismo día se rechaza.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Efectivo contado
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              aria-invalid={Boolean(errors.saldoContado) || undefined}
              {...register("saldoContado", { valueAsNumber: true })}
            />
            {errors.saldoContado && (
              <p className="mt-1 text-xs text-destructive">{errors.saldoContado.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted px-3 py-3">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Saldo del sistema</span>
            <span className="font-mono font-semibold text-foreground">
              {cargandoSaldo ? "…" : formatCOP(saldoSistema)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Contado</span>
            <span className="font-mono font-semibold text-foreground">
              {formatCOP(contado)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Diferencia</span>
            <span
              className={
                cuadra
                  ? "font-mono font-semibold text-foreground"
                  : "font-mono font-semibold text-destructive"
              }
            >
              {formatCOP(diferencia)}
            </span>
          </div>

          {/* El veredicto en palabras, no en color: se lee igual en escala de grises. */}
          <p
            className={
              cuadra
                ? "flex items-center gap-1 text-xs text-muted-foreground"
                : "flex items-center gap-1 text-xs font-medium text-destructive"
            }
          >
            {cuadra ? (
              <Check size={12} strokeWidth={2} aria-hidden="true" />
            ) : (
              <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
            )}
            {cuadra
              ? "Cuadra. Este arqueo no deja asiento: es un hecho administrativo."
              : resultado === "FALTANTE"
                ? "Faltante. Asienta contra el gasto y ajusta el cajón."
                : "Sobrante. Asienta contra el ingreso y ajusta el cajón."}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Observación{" "}
            {cuadra ? (
              <span className="text-muted-foreground/70">(opcional)</span>
            ) : (
              <span className="text-destructive">(obligatoria)</span>
            )}
          </label>
          <Input
            placeholder={cuadra ? "Nota del cierre…" : "Qué explica la diferencia…"}
            aria-invalid={faltaObservacion || undefined}
            {...register("observacion")}
          />
          {faltaObservacion && (
            <p className="mt-1 text-xs text-destructive">
              Mínimo 5 caracteres: un faltante sin explicación es un faltante escondido.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || cargandoSaldo || faltaObservacion}>
            {loading ? "Procesando…" : "Cerrar caja"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
