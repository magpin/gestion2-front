import type { FiltroPaginado } from "@/core/types/pagination.types";

// Espejo de `abono`, `movimiento_caja` y `arqueo_caja`
// (backend/src/modules/tesoreria).
//
// Los `numeric` de Postgres llegan como string por el driver: todo lo que sea
// plata se pasa por `Number()` antes de mostrarse. Se tipan como number porque
// el módulo los normaliza al leer, no porque el JSON los mande así.

/** Los cinco del CHECK de la base. `EFECTIVO` es el único que toca el cajón. */
export type MedioPago = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "CHEQUE" | "OTRO";

export const MEDIOS_PAGO: { id: MedioPago; label: string }[] = [
  { id: "EFECTIVO", label: "Efectivo" },
  { id: "TRANSFERENCIA", label: "Transferencia" },
  { id: "TARJETA", label: "Tarjeta" },
  { id: "CHEQUE", label: "Cheque" },
  { id: "OTRO", label: "Otro" },
];

/**
 * La plata solo pasa por el cajón cuando el medio es efectivo.
 *
 * Es la misma función del backend (`tocaLaCaja`), repetida acá a propósito: la
 * pantalla tiene que poder decir «esto no va a mover la caja» ANTES de mandar
 * la petición. Si las dos se separaran, el arqueo dejaría de cuadrar y el
 * usuario se enteraría al contar.
 */
export function tocaLaCaja(medioPago: MedioPago): boolean {
  return medioPago === "EFECTIVO";
}

export type SentidoAbono = "COBRO" | "PAGO";

/** Qué documento baja de saldo. `OT` entra con el módulo 7. */
export type OrigenAbono = "VENTA" | "COMPRA";

/**
 * Cobrar y pagar son la misma fila.
 *
 * El backend usa una sola tabla porque los dos eventos tienen la misma forma
 * —fecha, importe, medio y un saldo que baja—; la pantalla hace lo mismo con un
 * solo formulario y dos etiquetas. El sentido lo dice la columna, no el signo:
 * `importe` siempre es positivo.
 */
export interface Abono {
  id: string;
  empresaId: string;
  terceroId: string;
  sentido: SentidoAbono;
  origenTipo: OrigenAbono;
  origenId: string;
  fecha: string;
  importe: number;
  medioPago: MedioPago;
  referencia: string | null;
  observacion: string | null;
  asientoId: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  creadoPorId: string;
  creadoEn: string;
  actualizadoEn: string;
}

export type SentidoCaja = "ENTRADA" | "SALIDA";

/** Qué produjo el movimiento. `ANTICIPO_OT` entra con el módulo 7. */
export type OrigenCaja = "ABONO" | "ARQUEO" | "NOTA_CREDITO";

/**
 * Lo que entró y salió del cajón físico, y nada más.
 *
 * No hay `POST /caja/movimientos` y por eso no hay formulario: los movimientos
 * los produce un abono o un arqueo. Poder crearlos a mano permitiría inventar
 * efectivo sin documento que lo respalde, que es justo lo que el arqueo existe
 * para detectar.
 */
export interface MovimientoCaja {
  id: string;
  empresaId: string;
  fecha: string;
  sentido: SentidoCaja;
  importe: number;
  origenTipo: OrigenCaja | null;
  origenId: string | null;
  nota: string | null;
  usuarioId: string;
  creadoEn: string;
}

/**
 * El conteo físico contra el saldo calculado. Un arqueo por día.
 *
 * Único documento del esquema que puede no tener asiento: uno que cuadra es un
 * hecho administrativo, no contable.
 */
export interface ArqueoCaja {
  id: string;
  empresaId: string;
  fecha: string;
  saldoSistema: number;
  saldoContado: number;
  /** GENERATED en la base: `contado − sistema`. Negativa faltante, positiva sobrante. */
  diferencia: number;
  /** NULL si la diferencia fue cero. */
  asientoId: string | null;
  observacion: string | null;
  usuarioId: string;
  creadoEn: string;
}

/** Un documento pendiente, como lo responde su módulo dueño (`DocumentoEnCartera`). */
export interface DocumentoEnCartera {
  id: string;
  terceroId: string;
  fecha: string;
  /** El número de la factura. En una venta sin emitir, «Sin facturar». */
  referencia: string;
  total: number;
  saldoPendiente: number;
}

/**
 * Los dos lados de la cartera, cada uno respondido por su módulo.
 *
 * `tesoreria` no consulta `venta` ni `compra`: pregunta a `ventas` y a
 * `compras` a través de `DocumentoCobrable`. Por eso llega junto en una sola
 * respuesta y la pantalla no tiene que cruzar nada.
 */
export interface Cartera {
  porCobrar: DocumentoEnCartera[];
  porPagar: DocumentoEnCartera[];
  totalPorCobrar: number;
  totalPorPagar: number;
}

export interface NuevoCobroPayload {
  /** `OT` entra con el módulo 7; hoy el CHECK solo admite `VENTA`. */
  origenTipo: "VENTA";
  origenId: string;
  importe: number;
  medioPago: MedioPago;
  fecha?: string;
  referencia?: string;
  observacion?: string;
}

export interface NuevoPagoPayload {
  compraId: string;
  importe: number;
  medioPago: MedioPago;
  fecha?: string;
  referencia?: string;
  observacion?: string;
}

export interface NuevoArqueoPayload {
  fecha?: string;
  /** Lo que se contó en el cajón. El saldo del sistema lo pone el sistema. */
  saldoContado: number;
  /** Obligatoria cuando no cuadra: un faltante sin explicación se esconde solo. */
  observacion?: string;
}

export interface FiltrosAbono extends FiltroPaginado {
  terceroId?: string;
  sentido?: SentidoAbono;
  origenTipo?: OrigenAbono;
  origenId?: string;
  desde?: string;
  hasta?: string;
  incluirAnulados?: boolean;
}

export interface FiltrosArqueo extends FiltroPaginado {
  desde?: string;
  hasta?: string;
}

export interface FiltrosMovimiento extends FiltroPaginado {
  desde?: string;
  hasta?: string;
}

/** El estado de un abono se DERIVA: no hay columna que lo guarde. */
export function estadoDeAbono(abono: Abono): "ANULADO" | "COBRO" | "PAGO" {
  return abono.anulado ? "ANULADO" : abono.sentido;
}
