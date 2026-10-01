"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface OpcionSelect {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: OpcionSelect[];
  placeholder?: string;
  invalido?: boolean;
  disabled?: boolean;
}

// Select (Base UI) — reemplazo directo de los <select> nativos. Integra con
// React Hook Form vía Controller: value={field.value} onChange={field.onChange}.
export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Seleccione…",
  invalido = false,
  disabled = false,
}: SelectFieldProps) {
  const [abierto, setAbierto] = useState(false);

  // Reason: el menú se renderiza en un portal (fuera del modal). Al hacer scroll
  // el campo se acerca al borde y el menú flotaría fuera del modal; lo cerramos
  // en cualquier scroll de contenedor (capture) SALVO el del propio menú.
  useEffect(() => {
    if (!abierto) return;
    const cerrarEnScroll = (evento: Event) => {
      const objetivo = evento.target;
      if (
        objetivo instanceof Element &&
        objetivo.closest("[data-slot=select-content]")
      ) {
        return;
      }
      setAbierto(false);
    };
    window.addEventListener("scroll", cerrarEnScroll, true);
    return () => window.removeEventListener("scroll", cerrarEnScroll, true);
  }, [abierto]);

  return (
    <Select
      open={abierto}
      onOpenChange={setAbierto}
      value={value}
      onValueChange={(nuevo) =>
        onChange(typeof nuevo === "string" ? nuevo : String(nuevo ?? ""))
      }
      items={options}
      disabled={disabled}
    >
      <SelectTrigger
        aria-invalid={invalido || undefined}
        className={cn("h-10 w-full", invalido && "border-destructive")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opcion) => (
          <SelectItem key={opcion.value} value={opcion.value}>
            {opcion.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
