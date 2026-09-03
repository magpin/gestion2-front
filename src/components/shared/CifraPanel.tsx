"use client";

import { cn } from "@/lib/utils";

interface CifraPanelProps {
  etiqueta: string;
  valor: number | string;
  /** Rojo: hay algo que atender. */
  alarma?: boolean;
  /** Si la cifra lleva a alguna parte —un filtro, una pantalla—, es botón. */
  onClick?: () => void;
}

/**
 * Una cifra dentro del panel de un módulo.
 *
 * Es el equivalente del nodo en una línea de proceso, para los módulos que no
 * tienen proceso: dice cómo está la cosa antes de que nadie toque nada.
 *
 * Con `onClick` es `<button>`; sin él, texto plano — nunca `<button disabled>`,
 * que no recibe foco y desaparece para un lector de pantalla.
 */
export function CifraPanel({ etiqueta, valor, alarma = false, onClick }: CifraPanelProps) {
  const contenido = (
    <>
      <span className="text-sm text-muted-foreground">{etiqueta}</span>
      <span
        className={cn(
          "font-mono text-2xl font-semibold tabular-nums",
          alarma ? "text-destructive" : "text-foreground",
        )}
      >
        {valor}
      </span>
    </>
  );

  const clases = "flex flex-col gap-1 rounded-xl border border-border p-4 text-left";

  if (!onClick) return <div className={clases}>{contenido}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        clases,
        "transition-colors hover:border-primary/50 hover:bg-muted/40",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      {contenido}
    </button>
  );
}
