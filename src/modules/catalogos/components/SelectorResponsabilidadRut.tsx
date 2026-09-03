"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { rutApi } from "../services/catalogos.service";

interface Props {
  id: string;
  valor: number | null;
  onCambio: (codigo: number, descripcion: string) => void;
  /** Códigos ya registrados: se marcan y no se dejan elegir dos veces. */
  yaRegistrados?: number[];
  invalido?: boolean;
}

/**
 * Buscador de la casilla 53 del RUT — Responsabilidades, Calidades y Atributos.
 *
 * Sale entero de `responsabilidad_tributaria`, que son cuarenta y ocho códigos
 * vigentes del instructivo de la DIAN. Ninguno está escrito en el cliente: una
 * lista repetida a mano se desincroniza del catálogo el día que la DIAN agrega
 * un código, y eso ya pasó con la lista de condiciones tributarias.
 *
 * La búsqueda va al servidor y mira número y descripción a la vez: quien tiene
 * el RUT delante escribe "48", y quien no, escribe "ventas". El número busca por
 * prefijo —"4" trae el 4, el 41, el 42 y el 48— porque son pocos y acertar el
 * código entero no debería ser requisito para encontrarlo.
 */
export function SelectorResponsabilidadRut({
  id,
  valor,
  onCambio,
  yaRegistrados = [],
  invalido,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["responsabilidades-rut", busqueda],
    queryFn: () => rutApi.responsabilidades({ q: busqueda || undefined }),
    enabled: abierto,
    staleTime: 10 * 60_000,
  });

  // La elegida se busca en la lista completa y no en el resultado filtrado: si
  // no, al escribir en el buscador el botón se quedaría sin su etiqueta.
  const { data: todas } = useQuery({
    queryKey: ["responsabilidades-rut", ""],
    queryFn: () => rutApi.responsabilidades(),
    staleTime: 60 * 60_000,
  });
  const elegida = todas?.find((r) => r.codigo === valor);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        id={id}
        aria-invalid={invalido || undefined}
        className="w-full justify-between font-normal aria-invalid:border-danger"
      >
        <span className={`truncate ${elegida ? "" : "text-muted-foreground"}`}>
          {elegida ? (
            <>
              <span className="font-mono">{elegida.codigo}</span> · {elegida.descripcion}
            </>
          ) : (
            "Buscar responsabilidad del RUT"
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Número o descripción: 48, ventas…"
            className="h-9"
            aria-label="Buscar responsabilidad del RUT"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {isFetching && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}

          {!isFetching &&
            (data ?? []).map((r) => {
              const registrada = yaRegistrados.includes(r.codigo);
              return (
                <button
                  key={r.codigo}
                  type="button"
                  disabled={registrada}
                  onClick={() => {
                    onCambio(r.codigo, r.descripcion);
                    setAbierto(false);
                  }}
                  className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  <Check
                    className={`mt-0.5 size-3.5 shrink-0 ${
                      r.codigo === valor || registrada ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-xs">{r.codigo}</span>
                      {/* Solo seis de las cuarenta y ocho viajan en el XML de la
                          factura. Saber cuáles evita buscarlo en el anexo. */}
                      {r.codigo_dian_fe && (
                        <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                          {r.codigo_dian_fe}
                        </span>
                      )}
                      {registrada && (
                        <span className="text-[10px] text-muted-foreground">ya registrada</span>
                      )}
                    </span>
                    <span className="block">{r.descripcion}</span>
                  </span>
                </button>
              );
            })}

          {!isFetching && (data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
