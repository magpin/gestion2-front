"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  Ellipsis,
  Home,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";
import { useAuthStore } from "@/core/store/authStore";
import { cn } from "@/lib/utils";
import type { RolCodigo } from "@/modules/auth/types/auth.types";
import { destinosVisibles } from "./BarraLateral";

/** Las cuatro puertas del móvil (PC20). «Más» abre el menú completo. */
const PUERTAS: Array<{ href: string; etiqueta: string; icono: LucideIcon }> = [
  { href: "/dashboard", etiqueta: "Inicio", icono: Home },
  { href: "/dashboard/cobros", etiqueta: "Cobros", icono: BanknoteArrowDown },
  { href: "/dashboard/pagos", etiqueta: "Pagos", icono: BanknoteArrowUp },
  { href: "/dashboard/gastos", etiqueta: "Gastos", icono: Receipt },
];

/**
 * Las puertas de la barra inferior para estos roles: las mismas que el menú
 * le muestra. Nadie ve en el móvil una puerta que al abrirla da 403, ni una
 * pieza que todavía está apagada.
 */
export function puertasMoviles(roles: RolCodigo[]): string[] {
  const visibles = new Set(destinosVisibles(roles));
  return PUERTAS.filter((p) => visibles.has(p.href)).map((p) => p.href);
}

/**
 * La barra de abajo en el móvil (pantallas 66 a 68): Inicio, Cobros, Pagos,
 * Gastos y Más. Solo por debajo de `md`; en pantallas grandes manda la barra
 * lateral. «Más» abre esa misma barra como hoja.
 */
export function BarraInferior() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const roles = useAuthStore((s) => s.roles);
  // Los roles se leen montado el árbol, igual que en la barra lateral: el
  // servidor no los tiene y filtrar antes rompería la hidratación.
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const visibles = new Set(montado ? puertasMoviles(roles) : ["/dashboard"]);
  const activa = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const clase = (encendida: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
      encendida ? "text-foreground" : "text-muted-foreground",
    );
  const icono = (Icono: LucideIcon, encendida: boolean) => (
    <span className={cn("grid h-7 w-12 place-items-center rounded-full", encendida && "bg-muted")}>
      <Icono className="size-5" strokeWidth={1.7} />
    </span>
  );

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {PUERTAS.filter((p) => visibles.has(p.href)).map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={activa(p.href) ? "page" : undefined}
          className={clase(activa(p.href))}
        >
          {icono(p.icono, activa(p.href))}
          {p.etiqueta}
        </Link>
      ))}
      <button type="button" onClick={() => setOpenMobile(true)} className={clase(false)}>
        {icono(Ellipsis, false)}
        Más
      </button>
    </nav>
  );
}
