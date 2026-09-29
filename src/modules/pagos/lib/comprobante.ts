import type { PropuestaRenta } from "@/modules/retenciones/types/retenciones.types";

/**
 * Lo que el motor le retendría al anticipo: solo renta, como al guardar
 * (`AnticipoRetencionService.confirmar`). Cero si no hay propuesta.
 */
export function retencionDelAnticipo(p: PropuestaRenta | undefined): number {
  if (p === undefined) return 0;
  const centavos = p.retenciones
    .filter((r) => r.impuesto === "RENTA" && !r.asumida && r.valor > 0)
    .reduce((t, r) => t + Math.round(r.valor * 100), 0);
  return centavos / 100;
}

/** Qué impide entregar el anticipo, con las mismas guardas que el servidor. */
export function problemaDelAnticipo(p: PropuestaRenta | undefined, cargando: boolean): string | null {
  if (cargando || p === undefined) return "Calculando la retención del anticipo…";
  if (p.decision === "REVISION") return `${p.motivo} Completalo antes de entregar el anticipo.`;
  if (p.pendientes > 0) return "Elegí el concepto de retención del anticipo.";
  return null;
}

/** Lo que sale en plata: los pagos más el anticipo menos lo que se le retiene. */
export function salePlata(pagos: number, anticipo: number, retencion: number): number {
  return Math.round((pagos + anticipo - retencion) * 100) / 100;
}
