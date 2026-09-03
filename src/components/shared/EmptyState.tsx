"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  titulo?: string;
  descripcion?: string;
  icon?: LucideIcon;
  accion?: { label: string; onClick: () => void };
  /** Ya vive dentro de un bloque con borde: sin marco propio, para no anidar dos. */
  sinMarco?: boolean;
}

export function EmptyState({
  titulo = "Sin datos",
  descripcion,
  icon: Icon = Inbox,
  accion,
  sinMarco = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-10 text-center",
        !sinMarco && "rounded-2xl border border-border bg-card shadow-sm",
      )}
    >
      <Icon size={32} strokeWidth={1.5} className="text-muted-foreground/70" />
      <div>
        <p className="font-medium text-foreground">{titulo}</p>
        {descripcion && (
          <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {accion && (
        <Button onClick={accion.onClick}>
          {accion.label}
        </Button>
      )}
    </div>
  );
}
