"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BusquedaConfig {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}

interface PageHeaderProps {
  titulo: string;
  /** Línea corta encima del título: en qué área está parada la persona. */
  eyebrow?: string;
  busqueda?: BusquedaConfig;
  acciones?: ReactNode;
  /**
   * Lo que va DEBAJO del título: las pestañas de un módulo que agrupa varios.
   * Van acá y no encima, porque el título dice dónde estás parado y las
   * pestañas son una decisión que se toma después de saberlo.
   */
  pestanas?: ReactNode;
}

// PageHeader — antetítulo opcional, título, pestañas, buscador y acciones.
//
// Sin subtítulo: el nombre de la pantalla basta, y la frase de debajo repetía lo
// que el panel de proceso o la propia tabla ya dicen.
export function PageHeader({
  titulo,
  eyebrow,
  busqueda,
  acciones,
  pestanas,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-sm font-medium text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{titulo}</h1>
        {pestanas && <div className="mt-4">{pestanas}</div>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {busqueda && (
          <div className="relative">
            <Search
              size={16}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={busqueda.valor}
              onChange={(evento) => busqueda.onChange(evento.target.value)}
              placeholder={busqueda.placeholder ?? "Buscar…"}
              className="h-10 w-full pl-9 sm:w-64"
            />
          </div>
        )}
        {acciones}
      </div>
    </div>
  );
}
