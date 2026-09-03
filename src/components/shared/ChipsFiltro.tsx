"use client";

import { Eye, EyeOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface OpcionChip<T extends string> {
  id: T;
  label: string;
}

interface ChipsFiltroProps<T extends string> {
  opciones: OpcionChip<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Qué se está filtrando. Lo lee un lector de pantalla antes de la lista. */
  etiqueta: string;
}

/**
 * Los chips de filtro de una tabla, de un solo color.
 *
 * Lo que distingue al activo es que se **llena** —borde primario y fondo
 * menta—, no el tono. Con un color por opción, siete chips compiten entre sí y
 * ninguno señala nada; con uno solo, el que está puesto se ve de lejos.
 *
 * Van dentro del bloque de su tabla, vía la prop `barra` de `DataTable`: sueltos
 * en la página se leen como botones de la pantalla y no como controles de esa
 * tabla en concreto.
 */
export function ChipsFiltro<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
}: ChipsFiltroProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={etiqueta}>
      {opciones.map((opcion) => {
        const activo = opcion.id === valor;
        return (
          <button
            key={opcion.id}
            type="button"
            onClick={() => onChange(opcion.id)}
            aria-pressed={activo}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              activo
                ? "border-primary bg-secondary font-semibold text-secondary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {opcion.label}
          </button>
        );
      })}
    </div>
  );
}

interface AlternarFiltroProps {
  activo: boolean;
  onChange: (activo: boolean) => void;
  /** Lo que hace el clic cuando está apagado. */
  mostrar: string;
  /** Lo que hace el clic cuando está encendido. */
  ocultar: string;
}

/**
 * El interruptor que acompaña a los chips —mostrar u ocultar los anulados—.
 *
 * Va aparte del grupo porque no filtra lo mismo: cambia qué se **incluye**, no
 * qué se busca. Y es un botón y no una casilla para que se lea como el resto de
 * los controles de la barra.
 *
 * El rótulo dice lo que va a pasar al hacer clic, no en qué estado está: un
 * botón fijo que diga «mostrar anulados» mientras ya los está mostrando obliga
 * a mirar el relleno para saber en qué quedó.
 */
export function AlternarFiltro({ activo, onChange, mostrar, ocultar }: AlternarFiltroProps) {
  const Icono = activo ? EyeOff : Eye;
  return (
    // Mismo `Button` que «Cobrar» o «Nuevo producto»: en la barra vive al lado
    // de ellos y tiene que pesar igual.
    <Button className="gap-2" onClick={() => onChange(!activo)} aria-pressed={activo}>
      <Icono size={16} strokeWidth={1.75} aria-hidden="true" />
      {activo ? ocultar : mostrar}
    </Button>
  );
}

/** El marco de la barra: chips a la izquierda, lo que acompañe a la derecha. */
export function BarraFiltros({
  children,
  derecha,
}: {
  children: React.ReactNode;
  derecha?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {children}
      {derecha}
    </div>
  );
}

/**
 * El buscador de la tabla, dentro de su barra.
 *
 * Va acá y no en el encabezado de la pantalla porque busca en ESTA tabla, no en
 * el módulo: sube con los filtros y baja con ellos.
 */
export function BuscadorFiltro({
  valor,
  onChange,
  placeholder = "Buscar…",
}: {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search
        size={16}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        className="h-10 w-full pl-9 sm:w-56"
      />
    </div>
  );
}
