"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, ChevronRight, Loader2, LogOut, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/core/store/authStore";
import { NOMBRE_ROL, type EmpresaAccesible } from "../types/auth.types";
import { useCerrarSesion, useElegirEmpresa, useEmpresasAccesibles } from "../hooks/useAuth";

/** Sin tildes ni mayúsculas: "penalosa" encuentra "Peñalosa". */
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const iniciales = (razonSocial: string) =>
  razonSocial
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/**
 * Paso 2 de la entrada: elegir contabilidad.
 *
 * El buscador aparece a partir de seis empresas. Con menos estorba; con quince
 * —el caso de un contador— recorrer la lista con la vista es peor que escribir
 * tres letras.
 */
export function SelectorEmpresaView() {
  const usuario = useAuthStore((s) => s.usuario);
  const guardadas = useAuthStore((s) => s.empresas);
  const { data, isLoading } = useEmpresasAccesibles();
  const elegir = useElegirEmpresa();
  const cerrarSesion = useCerrarSesion();

  const [busqueda, setBusqueda] = useState("");
  const empresas: EmpresaAccesible[] = data ?? guardadas;

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return empresas;
    return empresas.filter(
      (e) => normalizar(e.razonSocial).includes(q) || e.nit.includes(q),
    );
  }, [empresas, busqueda]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Hola{usuario ? `, ${usuario.nombre.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Elige una contabilidad</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => cerrarSesion.mutate()}>
          <LogOut className="size-4" />
          Salir
        </Button>
      </div>

      {empresas.length >= 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o NIT"
            className="pl-9"
            aria-label="Buscar empresa"
          />
        </div>
      )}

      {isLoading && empresas.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : empresas.length === 0 ? (
        <SinEmpresas />
      ) : (
        <div className="flex flex-col gap-2">
          {filtradas.map((empresa) => (
            <button
              key={empresa.id}
              type="button"
              disabled={elegir.isPending}
              onClick={() => elegir.mutate(empresa.id)}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-input hover:bg-accent disabled:opacity-60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                {iniciales(empresa.razonSocial)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {empresa.razonSocial}
                </span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {empresa.nit}-{empresa.dv}
                </span>
              </span>
              <span className="hidden shrink-0 gap-1 sm:flex">
                {empresa.roles.slice(0, 2).map((rol) => (
                  <span
                    key={rol}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground"
                  >
                    {NOMBRE_ROL[rol]}
                  </span>
                ))}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}

          {filtradas.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ninguna coincide con «{busqueda}»
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Un usuario sin empresas no está roto: es el primer día de una cuenta nueva, o
 * alguien a quien todavía no le dieron acceso. Son dos situaciones distintas y
 * solo la primera tiene salida desde acá.
 */
function SinEmpresas() {
  const esAdmin = useAuthStore((s) => s.roles.includes("ADMIN_TENANT"));

  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-card px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Building2 className="size-5" />
      </span>
      <p className="text-sm font-medium">
        {esAdmin ? "Todavía no hay ninguna empresa" : "Sin acceso a ninguna empresa"}
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {esAdmin
          ? "Crea la primera para empezar a configurarla."
          : "Pídele al administrador de la cuenta que te dé acceso."}
      </p>
      {esAdmin && (
        <Link href="/configuracion/empresa-nueva" className={buttonVariants()}>
          Crear empresa
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
