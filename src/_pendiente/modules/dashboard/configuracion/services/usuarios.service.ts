import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type {
  CreateUsuarioPayload,
  FiltrosUsuario,
  UpdateUsuarioPayload,
  Usuario,
} from "../types/usuarios.types";

export const usuariosService = {
  obtenerTodos: (filtros?: FiltrosUsuario) =>
    api.get<Paginado<Usuario>>("/usuarios", { params: filtros }).then((r) => r.data),

  crear: (data: CreateUsuarioPayload) =>
    api.post<Usuario>("/usuarios", data).then((r) => r.data),

  actualizar: (id: string, data: UpdateUsuarioPayload) =>
    api.patch<Usuario>(`/usuarios/${id}`, data).then((r) => r.data),

  eliminar: (id: string) =>
    api.delete<unknown>(`/usuarios/${id}`).then((r) => r.data),

  resetPassword: (id: string, nuevaPassword: string) =>
    api
      .patch<unknown>(`/usuarios/${id}/password`, { nuevaPassword })
      .then((r) => r.data),
};
