"use client";

import { useAuthStore } from "@/core/store/authStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { InicioView } from "./InicioView";
import { InicioContadorView } from "./InicioContadorView";

/**
 * El inicio no es UN tablero: son varios, y la persona ve la unión de los que
 * le tocan.
 *
 * Con los permisos sumados esto deja de ser un `switch` por rol. La cajera con
 * cuatro roles ve cuatro bloques; el técnico ve uno. Es la primera consecuencia
 * visible de que una persona tenga varios roles.
 *
 * Ya no hay redirección a Plataforma: ese perfil era del superusuario, y en
 * este modelo DIRECTOR no lo es.
 */
export function InicioPorRolView() {
  const roles = useAuthStore((state) => state.roles);

  const esJefeTaller = roles.includes("JEFE_TECNICO");
  const esDirector = roles.includes("DIRECTOR");

  // El director mira el negocio, no la operación: números, no bandejas.
  if (esDirector && !esJefeTaller) return <InicioContadorView />;

  if (!esJefeTaller) return <InicioView />;

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Supervisión del taller"
      />

      <PanelPendiente nombre="La supervisión del taller" />

      <div className="space-y-3">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Agenda</h2>
          <p className="text-muted-foreground/70 text-xs">Tus OT por entregar.</p>
        </div>
        <PanelPendiente nombre="La agenda del taller" />
      </div>
    </div>
  );
}

/** Bloque de un módulo que todavía no existe en el backend. */
function PanelPendiente({ nombre }: { nombre: string }) {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
      {nombre} llega con el módulo <span className="font-medium">taller</span>, el séptimo.
    </div>
  );
}
