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
import { usuarioSchema, type UsuarioFormData } from "@/lib/validators";
import { useCreateUsuario, useUpdateUsuario } from "../hooks/useUsuarios";
import {
  ROLES,
  type CreateUsuarioPayload,
  type UpdateUsuarioPayload,
  type Usuario,
} from "../types/usuarios.types";

const inputSelect =
  "h-9 w-full rounded-lg border border-border bg-muted px-2 text-sm text-foreground outline-none focus:border-primary";

interface UsuarioFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
}

export function UsuarioFormModal({ open, onOpenChange, usuario }: UsuarioFormModalProps) {
  const esEdicion = Boolean(usuario);
  const crear = useCreateUsuario();
  const actualizar = useUpdateUsuario(usuario?.id ?? "");
  const mutacion = esEdicion ? actualizar : crear;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: { nombreCompleto: "", email: "", password: "", roles: ["VENTAS"] },
  });

  useEffect(() => {
    if (open) {
      reset({
        nombreCompleto: usuario?.nombreCompleto ?? "",
        email: usuario?.email ?? "",
        password: "",
        roles: usuario?.roles ?? ["VENTAS"],
      });
    }
  }, [open, usuario, reset]);

  const cerrar = () => onOpenChange(false);

  const onSubmit = (datos: UsuarioFormData) => {
    if (esEdicion) {
      const payload: UpdateUsuarioPayload = {
        nombreCompleto: datos.nombreCompleto,
        email: datos.email,
        roles: datos.roles,
      };
      actualizar.mutate(payload, { onSuccess: cerrar });
      return;
    }
    // Reason: en creación el password es obligatorio; el backend valida mín. 8 (400 → toast).
    const payload: CreateUsuarioPayload = {
      nombreCompleto: datos.nombreCompleto,
      email: datos.email,
      password: datos.password ?? "",
      roles: datos.roles,
    };
    crear.mutate(payload, { onSuccess: cerrar });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ maxWidth: 480 }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            {esEdicion ? "Editar usuario" : "Nuevo usuario"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {esEdicion
              ? "Actualiza el nombre, email o rol del usuario."
              : "Crea un usuario del sistema con su rol y contraseña inicial."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Campo etiqueta="Nombre completo" error={errors.nombreCompleto?.message}>
            <Input
              {...register("nombreCompleto")}
              className={cn(errors.nombreCompleto && "border border-destructive")}
            />
          </Campo>
          <Campo etiqueta="Email" error={errors.email?.message}>
            <Input
              type="email"
              {...register("email")}
              className={cn(errors.email && "border border-destructive")}
            />
          </Campo>
          <Campo etiqueta="RolCodigo">
            <select {...register("roles")} className={inputSelect}>
              {ROLES.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.label}
                </option>
              ))}
            </select>
          </Campo>
          {!esEdicion && (
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Contraseña inicial
              </span>
              <Input type="password" {...register("password")} />
              <p className="mt-1 text-xs text-muted-foreground/70">Mínimo 8 caracteres.</p>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutacion.isPending}>
              {mutacion.isPending ? "Guardando…" : esEdicion ? "Guardar" : "Crear usuario"}
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
