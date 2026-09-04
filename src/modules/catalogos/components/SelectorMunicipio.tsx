"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { geografiaApi } from "../services/catalogos.service";

interface Props {
  id: string;
  valor: string | null;
  onCambio: (codigo: string, nombre: string) => void;
  invalido?: boolean;
  /** La escala la decide la pantalla: el asistente y terceros no miden igual. */
  className?: string;
}

/**
 * Buscador de municipio contra el catálogo DANE.
 *
 * No es un `select` con 1.122 opciones: buscar es la única forma usable de
 * elegir en una lista de ese tamaño. La consulta va al servidor porque el
 * catálogo pesa demasiado para mandarlo entero al navegador, y ahí la búsqueda
 * ignora tildes —"medellin" encuentra "Medellín"—.
 */
export function SelectorMunicipio({
  id,
  valor,
  onCambio,
  invalido,
  className,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["municipios", busqueda],
    queryFn: () => geografiaApi.municipios(busqueda),
    enabled: abierto,
    staleTime: 5 * 60_000,
  });

  const { data: elegido } = useQuery({
    queryKey: ["municipio", valor],
    queryFn: async () => {
      const lista = await geografiaApi.municipios();
      return lista.find((m) => m.codigo === valor) ?? null;
    },
    enabled: Boolean(valor),
    staleTime: 5 * 60_000,
  });

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        id={id}
        aria-invalid={invalido || undefined}
        className={cn(
          "w-full justify-between font-normal aria-invalid:border-danger",
          className
        )}
      >
        <span className={valor ? "" : "text-muted-foreground"}>
          {elegido
            ? `${elegido.nombre} · ${elegido.departamento_nombre}`
            : "Buscar municipio"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Escribe al menos tres letras"
            className="h-9"
            aria-label="Buscar municipio"
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {isFetching && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}

          {!isFetching &&
            (data ?? []).map((m) => (
              <button
                key={m.codigo}
                type="button"
                onClick={() => {
                  onCambio(m.codigo, m.nombre);
                  setAbierto(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Check
                  className={`size-3.5 ${m.codigo === valor ? "opacity-100" : "opacity-0"}`}
                />
                <span className="flex-1 truncate">{m.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {m.departamento_nombre}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {m.codigo}
                </span>
              </button>
            ))}

          {!isFetching && (data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin resultados
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
