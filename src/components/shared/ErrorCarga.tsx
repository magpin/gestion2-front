"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { explicarError } from "@/lib/errores";
import { cn } from "@/lib/utils";

/**
 * Cuando una pantalla no se pudo cargar (lienzo «Estados de error»): qué
 * pasó, en palabras simples, y qué hacer. Nunca un código solo.
 *
 * El texto lo arma `explicarError(…, "cargar")`, el mismo que usa el aviso
 * global, así que dice igual lo mismo en toda la app. La consulta que muestra
 * esto lleva `meta: { silencioso: true }`: si no, además de este bloque se
 * abriría la ventana del aviso global, y serían dos avisos del mismo error.
 */
export function ErrorCarga({
  error,
  onReintentar,
  titulo,
  sinMarco = false,
}: {
  error: unknown;
  /** Vuelve a pedir los datos. Normalmente `() => consulta.refetch()`. */
  onReintentar?: () => Promise<unknown> | void;
  /** Qué se estaba cargando, si el título del servidor no alcanza: «No se pudieron leer las facturas». */
  titulo?: string;
  sinMarco?: boolean;
}) {
  // Sin el error en la mano (un componente viejo que solo sabe que falló), no
  // se adivina la causa: se dice lo que sí se sabe.
  const explicado =
    error === undefined
      ? {
          titulo: "No se pudieron cargar los datos",
          queHacer: "Tocá Reintentar. Si sigue igual, avisale a quien administra el sistema.",
        }
      : explicarError(error, "cargar");
  const [reintentando, setReintentando] = useState(false);

  const reintentar = async () => {
    if (!onReintentar) return;
    setReintentando(true);
    try {
      await onReintentar();
    } finally {
      setReintentando(false);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-4 px-6 py-6",
        !sinMarco && "rounded-3xl border border-danger/30 bg-card shadow-sm",
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-danger/10 text-danger">
        <TriangleAlert className="size-5" />
      </span>
      <div>
        <p className="text-lg font-semibold tracking-[-0.01em]">{titulo ?? explicado.titulo}</p>
        {titulo !== undefined && explicado.titulo !== titulo && (
          <p className="mt-1 text-sm font-medium">{explicado.titulo}</p>
        )}
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{explicado.queHacer}</p>
      </div>
      {onReintentar && (
        <div>
          <Button className="h-11 gap-2 rounded-xl px-5 font-semibold" onClick={() => void reintentar()} disabled={reintentando}>
            {reintentando && <Loader2 className="size-4 animate-spin" />}
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Para las consultas que muestran su error con `ErrorCarga`: así no se abre
 * también el aviso global (`providers.tsx`).
 */
export const SILENCIOSO = { silencioso: true } as const;
