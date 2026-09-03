"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { periodoContableSchema, type PeriodoContableFormData } from "@/lib/validators";
import { useCreatePeriodo } from "../hooks/usePeriodos";
import type { CreatePeriodoPayload } from "../types/periodos.types";

interface PeriodoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PeriodoFormModal({ open, onOpenChange }: PeriodoFormModalProps) {
  const crear = useCreatePeriodo();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PeriodoContableFormData>({
    resolver: zodResolver(periodoContableSchema),
    defaultValues: { nombre: "", fechaInicio: "", fechaFin: "" },
  });

  const cerrar = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = (datos: PeriodoContableFormData) => {
    const payload: CreatePeriodoPayload = {
      nombre: datos.nombre,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
    };
    crear.mutate(payload, { onSuccess: cerrar });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ maxWidth: 460 }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Nuevo período contable
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Define el rango de fechas del período (se crea en estado ABIERTO).
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Campo etiqueta="Nombre" error={errors.nombre?.message}>
            <Input
              placeholder="Ej: Enero 2026"
              {...register("nombre")}
              className={cn(errors.nombre && "border border-destructive")}
            />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Inicio" error={errors.fechaInicio?.message}>
              <Input
                type="date"
                {...register("fechaInicio")}
                className={cn(errors.fechaInicio && "border border-destructive")}
              />
            </Campo>
            <Campo etiqueta="Fin" error={errors.fechaFin?.message}>
              <Input
                type="date"
                {...register("fechaFin")}
                className={cn(errors.fechaFin && "border border-destructive")}
              />
            </Campo>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Creando…" : "Crear período"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{etiqueta}</span>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </label>
  );
}
