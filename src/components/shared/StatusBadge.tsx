"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// El reglamento de color deja cuatro familias semanticas y la escala neutra.
// Los siete colores sueltos que habia antes —indigo, purpura, naranja— colapsan
// en estas: un estado se distingue por su etiqueta, no por tener tono propio.
type Color = "neutro" | "info" | "exito" | "error" | "aviso";

// Reason: Badge no expone color arbitrario → el color va por className (gana en el cn final).
const COLOR_CLASSES: Record<Color, string> = {
  neutro: "bg-muted-foreground/15 text-muted-foreground border border-muted-foreground/20",
  info: "bg-info/15 text-info border border-info/20",
  exito: "bg-success/15 text-success border border-success/20",
  error: "bg-danger/15 text-danger border border-danger/20",
  aviso: "bg-warning/15 text-warning border border-warning/20",
};

// §17 — mapa completo de estados del backend.
const ESTADO_BADGE: Record<string, { color: Color; label: string }> = {
  // Cotizaciones
  BORRADOR: { color: "neutro", label: "Borrador" },
  ENVIADA: { color: "info", label: "Enviada" },
  VISTA: { color: "info", label: "Vista" },
  ACEPTADA: { color: "exito", label: "Aceptada" },
  CONVERTIDA: { color: "info", label: "Convertida" },
  RECHAZADA: { color: "error", label: "Rechazada" },
  VENCIDA: { color: "error", label: "Vencida" },
  // Ventas
  PENDIENTE: { color: "neutro", label: "Pendiente" },
  DESPACHADO: { color: "info", label: "Despachado" },
  ENTREGADO: { color: "exito", label: "Entregado" },
  CANCELADO: { color: "error", label: "Cancelado" },
  PREVENTA: { color: "aviso", label: "Preventa" },
  // Compras / Órdenes de compra
  RECIBIDA: { color: "exito", label: "Recibida" },
  ANULADA: { color: "error", label: "Anulada" },
  PARCIAL: { color: "aviso", label: "Parcial" },
  CANCELADA: { color: "error", label: "Cancelada" },
  // OT (Órdenes de trabajo)
  RECIBIDO: { color: "neutro", label: "Recibido" },
  DIAGNOSTICO: { color: "info", label: "Diagnóstico" },
  PRESUPUESTADO: { color: "aviso", label: "Presupuestado" },
  APROBADO: { color: "info", label: "Aprobado" },
  EN_EJECUCION: { color: "info", label: "En ejecución" },
  LISTO: { color: "info", label: "Listo" },
  // T5: FACTURADO espera pago (naranja); PAGADO ya puede entregarse.
  FACTURADO: { color: "aviso", label: "Facturado" },
  PAGADO: { color: "exito", label: "Pagado" },
  // Contabilidad · el asiento solo tiene `anulado`
  VIGENTE: { color: "exito", label: "Vigente" },
  ANULADO: { color: "error", label: "Anulado" },
  // Facturación · la factura solo tiene `anulada`; el alcance es de la nota
  // PARCIAL ya está arriba, con el mismo significado y el mismo color.
  EMITIDA: { color: "exito", label: "Emitida" },
  TOTAL: { color: "error", label: "Total" },
  // Tesorería · el sentido del abono y el veredicto del arqueo.
  // ANULADO ya está arriba, con el mismo significado y el mismo color.
  COBRO: { color: "exito", label: "Cobro" },
  PAGO: { color: "info", label: "Pago" },
  CUADRA: { color: "exito", label: "Cuadra" },
  FALTANTE: { color: "error", label: "Faltante" },
  SOBRANTE: { color: "aviso", label: "Sobrante" },
  ENTRADA: { color: "exito", label: "Entrada" },
  SALIDA: { color: "aviso", label: "Salida" },
  // Períodos
  abierto: { color: "exito", label: "Abierto" },
  cerrado: { color: "error", label: "Cerrado" },
  reabierto: { color: "aviso", label: "Reabierto" },
  // Nómina (BORRADOR/ANULADA ya definidos arriba)
  APROBADA: { color: "info", label: "Aprobada" },
  PAGADA: { color: "exito", label: "Pagada" },
  // Caja / Períodos contables (estado UPPERCASE)
  ABIERTO: { color: "exito", label: "Abierto" },
  CERRADO: { color: "neutro", label: "Cerrado" },
  REABIERTO: { color: "aviso", label: "Reabierto" },
  // Tareas CRM
  EN_PROCESO: { color: "info", label: "En proceso" },
  COMPLETADA: { color: "exito", label: "Completada" },
  ESCALADA: { color: "error", label: "Escalada" },
  // Equipos / Contratos
  activo: { color: "exito", label: "Activo" },
  en_reparacion: { color: "aviso", label: "En reparación" },
  dado_de_baja: { color: "neutro", label: "Dado de baja" },
  suspendido: { color: "aviso", label: "Suspendido" },
  terminado: { color: "error", label: "Terminado" },
  // General
  suspendida: { color: "aviso", label: "Suspendida" },
};

interface StatusBadgeProps {
  estado: string;
  className?: string;
}

export function StatusBadge({ estado, className }: StatusBadgeProps) {
  const cfg = ESTADO_BADGE[estado] ?? { color: "neutro" as Color, label: estado };
  return (
    <Badge className={cn(COLOR_CLASSES[cfg.color], className)}>
      {cfg.label}
    </Badge>
  );
}
