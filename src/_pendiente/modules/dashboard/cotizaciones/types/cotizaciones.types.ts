import type { FiltroPaginado } from "@/core/types/pagination.types";
import type { CondicionVenta } from "@/modules/dashboard/ventas/types/ventas.types";

// Espejo de `cotizacion` y `cotizacion_detalle` (backend/src/modules/ventas).
//
// La cotización COMERCIAL: un cliente pregunta cuánto sale algo. No asienta, no
// mueve kardex y no toca el consecutivo fiscal — esa levedad es lo que la hace
// barata, y por eso tampoco necesita autorización de nadie.

/** Lo que se guarda. `VENCIDA` no está: se deriva de `validoHasta` al leer. */
export type EstadoCotizacion = "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA";

/** Lo que ve la pantalla: el guardado más el derivado. */
export type EstadoCotizacionVisible = EstadoCotizacion | "VENCIDA";

export interface CotizacionDetalle {
  id: string;
  cotizacionId: string;
  /** NULL si es un ítem libre que todavía no está en el catálogo. */
  productoId: string | null;
  /** Obligatoria cuando no hay producto. */
  descripcion: string | null;
  cantidad: number;
  precioUnitario: number;
  porcentajeIva: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  empresaId: string;
  terceroId: string;
  /** Consecutivo propio y NO fiscal: un hueco acá no le importa a nadie. */
  numero: string;
  fecha: string;
  /** GUARDADA al crear, no derivada: si la política cambia, esta no se mueve. */
  validoHasta: string;
  estado: EstadoCotizacion;
  subtotal: number;
  iva: number;
  total: number;
  observacion: string | null;
  /** NULL hasta que se convierte. Es lo que permite medir cuántas cierran. */
  ventaId: string | null;
  creadoPorId: string;
  creadoEn: string;
  actualizadoEn: string;
  /** Los compone el backend al leer. */
  estadoVisible: EstadoCotizacionVisible;
  vencida: boolean;
  /** Presente en el detalle y también al crear. */
  detalles?: CotizacionDetalle[];
}

export interface LineaCotizacionPayload {
  productoId?: string;
  descripcion?: string;
  cantidad: number;
  precioUnitario: number;
  porcentajeIva?: number;
}

export interface NuevaCotizacionPayload {
  terceroId: string;
  fecha?: string;
  /** Si no viene, sale de `diasValidezCotizacion` y se guarda calculada. */
  validoHasta?: string;
  observacion?: string;
  lineas: LineaCotizacionPayload[];
}

export type ActualizarCotizacionPayload = Partial<
  Omit<NuevaCotizacionPayload, "fecha">
>;

export interface ConvertirCotizacionPayload {
  fecha?: string;
  condicion?: CondicionVenta;
}

export interface FiltrosCotizacion extends FiltroPaginado {
  terceroId?: string;
  estado?: EstadoCotizacionVisible;
  desde?: string;
  hasta?: string;
  soloSinConvertir?: boolean;
}

/** Los tres estados que se pueden empujar. `VENCIDA` no es uno de ellos. */
export const ESTADOS_EMPUJABLES: { id: EstadoCotizacion; label: string }[] = [
  { id: "ENVIADA", label: "Marcar enviada" },
  { id: "ACEPTADA", label: "Marcar aceptada" },
  { id: "RECHAZADA", label: "Marcar rechazada" },
];

export const ESTADOS_FILTRO: { id: EstadoCotizacionVisible; label: string }[] = [
  { id: "BORRADOR", label: "Borrador" },
  { id: "ENVIADA", label: "Enviada" },
  { id: "ACEPTADA", label: "Aceptada" },
  { id: "RECHAZADA", label: "Rechazada" },
  { id: "VENCIDA", label: "Vencida" },
];

/** Convertida, rechazada o vencida: ya no hay nada que convertir. */
export function sePuedeConvertir(cotizacion: Cotizacion): boolean {
  return (
    cotizacion.ventaId === null &&
    cotizacion.estado !== "RECHAZADA" &&
    !cotizacion.vencida
  );
}

/** Una vez convertida no se edita: es historia, y sirve para medir. */
export function sePuedeEditar(cotizacion: Cotizacion): boolean {
  return cotizacion.ventaId === null;
}
