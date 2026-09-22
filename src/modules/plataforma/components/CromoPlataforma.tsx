"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookText,
  Building2,
  Home,
  Layers,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { plataformaService, sesionPlataforma } from "../services/plataforma.service";
import { BuscadorGlobal } from "./BuscadorGlobal";

/**
 * El marco de la administración del producto.
 *
 * Se distingue a propósito del área de trabajo del cliente: quien administra
 * entra por el mismo login y sale de cuentas ajenas, y confundir en cuál de
 * los dos sistemas está parado es cómo se suspende al cliente equivocado. Por
 * eso el riel oscuro con «Administración», siempre a la vista.
 *
 * Las secciones son las de `docs/planes/plataforma-consola.md`.
 */
const SECCIONES: { href: string; texto: string; icono: LucideIcon }[] = [
  { href: "/plataforma", texto: "Inicio", icono: Home },
  { href: "/plataforma/cuentas", texto: "Cuentas", icono: Building2 },
  { href: "/plataforma/consumo-ia", texto: "Consumo de IA", icono: Sparkles },
  { href: "/plataforma/planes", texto: "Planes", icono: Layers },
  { href: "/plataforma/bitacora", texto: "Bitácora", icono: BookText },
  { href: "/plataforma/sistema", texto: "Sistema", icono: Activity },
  { href: "/plataforma/administradores", texto: "Administradores", icono: ShieldCheck },
];

const Buscar = createContext<() => void>(() => {});

/** Abre la búsqueda global desde cualquier pantalla de la consola. */
export const useAbrirBuscador = () => useContext(Buscar);

export function CromoPlataforma({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!sesionPlataforma.token()) {
      router.replace("/login");
      return;
    }
    plataformaService
      .yo()
      .then((a) => setEmail(a.email))
      .catch(() => router.replace("/login"));
  }, [router]);

  // Ctrl K (o ⌘K) desde cualquier lado.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscando(true);
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const salir = () => {
    sesionPlataforma.cerrar();
    router.replace("/login");
  };

  const activa = (href: string) =>
    href === "/plataforma" ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);

  const riel = (
    <Riel
      email={email}
      activa={activa}
      alSalir={salir}
      alNavegar={() => setMenu(false)}
    />
  );

  return (
    <Buscar.Provider value={() => setBuscando(true)}>
      <div className="flex min-h-dvh bg-background text-foreground">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 lg:block">{riel}</aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* En celular el riel se vuelve una barra con menú. */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-rail px-4 text-rail-foreground lg:hidden">
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-label="Abrir el menú"
              className="-ml-2 grid size-10 place-items-center rounded-lg hover:bg-white/10"
            >
              <Menu className="size-5" />
            </button>
            <Marca />
            <button
              type="button"
              onClick={() => setBuscando(true)}
              aria-label="Buscar"
              className="ml-auto grid size-10 place-items-center rounded-lg hover:bg-white/10"
            >
              <Search className="size-5" />
            </button>
          </header>

          <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
            {children}
          </main>
        </div>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 border-0 bg-rail p-0 text-rail-foreground"
        >
          <SheetTitle className="sr-only">Menú de la consola</SheetTitle>
          {riel}
        </SheetContent>
      </Sheet>

      <BuscadorGlobal abierto={buscando} alCerrar={() => setBuscando(false)} />
    </Buscar.Provider>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-6 shrink-0 rounded-md bg-brand" aria-hidden />
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold">ERP Gestión</span>
        <span className="text-xs text-rail-muted">Administración</span>
      </div>
    </div>
  );
}

function Riel({
  email,
  activa,
  alSalir,
  alNavegar,
}: {
  email: string | null;
  activa: (href: string) => boolean;
  alSalir: () => void;
  alNavegar: () => void;
}) {
  return (
    <nav
      aria-label="Consola de administración"
      className="flex h-full flex-col gap-7 bg-rail px-3 py-5 text-rail-foreground"
    >
      <div className="px-2 pt-1">
        <Marca />
      </div>

      <div className="flex flex-col gap-0.5">
        {SECCIONES.map(({ href, texto, icono: Icono }) => {
          const aca = activa(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={alNavegar}
              aria-current={aca ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                aca
                  ? "bg-white/10 text-rail-foreground"
                  : "text-rail-muted hover:bg-white/5 hover:text-rail-foreground",
              )}
            >
              <Icono className="size-[18px]" strokeWidth={1.75} aria-hidden />
              <span>{texto}</span>
              {aca && <span className="ml-auto size-1.5 rounded-full bg-brand" aria-hidden />}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 border-t border-rail-line px-2 pt-4">
        {email && <span className="truncate text-[13px] text-rail-muted">{email}</span>}
        <button
          type="button"
          onClick={alSalir}
          className="h-8 self-start rounded-lg border border-rail-line px-3 text-[13px] text-rail-foreground hover:bg-white/10"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
