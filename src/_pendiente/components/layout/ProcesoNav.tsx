"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, Menu, X, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useAuthStore } from "@/core/store/authStore";
import { useUiStore } from "@/core/store/uiStore";
import { useLogout } from "@/modules/auth/hooks/useAuth";
import { INICIO } from "@/core/config/nav.config";
import {
  misionalesVisibles,
  areasVisibles,
  estrategicosVisibles,
  procesosConFlujo,
} from "@/core/config/nav.helpers";

// Barra superior de navegación por procesos (fila 1). Los transversales del básico
// activo se muestran en la columna izquierda (`TransversalesPanel`), no aquí.
// Inicio · misionales (básicos) · Áreas (transversales, mega-menú) ·
// estratégicos · utilidades. En móvil, todo colapsa en el menú hamburguesa.
// Todo se filtra por `puedeVer` (opción A). Ver `docs/Plan_Navegacion_Por_Procesos.md`.

export function ProcesoNav() {
  const pathname = usePathname();
  const roles = useAuthStore((s) => s.roles);
  const usuario = useAuthStore((s) => s.usuario);
  const procesoActivo = useUiStore((s) => s.procesoActivo);
  const setProcesoActivo = useUiStore((s) => s.setProcesoActivo);
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  /** Dos letras del nombre para el avatar. Sin foto y sin campo nuevo. */
  const iniciales = useMemo(() => {
    const partes = (usuario?.nombreCompleto ?? "").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "—";
    return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
  }, [usuario]);

  // Inicio no tiene subrutas propias: match exacto (si no, quedaría "activo" en
  // todo /dashboard/*). El resto de los links sí heredan estado en sus subrutas.
  const esInicioActiva = pathname === INICIO.ruta;
  const esRutaActiva = (ruta: string) => pathname === ruta || pathname.startsWith(`${ruta}/`);

  const misionales = useMemo(() => (roles.length ? misionalesVisibles(roles) : []), [roles]);
  const areas = useMemo(() => (roles.length ? areasVisibles(roles) : []), [roles]);
  const estrategicos = useMemo(() => (roles.length ? estrategicosVisibles(roles) : []), [roles]);
  // Procesos con flujo = misionales + apoyos con flujo (Compras). Determinan el activo.
  const flujos = useMemo(() => (roles.length ? procesosConFlujo(roles) : []), [roles]);

  // Proceso activo: estado, no derivado puro de la ruta (ajustes #1 y #2 del plan).
  // En ruta de un proceso con flujo (misional o Compras) → ese pasa a activo. Fuera de
  // esas rutas NO se fuerza ninguno: se respeta el activo si sigue siendo válido, y si
  // el guardado ya no aplica al rol se limpia a null (nunca auto-selección).
  useEffect(() => {
    const enFlujo = flujos.find((p) =>
      p.rutas.some((r) => pathname === r || pathname.startsWith(`${r}/`)),
    );
    if (enFlujo) {
      if (procesoActivo !== enFlujo.id) setProcesoActivo(enFlujo.id);
      return;
    }
    if (procesoActivo && !flujos.some((p) => p.id === procesoActivo)) {
      setProcesoActivo(null);
    }
  }, [pathname, flujos, procesoActivo, setProcesoActivo]);

  // Utilidades de la derecha (tema, usuario, logout) — compartidas desktop/móvil.
  const utilidades = (
    <>
      <div className="hidden text-right lg:block">
        <p className="text-sm font-semibold leading-tight text-foreground">
          {usuario?.nombreCompleto ?? "—"}
        </p>
        <p className="text-xs uppercase leading-tight tracking-wide text-muted-foreground">
          {roles[0]?.replace(/_/g, " ") ?? ""}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
      >
        {iniciales}
      </div>
      <Button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Cerrar sesión"
        className="size-9 p-0"
      >
        <LogOut size={16} strokeWidth={1.5} />
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">

        {/* Misionales (básicos) — desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href={INICIO.ruta}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors",
              esInicioActiva
                ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <LayoutDashboard size={16} strokeWidth={1.5} />
            {INICIO.label}
          </Link>

          {misionales.map((m) => {
            const Icono = m.icon;
            const activoTab = procesoActivo === m.id;
            return (
              <Link
                key={m.id}
                href={m.ruta}
                onClick={() => setProcesoActivo(m.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors",
                  activoTab
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icono size={16} strokeWidth={1.5} />
                {m.label}
              </Link>
            );
          })}

          {/* Áreas (transversales) — mega-menú con el NavigationMenu instalado */}
          {areas.length > 0 && (
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    <LayoutGrid size={16} strokeWidth={1.5} className="mr-1.5" />
                    Áreas
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[540px] grid-cols-2 gap-1 p-2">
                      {areas.map((area) => {
                        const AreaIcono = area.icon;
                        return (
                          <div key={area.id} className="p-1">
                            <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              <AreaIcono size={14} strokeWidth={1.5} />
                              {area.label}
                            </p>
                            {area.items.map((it) => {
                              const ItIcono = it.icon;
                              return (
                                <NavigationMenuLink
                                  key={it.ruta}
                                  render={<Link href={it.ruta} />}
                                  data-active={esRutaActiva(it.ruta) || undefined}
                                  // Base UI deja el mega-menú abierto al hacer
                                  // clic (`closeOnClick` viene en `false`): sin
                                  // esto, elegir un área navega pero el panel se
                                  // queda tapando la pantalla a la que se fue.
                                  closeOnClick
                                >
                                  <ItIcono size={16} strokeWidth={1.5} />
                                  {it.label}
                                </NavigationMenuLink>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}

          {/* Estratégicos */}
          {estrategicos.map((e) => {
            const Icono = e.icon;
            return (
              <Link
                key={e.ruta}
                href={e.ruta}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors",
                  esRutaActiva(e.ruta)
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icono size={16} strokeWidth={1.5} />
                {e.label}
              </Link>
            );
          })}
        </nav>

        {/* Utilidades (derecha) */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">{utilidades}</div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
          >
            {mobileOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* ── Menú móvil ───────────────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="max-h-[calc(100dvh-4rem)] space-y-4 overflow-y-auto border-t border-border bg-card px-4 py-4 md:hidden">
          {misionales.length > 0 && (
            <MobileSeccion titulo="Procesos">
              {misionales.map((m) => {
                const Icono = m.icon;
                return (
                  <MobileLink
                    key={m.id}
                    href={m.ruta}
                    activo={esRutaActiva(m.ruta)}
                    onClick={() => {
                      setProcesoActivo(m.id);
                      setMobileOpen(false);
                    }}
                  >
                    <Icono size={18} strokeWidth={1.5} />
                    {m.label}
                  </MobileLink>
                );
              })}
            </MobileSeccion>
          )}

          {areas.length > 0 && (
            <MobileSeccion titulo="Áreas">
              {areas.flatMap((area) =>
                area.items.map((it) => {
                  const ItIcono = it.icon;
                  return (
                    <MobileLink
                      key={it.ruta}
                      href={it.ruta}
                      activo={esRutaActiva(it.ruta)}
                      onClick={() => setMobileOpen(false)}
                    >
                      <ItIcono size={18} strokeWidth={1.5} />
                      {it.label}
                    </MobileLink>
                  );
                }),
              )}
            </MobileSeccion>
          )}

          {estrategicos.length > 0 && (
            <MobileSeccion titulo="Gestión">
              {estrategicos.map((e) => {
                const Icono = e.icon;
                return (
                  <MobileLink
                    key={e.ruta}
                    href={e.ruta}
                    activo={esRutaActiva(e.ruta)}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icono size={18} strokeWidth={1.5} />
                    {e.label}
                  </MobileLink>
                );
              })}
            </MobileSeccion>
          )}

          <div className="flex items-center gap-2 border-t border-border pt-4">{utilidades}</div>
        </div>
      )}
    </header>
  );
}

function MobileSeccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <nav className="flex flex-col gap-0.5">{children}</nav>
    </div>
  );
}

function MobileLink({
  href,
  activo,
  onClick,
  children,
}: {
  href: string;
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        activo ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
