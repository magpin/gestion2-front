"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { retencionesApi } from "../services/retenciones.service";
import type { PropuestaPerfil } from "../types/retenciones.types";

const fechaCorta = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * Lo que las facturas leídas dicen de los proveedores y no coincide con su
 * perfil (plan motor de retenciones, Fase 8, §8.8). Nada cambia solo: aprobar
 * abre la versión nueva del perfil desde la fecha de la factura (R-D8).
 *
 * Con `terceroId`, solo las de ese proveedor (en su ficha); sin él, todas (en
 * Contabilidad → Retenciones). No aparece si no hay ninguna.
 */
export function PropuestasPerfil({ terceroId }: { terceroId?: string }) {
  const { data: propuestas = [] } = useQuery({
    queryKey: ["retenciones", "propuestas-perfil", terceroId ?? "todas"],
    queryFn: () => retencionesApi.propuestasPerfil(terceroId),
  });
  if (propuestas.length === 0) return null;

  const lista = (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {propuestas.map((p) => (
        <Propuesta
          key={p.id}
          propuesta={p}
          conNombre={terceroId === undefined}
        />
      ))}
    </ul>
  );

  if (terceroId !== undefined) return lista;
  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-semibold">
          Cambios de proveedores por revisar ({propuestas.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que dicen sus facturas y no coincide con lo que tengo. No cambio
          nada hasta que lo apruebe: hasta entonces, calculo con lo que tengo.
        </p>
      </div>
      <div className="p-6">{lista}</div>
    </section>
  );
}

function Propuesta({
  propuesta: p,
  conNombre,
}: {
  propuesta: PropuestaPerfil;
  conNombre: boolean;
}) {
  const cliente = useQueryClient();
  const puede = useTieneRol("DIRECTOR", "CONTADOR");
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const refrescar = async () => {
    await cliente.invalidateQueries({ queryKey: ["retenciones"] });
  };
  const aprobar = useMutation({
    mutationFn: () => retencionesApi.aprobarPropuestaPerfil(p.id),
    onSuccess: async () => {
      aviso.exito("Listo: su perfil quedó con lo que dice la factura.");
      await refrescar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });
  const rechazar = useMutation({
    mutationFn: () => retencionesApi.rechazarPropuestaPerfil(p.id, motivo),
    onSuccess: async () => {
      aviso.exito("Listo: no lo vuelvo a proponer.");
      await refrescar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <li className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
      <p className="m-0 font-semibold">
        {conNombre ? `${p.tercero} · ` : ""}
        {p.referencia ? `La factura ${p.referencia}` : "Una factura"} del{" "}
        {fechaCorta(p.desde)}
      </p>
      <ul className="m-0 mt-1 list-disc pl-5 text-muted-foreground">
        {p.cambios.map((c) => (
          <li key={c.campo}>{c.texto}</li>
        ))}
      </ul>
      {puede && !rechazando && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={aprobar.isPending}
            onClick={() => aprobar.mutate()}
          >
            {aprobar.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Aprobar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setRechazando(true)}
          >
            No cambiar
          </Button>
        </div>
      )}
      {puede && rechazando && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            rechazar.mutate();
          }}
        >
          <Input
            className="max-w-md"
            placeholder="Por qué no se cambia"
            value={motivo}
            maxLength={500}
            onChange={(e) => setMotivo(e.target.value)}
            autoFocus
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={motivo.trim().length === 0 || rechazar.isPending}
          >
            No cambiar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setRechazando(false)}
          >
            Cancelar
          </Button>
        </form>
      )}
    </li>
  );
}
