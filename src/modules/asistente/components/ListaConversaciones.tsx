"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { agruparPorFecha, detalleDeConversacion } from "../lib/conversacion";
import type { ConversacionEnLista } from "../types/conversacion.types";

/**
 * La columna de la izquierda: todas las conversaciones de quien pregunta.
 * Del prototipo `docs/mocks/asistente-ia-diseno/Main.dc.html`: 250 px, «Nueva
 * conversación» arriba y la lista agrupada por fecha.
 *
 * Solo se escribe en la vigente —la marcada «Actual»—; las demás se abren para
 * leerlas. El prototipo muestra además cuántos documentos se asentaron en cada
 * una: eso no existe, porque conversar todavía no asienta nada.
 *
 * `seleccionada` en `null` es la vigente.
 */
export function ListaConversaciones({
  conversaciones,
  seleccionada,
  ahora,
  nuevaDeshabilitada,
  alElegir,
  alNueva,
  className,
}: {
  conversaciones: readonly ConversacionEnLista[];
  seleccionada: string | null;
  ahora: Date;
  nuevaDeshabilitada: boolean;
  alElegir: (id: string | null) => void;
  alNueva: () => void;
  className?: string;
}) {
  const grupos = agruparPorFecha(conversaciones, ahora);

  return (
    <aside
      aria-label="Conversaciones"
      className={cn(
        "flex w-[250px] shrink-0 flex-col gap-3.5 overflow-y-auto border-r border-border bg-muted px-3 py-[18px]",
        className,
      )}
    >
      <button
        type="button"
        onClick={alNueva}
        disabled={nuevaDeshabilitada}
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[0.6rem] border border-input bg-card text-[13px] font-medium transition-colors hover:border-foreground disabled:opacity-50 disabled:hover:border-input"
      >
        <Plus className="size-[15px]" strokeWidth={2} aria-hidden="true" />
        Nueva conversación
      </button>

      {grupos.length === 0 && (
        <p className="m-0 px-3 text-xs leading-normal text-muted-foreground">
          Todavía no conversaste. Lo que preguntes queda acá, para volver a
          leerlo.
        </p>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.rotulo} className="flex flex-col gap-1">
          <span className="px-3 py-1 font-mono text-[10px] tracking-[1.2px] text-muted-foreground uppercase">
            {grupo.rotulo}
          </span>
          {grupo.conversaciones.map((c) => {
            const vigente = c.archivada_en === null;
            const activa = vigente ? seleccionada === null : seleccionada === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-current={activa ? "true" : undefined}
                onClick={() => alElegir(vigente ? null : c.id)}
                className={cn(
                  "flex flex-col gap-[3px] rounded-[0.6rem] border px-3 py-2.5 text-left transition-colors",
                  activa
                    ? "border-border bg-card"
                    : "border-transparent hover:bg-card/60",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium">{c.titulo}</span>
                  {vigente && (
                    <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-px text-[10px] font-medium text-brand-text">
                      Actual
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {detalleDeConversacion(c, ahora)}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
