"use client";

import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCentroCosto, useCentroPropuesto, useCentrosCosto } from "./SelectorCentroCosto";

/**
 * El centro de costo de un documento (factura, cotización, compra): dónde se
 * vendió o se gastó. Sin centros de costo no se muestra.
 *
 * `valor` en `null` es «el que proponga el sistema»: se muestra el propuesto
 * (el del usuario o el de por defecto) y no se envía, para que el servidor
 * pueda usar también el de la sede de la caja.
 */
export function CentroDelDocumento({
  valor,
  onCambiar,
  sedeId,
  etiqueta = "Centro de costo",
  className,
}: {
  valor: string | null;
  onCambiar: (id: string | null) => void;
  sedeId?: string | null;
  etiqueta?: string;
  className?: string;
}) {
  const { maneja, elegibles } = useCentrosCosto();
  const propuesto = useCentroPropuesto(sedeId);
  if (!maneja) return null;
  return (
    <Campo id="centroCosto" etiqueta={etiqueta} className={className ?? "mt-3.5 max-w-sm"}>
      <SelectorCentroCosto value={valor ?? propuesto} onChange={onCambiar} centros={elegibles} />
    </Campo>
  );
}
