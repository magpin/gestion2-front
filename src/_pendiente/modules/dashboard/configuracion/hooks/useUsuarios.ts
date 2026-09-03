"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usuariosService } from "../services/usuarios.service";
import type {
  CreateUsuarioPayload,
  FiltrosUsuario,
  UpdateUsuarioPayload,
} from "../types/usuarios.types";
import { aviso } from "@/lib/avisos";

// Reason: 409 = email duplicado; 422 = negocio → advertencia, no error rojo.
function notificarError(error: unknown, fallback: string) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const mensaje =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
  if (status === 409 || status === 422) {
    aviso.advertencia(mensaje);
  } else {
    aviso.error(mensaje);
  }
}

export const useGetUsuarios = (filtros?: FiltrosUsuario) => {
  return useQuery({
    queryKey: ["usuarios", filtros],
    queryFn: () => usuariosService.obtenerTodos(filtros),
  });
};

export const useCreateUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUsuarioPayload) => usuariosService.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      aviso.exito("Usuario creado");
    },
    onError: (error) => notificarError(error, "No se pudo crear el usuario"),
  });
};

export const useUpdateUsuario = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUsuarioPayload) => usuariosService.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      aviso.exito("Usuario actualizado");
    },
    onError: (error) => notificarError(error, "No se pudo actualizar el usuario"),
  });
};

export const useDeleteUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usuariosService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      aviso.exito("Usuario eliminado");
    },
    onError: (error) => notificarError(error, "No se pudo eliminar el usuario"),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ id, nuevaPassword }: { id: string; nuevaPassword: string }) =>
      usuariosService.resetPassword(id, nuevaPassword),
    onSuccess: () => aviso.exito("Contraseña actualizada"),
    onError: (error) => notificarError(error, "No se pudo resetear la contraseña"),
  });
};
