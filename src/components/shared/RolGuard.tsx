"use client";

import { useAuthStore } from "@/core/store/authStore";
import type { RolCodigo } from "@/modules/auth/types/auth.types";

interface RolGuardProps {
  children: React.ReactNode;
  /** Lista blanca: basta con tener UNO de estos roles. */
  roles: RolCodigo[];
  fallback?: React.ReactNode;
}

/**
 * Oculta lo que la persona no puede usar.
 *
 * Los permisos se SUMAN: quien tiene VENTAS y CAJA ve lo de los dos. Y
 * `DIRECTOR` no es superusuario — si algo es de caja, el director tiene que
 * estar listado.
 *
 * Esto es cosmético: quién puede hacer qué lo decide el backend con `@Roles(...)`.
 * Ocultar un botón no protege nada; solo evita mostrar puertas cerradas.
 */
export function RolGuard({ children, roles, fallback = null }: RolGuardProps) {
  const mios = useAuthStore((s) => s.roles);
  return roles.some((r) => mios.includes(r)) ? <>{children}</> : <>{fallback}</>;
}
