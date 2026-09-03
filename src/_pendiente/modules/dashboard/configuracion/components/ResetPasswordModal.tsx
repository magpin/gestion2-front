"use client";

import { useEffect } from "react";
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
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validators";
import { useResetPassword } from "../hooks/useUsuarios";
import type { Usuario } from "../types/usuarios.types";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
}

export function ResetPasswordModal({ open, onOpenChange, usuario }: ResetPasswordModalProps) {
  const resetear = useResetPassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { nuevaPassword: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ nuevaPassword: "" });
    }
  }, [open, reset]);

  const onSubmit = (datos: ResetPasswordFormData) => {
    if (!usuario) {
      return;
    }
    resetear.mutate(
      { id: usuario.id, nuevaPassword: datos.nuevaPassword },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ maxWidth: 440 }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Resetear contraseña
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Define una nueva contraseña para «{usuario?.nombreCompleto ?? ""}».
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              Nueva contraseña
            </span>
            <Input
              type="password"
              {...register("nuevaPassword")}
              className={cn(errors.nuevaPassword && "border border-destructive")}
            />
            {errors.nuevaPassword && (
              <p className="mt-1 text-xs text-destructive">
                {errors.nuevaPassword.message}
              </p>
            )}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={resetear.isPending}>
              {resetear.isPending ? "Guardando…" : "Actualizar"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
