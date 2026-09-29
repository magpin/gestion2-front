"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Un botón del vacío: lleva a una pantalla (`href`) o hace algo ahí mismo (`onClick`). */
export type AccionVacio = { label: string } & (
  | { onClick: () => void; href?: never }
  | { href: string; onClick?: never }
);

interface EmptyStateProps {
  titulo?: string;
  descripcion?: ReactNode;
  icon?: LucideIcon;
  /** Otro dibujo en lugar del ícono: la cara de María, por ejemplo. */
  figura?: ReactNode;
  /** El siguiente paso. Va en negro. */
  accion?: AccionVacio;
  /** Otro camino, menos usado. Va con borde. */
  accionSecundaria?: AccionVacio;
  /** Ya vive dentro de un bloque con borde: sin marco propio, para no anidar dos. */
  sinMarco?: boolean;
}

/**
 * Cuando todavía no hay nada (lienzo «Estados vacíos»).
 *
 * Cada vacío dice por qué está vacío y cuál es el siguiente paso: el ícono en
 * su círculo, el título con el punto naranja, una frase y hasta dos botones.
 * Un vacío no es un error: si la consulta falló, va `ErrorCarga`, nunca esto
 * —decir «no hay facturas» cuando no se pudieron leer es mentir—.
 */
export function EmptyState({
  titulo = "Sin datos",
  descripcion,
  icon: Icon = Inbox,
  figura,
  accion,
  accionSecundaria,
  sinMarco = false,
}: EmptyStateProps) {
  // El punto lo pone el diseño: si el título ya trae uno, no se repite.
  const texto = titulo.replace(/[.]$/, "");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        !sinMarco && "rounded-3xl border border-border bg-card shadow-sm",
      )}
    >
      {figura ?? (
        <span className="grid size-14 place-items-center rounded-full bg-muted text-foreground">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      )}
      <div className="max-w-sm">
        <p className="text-lg font-semibold tracking-[-0.01em] text-foreground">
          {texto}
          {!/[?!]$/.test(texto) && <span className="text-brand">.</span>}
        </p>
        {descripcion && <p className="mt-1.5 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {(accion || accionSecundaria) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {accion && <BotonVacio accion={accion} principal />}
          {accionSecundaria && <BotonVacio accion={accionSecundaria} />}
        </div>
      )}
    </div>
  );
}

function BotonVacio({ accion, principal = false }: { accion: AccionVacio; principal?: boolean }) {
  const variante = principal ? "default" : "outline";
  const clases = "h-11 rounded-xl px-5 font-semibold";
  if (accion.href !== undefined) {
    return (
      <Link href={accion.href} className={cn(buttonVariants({ variant: variante }), clases)}>
        {accion.label}
      </Link>
    );
  }
  return (
    <Button variant={variante} className={clases} onClick={accion.onClick}>
      {accion.label}
    </Button>
  );
}
