"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/SelectField";
import { formatCOP, formatFecha } from "@/lib/utils";
import { abonoSchema, type AbonoFormData } from "@/lib/validators";
import { hoyLocal, type DocumentoUbicable } from "../lib/ciclo-caja";
import { MEDIOS_PAGO, tocaLaCaja, type MedioPago, type SentidoAbono } from "../types/caja.types";

interface AbonoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El documento elegido en el paso 1 del gesto. `null` cierra el modal. */
  documento: DocumentoUbicable | null;
  sentido: SentidoAbono;
  /** Nombre del tercero por id: el documento trae `terceroId`, no el tercero entero. */
  nombreTercero: (terceroId: string) => string;
  loading?: boolean;
  onConfirmar: (datos: AbonoFormData) => void;
}

const OPCIONES_MEDIO = MEDIOS_PAGO.map((medio) => ({ value: medio.id, label: medio.label }));

/**
 * Paso 2 del gesto de dos pasos: el documento ya está elegido, falta el importe.
 *
 * Un solo formulario para cobrar y para pagar porque del lado del backend son
 * la misma fila —una tabla `abono`, el sentido en una columna—. Duplicarlo
 * serían dos formularios que se desincronizan el día que se agregue un campo.
 *
 * Dos cosas que el usuario tiene que ver ANTES de guardar, no después:
 *
 *   · si el medio mueve el cajón o no — el efectivo cuenta para el arqueo de la
 *     tarde y una transferencia no, y enterarse al contar es tarde
 *   · el saldo que queda — el backend rechaza un importe mayor con un 422, pero
 *     la pantalla puede decirlo sin ir al servidor
 */
export function AbonoFormModal({
  open,
  onOpenChange,
  documento,
  sentido,
  nombreTercero,
  loading = false,
  onConfirmar,
}: AbonoFormModalProps) {
  const esCobro = sentido === "COBRO";
  const saldo = documento?.saldoPendiente ?? 0;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AbonoFormData>({
    resolver: zodResolver(abonoSchema),
    defaultValues: {
      importe: saldo,
      medioPago: "EFECTIVO",
      fecha: hoyLocal(),
      referencia: "",
      observacion: "",
    },
  });

  // El importe arranca en el saldo completo —abonar todo es lo más frecuente—
  // y se reinicia con cada documento: el importe de un cobro no debería quedar
  // escrito en el siguiente.
  useEffect(() => {
    if (documento) {
      reset({
        importe: documento.saldoPendiente,
        medioPago: "EFECTIVO",
        fecha: hoyLocal(),
        referencia: "",
        observacion: "",
      });
    }
  }, [documento, reset]);

  const importe = Number(useWatch({ control, name: "importe" }) ?? 0);
  const medioPago = (useWatch({ control, name: "medioPago" }) ?? "EFECTIVO") as MedioPago;

  const excede = importe > saldo;
  const restante = Math.max(0, saldo - importe);
  const enCajon = tocaLaCaja(medioPago);

  if (!documento) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      titulo={esCobro ? "Registrar cobro" : "Registrar pago"}
      ancho={560}
    >
      <form
        onSubmit={handleSubmit((datos) => onConfirmar(datos))}
        className="space-y-5"
      >
        <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
          <p className="truncate text-sm font-medium text-foreground">
            {nombreTercero(documento.terceroId)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {documento.referencia} · {formatFecha(documento.fecha)} · total{" "}
            {formatCOP(documento.total)}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-warning">
            saldo {formatCOP(saldo)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Importe</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              aria-invalid={Boolean(errors.importe) || excede || undefined}
              {...register("importe", { valueAsNumber: true })}
            />
            {errors.importe && (
              <p className="mt-1 text-xs text-destructive">{errors.importe.message}</p>
            )}
            {!errors.importe && excede && (
              <p className="mt-1 text-xs text-destructive">
                Supera el saldo: quedan {formatCOP(saldo)}.
              </p>
            )}
            {!errors.importe && !excede && importe > 0 && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                {restante > 0
                  ? `Queda debiendo ${formatCOP(restante)}.`
                  : "Salda el documento por completo."}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Medio de pago</label>
            <Controller
              control={control}
              name="medioPago"
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={(valor) => field.onChange(valor as MedioPago)}
                  options={OPCIONES_MEDIO}
                />
              )}
            />
            {/* La consecuencia contable, dicha antes de guardar y no después. */}
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/70">
              {enCajon ? (
                <Banknote size={12} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Landmark size={12} strokeWidth={1.75} aria-hidden="true" />
              )}
              {enCajon
                ? "Pasa por el cajón: cuenta para el arqueo."
                : "No pasa por el cajón: va contra Bancos."}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
            <Input type="date" {...register("fecha")} />
            {errors.fecha && (
              <p className="mt-1 text-xs text-destructive">{errors.fecha.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Referencia {enCajon && <span className="text-muted-foreground/70">(opcional)</span>}
            </label>
            <Input
              placeholder={enCajon ? "—" : "Número de la transferencia o del cheque"}
              {...register("referencia")}
            />
            {!enCajon && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                Es lo que pide el banco cuando algo no cuadra.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Observación <span className="text-muted-foreground/70">(opcional)</span>
          </label>
          <Input placeholder="Queda escrita en el abono…" {...register("observacion")} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || excede}>
            {loading ? "Procesando…" : esCobro ? "Cobrar" : "Pagar"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
