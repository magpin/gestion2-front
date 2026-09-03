"use client";

import Link from "next/link";
import { Building2, ChevronsUpDown, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/core/store/authStore";
import { NOMBRE_ROL } from "@/modules/auth/types/auth.types";
import { useCerrarSesion } from "@/modules/auth/hooks/useAuth";

/**
 * La barra del área de trabajo.
 *
 * Lo primero que muestra es en qué contabilidad se está parado. En un sistema
 * donde una persona lleva quince empresas, equivocarse de empresa es registrar
 * una compra en los libros de otro cliente — y eso se corrige anulando, no
 * editando.
 */
export function BarraSuperior() {
  const usuario = useAuthStore((s) => s.usuario);
  const empresaId = useAuthStore((s) => s.empresaId);
  const empresas = useAuthStore((s) => s.empresas);
  const roles = useAuthStore((s) => s.roles);
  const cerrarSesion = useCerrarSesion();

  const empresa = empresas.find((e) => e.id === empresaId);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:px-8">
      <Link
        href="/empresa"
        className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-1.5 transition-colors hover:border-input"
      >
        <span className="grid size-6 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
          <Building2 className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight">
            {empresa?.razonSocial ?? "Sin empresa"}
          </span>
          {empresa && (
            <span className="block font-mono text-[10px] text-muted-foreground">
              NIT {empresa.nit}-{empresa.dv}
            </span>
          )}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </Link>

      <div className="ml-auto flex items-center gap-3">
        {roles.length > 0 && (
          <span className="hidden rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold sm:inline">
            {NOMBRE_ROL[roles[0]]}
          </span>
        )}
        <span className="hidden text-sm text-muted-foreground md:inline">
          {usuario?.nombre}
        </span>
        <Button variant="ghost" size="sm" onClick={() => cerrarSesion.mutate()}>
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
