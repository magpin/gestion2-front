"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Loader2, Plus, Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { plataformaService } from "../services/plataforma.service";
import type { EstadoCuenta } from "../types/plataforma.types";
import { CromoPlataforma } from "../components/CromoPlataforma";

/** El color va en el punto, no en el texto: el ámbar no alcanza contraste como texto pequeño. */
const PUNTO: Record<EstadoCuenta, string> = {
  ACTIVO: "bg-success",
  MOROSO: "bg-warning",
  SUSPENDIDO: "bg-warning",
  CANCELADO: "bg-muted-foreground",
};

const NOMBRE_ESTADO: Record<EstadoCuenta, string> = {
  ACTIVO: "Activa",
  MOROSO: "En mora",
  SUSPENDIDO: "Suspendida",
  CANCELADO: "Cancelada",
};

export function CuentasView() {
  const [busqueda, setBusqueda] = useState("");
  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: ["plataforma", "cuentas", busqueda],
    queryFn: () => plataformaService.cuentas(busqueda || undefined),
  });

  const activas = cuentas.filter((c) => c.estado === "ACTIVO").length;
  const empresas = cuentas.reduce((n, c) => n + c.empresas, 0);

  return (
    <CromoPlataforma>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Cuentas</h1>
            <p className="mt-0.5 font-mono text-sm text-muted-foreground">
              {cuentas.length} · {activas} activas · {empresas} empresas
            </p>
          </div>
          <Link href="/plataforma/cuentas/nueva" className={buttonVariants()}>
            <Plus className="size-4" />
            Nueva cuenta
          </Link>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o slug"
            className="pl-9"
            aria-label="Buscar cuenta"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : cuentas.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            {busqueda ? `Ninguna coincide con «${busqueda}»` : "Todavía no hay cuentas"}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {cuentas.map((c) => (
              <Link
                key={c.id}
                href={`/plataforma/cuentas/${c.id}`}
                className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.nombre}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{c.slug}</span>
                </span>

                <span className="hidden w-28 shrink-0 sm:block">
                  <span className="block text-xs text-muted-foreground">Plan</span>
                  <span className="block text-sm">{c.plan.toLowerCase()}</span>
                </span>

                <span className="hidden w-24 shrink-0 md:flex md:flex-col">
                  <span className="flex items-center gap-1.5 font-mono text-sm">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    {c.empresas}/{c.maxEmpresas}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-sm">
                    <Users className="size-3.5 text-muted-foreground" />
                    {c.usuarios}/{c.maxUsuarios}
                  </span>
                </span>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold">
                  <span className={`size-1.5 rounded-full ${PUNTO[c.estado]}`} />
                  {NOMBRE_ESTADO[c.estado]}
                </span>

                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </CromoPlataforma>
  );
}
