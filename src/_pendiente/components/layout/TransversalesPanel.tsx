"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/core/store/authStore";
import { useUiStore } from "@/core/store/uiStore";
import { INICIO } from "@/core/config/nav.config";
import { procesosConFlujo, transversalesDe } from "@/core/config/nav.helpers";

// Columna izquierda contextual: los transversales que "toca" el básico activo,
// con su evento contable. Cambia según Reparación / Venta / Compra. Si no hay
// básico activo o el rol no puede abrir ninguno de sus transversales, no se
// renderiza (main ocupa todo el ancho). Solo desktop; en móvil las áreas viven
// en el menú hamburguesa. Ver `docs/Plan_Navegacion_Por_Procesos.md`.
//
// En Inicio tampoco se renderiza: el tablero de entrada no cuelga de ningún
// proceso, así que la columna no tendría de qué hablar. El proceso activo NO se
// borra —volver a Venta lo recupera—, solo se oculta mientras se está ahí.

export function TransversalesPanel() {
  const pathname = usePathname();
  const roles = useAuthStore((s) => s.roles);
  const procesoActivo = useUiStore((s) => s.procesoActivo);

  const { activo, transversales } = useMemo(() => {
    if (!roles) return { activo: null, transversales: [] };
    const act = procesosConFlujo(roles).find((p) => p.id === procesoActivo) ?? null;
    return { activo: act, transversales: act ? transversalesDe(roles, act.transversales) : [] };
  }, [roles, procesoActivo]);

  if (pathname === INICIO.ruta) return null;
  if (!activo || transversales.length === 0) return null;

  const esRutaActiva = (ruta: string) => pathname === ruta || pathname.startsWith(`${ruta}/`);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-card md:block">
      <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto p-5">
        {/* Dice qué es esta lista y de qué proceso cuelga. Cambia con el
            proceso activo: no es un menú fijo, son las áreas que TOCA lo que
            se está haciendo. */}
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Procesos transversales a {activo.label}
        </p>

        <nav className="flex flex-col gap-2">
          {transversales.map(({ area, primaryRuta }) => {
            const AreaIcono = area.icon;
            const activa = area.items.some((it) => esRutaActiva(it.ruta));
            return (
              <Link
                key={area.id}
                href={primaryRuta}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  activa
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <AreaIcono className="size-5 shrink-0" strokeWidth={1.75} />
                {/* Solo el nombre. El evento contable —«Salida al costo
                    promedio…»— explicaba de más en un menú, que es para llegar
                    a un sitio y no para aprender el modelo. */}
                <span className="min-w-0 truncate text-sm font-semibold">{area.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
