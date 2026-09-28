"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/core/store/authStore";
import { Maria } from "@/modules/asistente/components/Maria";
import { useCerrarSesion, useElegirEmpresa, useEmpresasAccesibles } from "../hooks/useAuth";
import { ultimaEmpresa } from "../lib/ultimaEmpresa";

/**
 * Entre el login y el trabajo. **Ya no se elige empresa en una lista**: se entra.
 *
 * - Con empresas, a la última que se usó en este navegador —o a la primera—.
 *   Cambiar a otra se hace desde la barra superior, sin salir.
 * - Sin empresas y pudiendo crearlas, directo al primer paso del recorrido.
 * - Sin empresas y sin poder crearlas, se dice a quién pedirle acceso.
 *
 * Lo que se ve mientras tanto es la pantalla de carga de la lámina `Fuera` de
 * `mocks/maria-identidad/`: «Abriendo…» con las ondas, que es donde mejor lucen.
 */
export function EntrandoView() {
  const router = useRouter();
  const guardadas = useAuthStore((s) => s.empresas);
  const esAdmin = useAuthStore((s) => s.roles.includes("ADMIN_TENANT"));
  const { data, isError } = useEmpresasAccesibles();
  const elegir = useElegirEmpresa();
  const cerrarSesion = useCerrarSesion();
  /** Se entra una sola vez: la consulta se puede volver a pedir y no hay que abrir dos veces. */
  const yaEntro = useRef(false);

  const empresas = data ?? (isError ? guardadas : undefined);
  const destino =
    empresas === undefined || empresas.length === 0
      ? undefined
      : (empresas.find((e) => e.id === ultimaEmpresa.leer()) ?? empresas[0]);
  const sinEmpresas = empresas !== undefined && empresas.length === 0;

  useEffect(() => {
    if (yaEntro.current) return;
    if (destino !== undefined) {
      yaEntro.current = true;
      elegir.mutate(destino.id);
    } else if (sinEmpresas && esAdmin) {
      yaEntro.current = true;
      router.replace("/configuracion/empresa-nueva");
    }
  }, [destino, sinEmpresas, esAdmin, elegir, router]);

  if (sinEmpresas && !esAdmin) {
    return (
      <Marco>
        <Maria estado="dormida" tamano={64} invertida />
        <span className="text-center text-sm font-medium text-primary-foreground">
          Todavía no tenés acceso a ninguna empresa
        </span>
        <span className="text-center text-xs text-primary-foreground/70">
          Pedile al administrador de la cuenta que te dé acceso.
        </span>
        <Button variant="secondary" size="sm" onClick={() => cerrarSesion.mutate()}>
          Salir
        </Button>
      </Marco>
    );
  }

  return (
    <Marco>
      {/* Media y no alta: abrir una empresa no es leer un lote. */}
      <Maria estado="trabajando" tamano={64} intensidad="media" invertida />
      <span className="text-center text-xs text-primary-foreground/70" aria-live="polite">
        {elegir.isError
          ? "No pude abrir la empresa."
          : `Abriendo ${destino?.razonSocial ?? "tu empresa"}…`}
      </span>
      {elegir.isError && destino !== undefined && (
        <Button variant="secondary" size="sm" onClick={() => elegir.mutate(destino.id)}>
          Probar de nuevo
        </Button>
      )}
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl bg-primary px-8 py-12">
        {children}
      </div>
    </div>
  );
}
