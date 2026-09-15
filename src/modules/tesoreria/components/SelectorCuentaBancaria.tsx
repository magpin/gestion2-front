"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cuentasBancariasApi } from "../services/bancos.service";
import type { CuentaBancariaResumen } from "../types/bancos.types";

/**
 * Elegir en qué cuenta bancaria operar. Mismo criterio que
 * `SelectorCaja`: una empresa tiene pocas cuentas bancarias, así que
 * basta un `Select` simple, sin buscador.
 */
export function SelectorCuentaBancaria({
  valor,
  onElegir,
}: {
  valor: CuentaBancariaResumen | null;
  onElegir: (cuenta: CuentaBancariaResumen) => void;
}) {
  const { data: cuentas = [] } = useQuery({
    queryKey: ["cuentas-bancarias", "selector"],
    queryFn: () => cuentasBancariasApi.listar(),
    staleTime: 60_000,
  });

  return (
    <Select
      items={cuentas.map((c) => ({ value: c.id, label: `${c.banco} · ${c.numero_cuenta}` }))}
      value={valor?.id ?? ""}
      onValueChange={(id) => {
        const cuenta = cuentas.find((c) => c.id === id);
        if (cuenta) onElegir(cuenta);
      }}
    >
      <SelectTrigger className="h-11 w-full rounded-xl px-4">
        <SelectValue placeholder="Seleccione una cuenta bancaria" />
      </SelectTrigger>
      <SelectContent>
        {cuentas.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.banco} · {c.numero_cuenta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
