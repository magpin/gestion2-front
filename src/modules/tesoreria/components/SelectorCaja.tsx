"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cajasApi } from "../services/tesoreria.service";
import type { CajaResumen } from "../types/tesoreria.types";

/**
 * Elegir en qué caja operar. A diferencia de `SelectorProducto`/
 * `SelectorCuenta` (catálogos de cientos de filas, con buscador), acá basta
 * un `Select` simple: una empresa tiene pocas cajas — una por sede, más la
 * caja menor.
 */
export function SelectorCaja({
  valor,
  onElegir,
}: {
  valor: CajaResumen | null;
  onElegir: (caja: CajaResumen) => void;
}) {
  const { data: cajas = [] } = useQuery({
    queryKey: ["cajas", "selector"],
    queryFn: () => cajasApi.listar(),
    staleTime: 60_000,
  });

  return (
    <Select
      value={valor?.id ?? ""}
      onValueChange={(id) => {
        const caja = cajas.find((c) => c.id === id);
        if (caja) onElegir(caja);
      }}
    >
      <SelectTrigger className="h-11 w-full rounded-xl px-4">
        <SelectValue placeholder="Seleccione una caja" />
      </SelectTrigger>
      <SelectContent>
        {cajas.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
