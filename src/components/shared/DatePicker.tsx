"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatFecha } from "@/lib/utils";

// Reason: trabajar SIEMPRE en hora local. `new Date("2026-06-24")` se parsea en UTC y, en
// zonas UTC-negativas (Colombia UTC−5), retrocede un día al mostrarlo. Por eso construimos y
// serializamos la fecha con get*/new Date(y, m, d) locales, nunca con toISOString().
function isoALocalDate(iso: string | undefined): Date | undefined {
  if (!iso) {
    return undefined;
  }
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) {
    return undefined;
  }
  return new Date(anio, mes - 1, dia);
}

function localDateAISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

interface DatePickerProps {
  // Valor en formato ISO "YYYY-MM-DD" (el que usan los formularios y la API).
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  invalido?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccione una fecha",
  invalido = false,
}: DatePickerProps) {
  const [abierto, setAbierto] = useState(false);
  const seleccionada = isoALocalDate(value);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-lg border bg-card px-3 text-left text-sm outline-none transition-colors focus:border-primary",
              invalido ? "border-destructive" : "border-border",
            )}
          >
            <CalendarDays
              size={15}
              strokeWidth={1.75}
              className="shrink-0 text-muted-foreground/70"
            />
            <span
              className={cn(
                "truncate",
                value ? "text-foreground" : "text-muted-foreground/70",
              )}
            >
              {value ? formatFecha(value) : placeholder}
            </span>
          </button>
        }
      />
      <PopoverContent align="start" className="w-auto">
        <Calendar
          mode="single"
          locale={es}
          selected={seleccionada}
          defaultMonth={seleccionada}
          onSelect={(fecha) => {
            if (fecha) {
              onChange(localDateAISO(fecha));
              setAbierto(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
