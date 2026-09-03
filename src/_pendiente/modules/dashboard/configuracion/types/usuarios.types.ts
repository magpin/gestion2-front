import type { RolCodigo } from "@/modules/auth/types/auth.types";
// Espejo del backend (backend/src/modules/usuarios).

export interface Usuario {
  id: string;
  nombreCompleto: string;
  email: string;
  roles: RolCodigo[];
  superAdmin: boolean;
  createdAt: string;
}

export interface CreateUsuarioPayload {
  nombreCompleto: string;
  email: string;
  password: string;
  roles: RolCodigo[];
  superAdmin?: boolean;
}

export interface UpdateUsuarioPayload {
  nombreCompleto?: string;
  email?: string;
  roles?: RolCodigo[];
}

export interface FiltrosUsuario {
  page?: number;
  limit?: number;
}

export const ROLES: { id: RolCodigo; label: string }[] = [
  { id: "DIRECTOR", label: "Director" },
  { id: "VENTAS", label: "Coordinador comercial" },
  { id: "JEFE_TECNICO", label: "Coordinador técnico" },
  { id: "VENTAS", label: "Asesor" },
  { id: "INVENTARIO", label: "Bodeguero" },
  { id: "DIRECTOR", label: "Contador" },
  { id: "TECNICO", label: "Técnico" },
  { id: "DIRECTOR", label: "Super admin" },
];

export const ROL_LABEL = new Map(ROLES.map((r) => [r.id, r.label]));
