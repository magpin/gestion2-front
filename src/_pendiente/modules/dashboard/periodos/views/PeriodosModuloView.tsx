"use client";

import { useAuthStore } from "@/core/store/authStore";
import { PeriodosView } from "./PeriodosView";
import { PeriodosContadorView } from "./PeriodosContadorView";

// Contenedor del módulo Períodos. El contador lo ve en modo referencia (solo
// lectura); el resto de roles conserva la vista operativa.
export function PeriodosModuloView() {
  const roles = useAuthStore((state) => state.roles);

  if (roles.includes("DIRECTOR")) {
    return <PeriodosContadorView />;
  }

  return <PeriodosView />;
}
