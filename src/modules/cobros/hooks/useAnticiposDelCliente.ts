"use client";

import { useQuery } from "@tanstack/react-query";

import { formatFecha } from "@/lib/utils";
import type { AnticipoDisponible } from "@/modules/tesoreria/lib/formaPago";
import { cobrosApi } from "../services/cobros.service";

/**
 * Los anticipos y saldos a favor de un cliente, como los ofrece el pago de
 * una factura (Entra a → Anticipo). Sin cliente, ninguno.
 */
export function useAnticiposDelCliente(terceroId: string | null | undefined): AnticipoDisponible[] {
  const { data } = useQuery({
    queryKey: ["cartera", "disponibles", terceroId],
    queryFn: () => cobrosApi.disponibles(terceroId!),
    enabled: !!terceroId,
  });
  if (!terceroId || data === undefined) return [];
  return [
    ...data.anticipos.map((a) => ({
      tipo: "ANTICIPO" as const,
      origenId: a.movimientoId,
      etiqueta: `Anticipo del ${formatFecha(a.fecha)}`,
      disponible: a.saldo,
    })),
    ...data.saldosAFavor.map((s) => ({
      tipo: "SALDO_A_FAVOR" as const,
      origenId: s.facturaId,
      etiqueta: `Saldo a favor ${s.factura}`,
      disponible: s.saldo,
    })),
  ];
}
