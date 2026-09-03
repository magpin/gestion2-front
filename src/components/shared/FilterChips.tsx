"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (id: string) => void;
  onLimpiar?: () => void;
  className?: string;
}

// FilterChips — chips removibles de filtros activos.
export function FilterChips({ chips, onRemove, onLimpiar, className }: FilterChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted py-1 pl-3 pr-1.5 text-xs text-foreground"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.id)}
            aria-label={`Quitar filtro ${chip.label}`}
            className="flex size-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </span>
      ))}

      {onLimpiar && chips.length > 1 && (
        <button
          type="button"
          onClick={onLimpiar}
          className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}
