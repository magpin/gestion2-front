"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";

/**
 * Las cuentas del plan por id, para pintar «530505 · Gastos bancarios» donde
 * la API solo trae `contra_cuenta_id`. Incluye las inactivas: una regla vieja
 * puede apuntar a una cuenta que ya se desactivó, y eso también hay que verlo.
 */
export function useCuentasContables(activo = true): Map<string, CuentaEmpresa> {
  const { data = [] } = useQuery({
    queryKey: ["plan-cuentas", "por-id"],
    queryFn: () => planCuentasApi.listar({ incluirInactivas: "true" }),
    enabled: activo,
    staleTime: 5 * 60_000,
  });
  return useMemo(() => new Map(data.map((c) => [c.id, c])), [data]);
}

export function nombreCuenta(cuenta: CuentaEmpresa | undefined): string {
  return cuenta ? `${cuenta.codigo} · ${cuenta.nombre}` : "Cuenta no encontrada";
}
