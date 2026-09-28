"use client";

import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, LogOut, Plus } from "lucide-react";

import { BotonTema } from "@/components/shared/BotonTema";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthStore } from "@/core/store/authStore";
import { NOMBRE_ROL } from "@/modules/auth/types/auth.types";
import {
  useCerrarSesion,
  useElegirEmpresa,
  useEmpresasAccesibles,
} from "@/modules/auth/hooks/useAuth";

/**
 * La barra del área de trabajo.
 *
 * Lo primero que muestra es en qué contabilidad se está parado. En un sistema
 * donde una persona lleva quince empresas, equivocarse de empresa es registrar
 * una compra en los libros de otro cliente — y eso se corrige anulando, no
 * editando.
 *
 * Y es desde acá que se cambia de una a otra: un menú, sin salir de donde se
 * está. Reemplaza al selector de página entera que había antes.
 *
 * Es `sticky`: el contenido de un módulo puede ser largo (un kardex, un libro)
 * y la empresa en la que se está parado tiene que quedar a la vista siempre.
 */
export function BarraSuperior() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const empresaId = useAuthStore((s) => s.empresaId);
  const empresas = useAuthStore((s) => s.empresas);
  const roles = useAuthStore((s) => s.roles);
  const cerrarSesion = useCerrarSesion();
  const elegir = useElegirEmpresa();
  // La lista vigente: la del login puede haber cambiado —otra empresa creada,
  // un acceso nuevo—.
  const { data: accesibles } = useEmpresasAccesibles();
  const lista = accesibles ?? empresas;
  // Crear empresas es de quien administra la cuenta.
  const puedeCrear = roles.includes("ADMIN_TENANT");

  const empresa = lista.find((e) => e.id === empresaId);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
      <SidebarTrigger className="-ml-1" title="Mostrar u ocultar el menú (Ctrl+B)" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-5 data-vertical:self-center" />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={elegir.isPending}
          render={
            <button
              type="button"
              aria-label="Cambiar de empresa"
              className="flex min-w-0 items-center gap-2.5 rounded-md border border-border bg-background px-3 py-1.5 text-left transition-colors hover:border-input disabled:opacity-60"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                <Building2 className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight">
                  {elegir.isPending ? "Abriendo…" : (empresa?.razonSocial ?? "Tu empresa")}
                </span>
                {empresa && (
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    NIT {empresa.nit}-{empresa.dv}
                  </span>
                )}
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-32px)]">
          {/* La etiqueta es de Base UI (GroupLabel): fuera de su grupo tumba
              la página entera (error #31). */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tus empresas</DropdownMenuLabel>
            {lista.map((e) => (
              <DropdownMenuItem
                key={e.id}
                onClick={() => {
                  if (e.id !== empresaId) elegir.mutate(e.id);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.razonSocial}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    NIT {e.nit}-{e.dv}
                  </span>
                </span>
                {e.id === empresaId && <Check className="size-4 shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {puedeCrear && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/configuracion/empresa-nueva")}>
                <Plus className="size-4" />
                Crear otra empresa
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-3">
        <BotonTema />
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
