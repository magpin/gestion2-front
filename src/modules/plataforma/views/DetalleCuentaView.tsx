"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronLeft, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CromoPlataforma } from "../components/CromoPlataforma";
import { plataformaService } from "../services/plataforma.service";
import { NOMBRE_ACCION, type EstadoCuenta } from "../types/plataforma.types";

const PUNTO: Record<EstadoCuenta, string> = {
  ACTIVO: "bg-success",
  MOROSO: "bg-warning",
  SUSPENDIDO: "bg-warning",
  CANCELADO: "bg-muted-foreground",
};

export function DetalleCuentaView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["plataforma", "cuenta", id],
    queryFn: () => plataformaService.cuenta(id),
  });

  const cambiar = useMutation({
    mutationFn: (datos: Record<string, unknown>) => plataformaService.editarCuenta(id, datos),
    onMutate: () => setGuardando(true),
    onSettled: async () => {
      setGuardando(false);
      await queryClient.invalidateQueries({ queryKey: ["plataforma"] });
    },
  });

  if (isLoading || !data) {
    return (
      <CromoPlataforma>
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </CromoPlataforma>
    );
  }

  const { cuenta, empresas, usuarios, bitacora } = data;

  return (
    <CromoPlataforma>
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/plataforma"
            className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            Cuentas
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-semibold tracking-tight">{cuenta.nombre}</h1>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{cuenta.slug}</p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={cuenta.plan}
                onValueChange={(v) => v && cambiar.mutate({ plan: v })}
              >
                <SelectTrigger className="w-40" aria-label="Plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASICO">Básico</SelectItem>
                  <SelectItem value="PROFESIONAL">Profesional</SelectItem>
                  <SelectItem value="CONTADOR">Contador</SelectItem>
                  <SelectItem value="EMPRESARIAL">Empresarial</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={cuenta.estado}
                onValueChange={(v) => v && cambiar.mutate({ estado: v })}
              >
                <SelectTrigger className="w-40" aria-label="Estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVO">Activa</SelectItem>
                  <SelectItem value="MOROSO">En mora</SelectItem>
                  <SelectItem value="SUSPENDIDO">Suspendida</SelectItem>
                  <SelectItem value="CANCELADO">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              {guardando && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Tarjeta rotulo="Estado">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className={`size-2 rounded-full ${PUNTO[cuenta.estado]}`} />
              {cuenta.estado.toLowerCase()}
            </span>
          </Tarjeta>
          <Tarjeta rotulo="Empresas">
            <span className="font-mono text-xl font-semibold">
              {cuenta.empresas}
              <span className="text-sm text-muted-foreground"> / {cuenta.maxEmpresas}</span>
            </span>
          </Tarjeta>
          <Tarjeta rotulo="Usuarios">
            <span className="font-mono text-xl font-semibold">
              {cuenta.usuarios}
              <span className="text-sm text-muted-foreground"> / {cuenta.maxUsuarios}</span>
            </span>
          </Tarjeta>
        </div>

        <Seccion titulo="Empresas" icono={<Building2 className="size-4" />}>
          {empresas.length === 0 ? (
            <Vacio texto="Sin empresas" />
          ) : (
            empresas.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.razon_social}</span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    NIT {e.nit}-{e.dv}
                    {e.sectores.length > 0 && ` · ${e.sectores.join(', ').toLowerCase()}`}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold">
                  {e.grupo_niif?.replace("_", " ") ?? "sin marco"}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {e.sedes} sede{e.sedes === 1 ? "" : "s"}
                </span>
              </div>
            ))
          )}
        </Seccion>

        <Seccion titulo="Usuarios" icono={<Users className="size-4" />}>
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{u.nombre_completo}</span>
                <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {u.es_admin && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                    Admin
                  </span>
                )}
                {u.roles.map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold"
                  >
                    {r.toLowerCase()}
                  </span>
                ))}
              </span>
              <span className="hidden w-28 shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:block">
                {u.ultimo_acceso_en ? u.ultimo_acceso_en.slice(0, 10) : "nunca entró"}
              </span>
            </div>
          ))}
        </Seccion>

        <Seccion titulo="Bitácora">
          {bitacora.length === 0 ? (
            <Vacio texto="Sin movimientos" />
          ) : (
            bitacora.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
              >
                <span className="flex-1 text-sm">
                  {NOMBRE_ACCION[b.accion] ?? b.accion}
                  <span className="text-muted-foreground"> · {b.admin}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {b.ocurrido_en.slice(0, 16).replace("T", " ")}
                </span>
              </div>
            ))
          )}
        </Seccion>
      </div>
    </CromoPlataforma>
  );
}

function Tarjeta({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <span className="block text-xs text-muted-foreground">{rotulo}</span>
      <span className="mt-1 block">{children}</span>
    </div>
  );
}

function Seccion({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icono}
        {titulo}
      </h2>
      <div className="overflow-hidden rounded-lg border border-border bg-card">{children}</div>
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{texto}</p>;
}
