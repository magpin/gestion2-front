"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { conceptosApi } from "../services/conceptos.service";
import type { Concepto, TipoConcepto } from "../types/conceptos.types";

/**
 * Elegir un concepto, nunca una cuenta. Muestra los activos de los tipos
 * pedidos, por grupo, sin los automáticos (esos los usa el sistema solo) y
 * sin los que todavía no tienen cuenta.
 *
 * `filtro` deja afinar más: Pagos sin factura solo ofrece lo que se puede
 * pagar sin factura.
 */
export function SelectorConcepto({
  id,
  tipos,
  valor,
  onElegir,
  filtro,
  invalido,
}: {
  id?: string;
  tipos: TipoConcepto[];
  valor: Concepto | null;
  onElegir: (c: Concepto) => void;
  filtro?: (c: Concepto) => boolean;
  invalido?: boolean;
}) {
  const { data: conceptos = [] } = useQuery({
    queryKey: ["conceptos", false],
    queryFn: () => conceptosApi.listar(),
    staleTime: 60_000,
  });
  const opciones = conceptos.filter(
    (c) =>
      tipos.includes(c.tipo) &&
      !c.automatico &&
      c.activo &&
      c.cuenta !== null &&
      (filtro === undefined || filtro(c)),
  );
  const grupos = [...new Set(opciones.map((c) => c.grupo))];

  return (
    <Select
      items={opciones.map((c) => ({ value: c.id, label: c.nombre }))}
      value={valor?.id ?? null}
      onValueChange={(v) => {
        const c = opciones.find((x) => x.id === v);
        if (c) onElegir(c);
      }}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalido || undefined}
        className="h-11 w-full rounded-xl px-4 aria-invalid:border-danger"
      >
        <SelectValue placeholder="Elegí el concepto" />
      </SelectTrigger>
      <SelectContent>
        {grupos.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel>{g}</SelectLabel>
            {opciones
              .filter((c) => c.grupo === g)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{c.cuenta?.codigo}</span>
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
