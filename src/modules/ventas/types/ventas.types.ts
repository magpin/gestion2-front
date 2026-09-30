import type {
  MedioAlEmitirInput,
  MedioPagoInput,
} from "@/modules/tesoreria/types/tesoreria.types";

// Espejo de `/cotizaciones`, `/facturas` y `/notas-credito`.
//
// Un solo documento con tres tipos, no tres formas distintas: comparten
// cabecera y líneas, lo que cambia es la regla de negocio (si numera contra
// una resolución DIAN, si asienta, si mueve inventario). Mismo criterio que
// ya explica `docs/planes/ventas-backend.md`.

export type TipoVentaDocumento =
  "COTIZACION" | "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO";
/** `CONVERTIDA` es exclusivo de COTIZACION: la que ya se pasó a factura. */
export type EstadoVentaDocumento =
  "BORRADOR" | "EMITIDA" | "CONVERTIDA" | "ANULADA";

export interface VentaDocumentoResumen {
  id: string;
  tipo: TipoVentaDocumento;
  tercero_id: string;
  /** Razón social o nombre completo: viene de la API para no resolverlo acá. */
  tercero_nombre: string;
  /** Ya formateada por el backend: `NIT 900123456-7`, `CC 19400748`. */
  tercero_identificacion: string;
  fecha: string;
  /** Cuándo vence lo pactado. `null` si no hay: la cartera cuenta 30 días desde la emisión. */
  vence: string | null;
  estado: EstadoVentaDocumento;
  prefijo: string | null;
  consecutivo: number;
  resolucion_id: string | null;
  documento_origen_id: string | null;
  /** Los cuatro montos: `numeric` de Postgres, serializado como texto. */
  subtotal: string;
  total_iva: string;
  total: string;
  /** Cuánto se ha cobrado. Siempre `"0"` en COTIZACION/NOTA_CREDITO — nadie cobra esas. */
  monto_pagado: string;
  /**
   * Lo que las notas no anuladas le sumaron o restaron: negativo por cada
   * nota crédito, positivo por cada nota débito. `"0"` si no tiene ninguna.
   */
  ajuste_notas: string;
  /** `total + ajuste_notas`: lo que el documento vale hoy. Lo calcula la API. */
  saldo_efectivo: string;
  /**
   * Lo que falta por cobrar, nunca negativo. **Es esto y no `total` lo que
   * decide si una factura se puede cobrar**: con una nota crédito encima, el
   * total dejó de ser lo que el cliente debe.
   */
  pendiente: string;
  /**
   * Lo cobrado de más: plata que hay que devolverle al cliente. Aparece
   * cuando una factura ya cobrada entera recibe después una nota crédito.
   */
  saldo_a_favor: string;
  asiento_id: string | null;
  /**
   * Emitida antes de usar el sistema y cargada con su número original. Sin
   * asiento ni kardex: se consulta y se cobra, pero no lleva notas.
   */
  historica: boolean;
  /**
   * Lo que el motor de retenciones encontró al facturar: el cliente retuvo
   * distinto de la norma, la autorretención que se practicó, falta una tarifa.
   */
  retencion_aviso?: string | null;
}

export interface VentaDocumentoLineaResumen {
  id: string;
  venta_documento_id: string;
  orden: number;
  /** `null` en una línea de servicio u otro ingreso (Fase 8). */
  producto_id: string | null;
  producto_codigo: string | null;
  producto_nombre: string | null;
  /** La línea de concepto: qué concepto, a qué cuenta entró y qué fue. */
  concepto_id?: string | null;
  concepto_nombre?: string | null;
  /** `true`: servicio (41). `false`: otro ingreso (42). */
  concepto_operacional?: boolean | null;
  cuenta_codigo?: string | null;
  cuenta_nombre?: string | null;
  detalle?: string | null;
  cantidad: string;
  precio_unitario: string;
  iva_tarifa: string;
  subtotal: string;
  iva_valor: string;
  total: string;
  /** Solo FACTURA/NOTA_CREDITO. `null` en COTIZACION: no consulta el kardex. */
  costo_unitario: string | null;
}

export interface VentaDocumentoDetalle extends VentaDocumentoResumen {
  lineas: VentaDocumentoLineaResumen[];
  /**
   * En una nota: la factura que corrige. En una factura convertida de una
   * cotización: esa cotización. `null` cuando no hay ninguno.
   */
  documento_origen?: VentaDocumentoResumen | null;
  /**
   * En una factura: sus notas crédito y débito, anuladas incluidas —una nota
   * anulada explica por qué el saldo volvió a subir—.
   */
  notas?: VentaDocumentoResumen[];
}

export interface PaginaVentas {
  datos: VentaDocumentoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface FiltroVentas {
  terceroId?: string;
  pagina?: number;
}

/** Una línea de cotización o factura. Sin `precioUnitario`, el de lista vigente. */
export interface LineaDocumentoInput {
  /** Un producto del catálogo, o —solo en la factura— un concepto de ingreso. */
  productoId?: string;
  conceptoId?: string;
  /** Solo en la de concepto: qué se cobró. */
  detalle?: string;
  /** Solo en la de concepto: 0, 5 o 19. */
  ivaTarifa?: number;
  cantidad: number;
  /**
   * Sin IVA. En la de producto, si viene, manda sobre el de lista: es el
   * precio pactado con el cliente. En la de concepto, obligatorio.
   */
  precioUnitario?: number;
}

/** Una cotización: el cliente, la fecha y las líneas con su precio si se cambió. */
export interface CrearCotizacionInput {
  terceroId: string;
  fecha: string;
  lineas: LineaDocumentoInput[];
}

export interface CrearFacturaInput {
  terceroId: string;
  fecha: string;
  lineas: LineaDocumentoInput[];
  /**
   * "Sé que no hay existencia y la emito igual". No es un permiso: el backend
   * la rechaza igual si la empresa no habilitó el descubierto o si el producto
   * nunca tuvo una entrada (no habría costo con el que valorar la venta).
   */
  confirmaSinExistencia?: boolean;
  /**
   * "Sé que esta venta pierde plata y la emito igual". Solo un DIRECTOR puede
   * autorizarla, y queda anotado en la línea quién lo hizo.
   */
  confirmaPrecioBajoCosto?: boolean;
  /**
   * Crédito, o contado con sus medios —el que venga sin valor se lleva lo que
   * falte—. Ver `SelectorFormaPago`.
   */
  formaPago: "CREDITO" | "CONTADO";
  pagos?: MedioAlEmitirInput[];
  /** A crédito: cuándo vence. Sin él, el plazo del cliente o 30 días. */
  vence?: string;
  /** Lo que el cliente nos retiene: el concepto y la base. */
  retenciones?: Array<{ conceptoId: string; base: number }>;
  /**
   * Anticipos y saldos a favor del cliente que pagan parte de la factura sin
   * mover caja. La forma de pago es sobre lo que falta; si la cubren, va de
   * contado sin `pagos`.
   */
  aplicar?: AplicarAlFacturarInput[];
}

export interface AplicarAlFacturarInput {
  tipo: "ANTICIPO" | "SALDO_A_FAVOR";
  /** El movimiento del anticipo, o la factura con saldo a favor. */
  origenId: string;
  valor: number;
}

/** Cómo quedaría la factura, sin emitirla (`POST /facturas/previo`). */
export interface FacturaPrevia {
  numero: string;
  subtotal: number;
  iva: number;
  total: number;
  retenciones: Array<{ tipo: string; nombre: string; tarifa: number; base: number; valor: number }>;
  retenido: number;
  /** Lo que va a entrar: el total menos lo retenido. */
  neto: number;
  vence: string | null;
  asiento: Array<{ codigo: string; nombre: string; debito: number; credito: number }>;
  /** El costo de lo que sale del inventario, aparte del asiento que se muestra. */
  costo: number;
  /** De contado: por dónde entra la plata y cuánto por cada medio (el renglón en blanco, el resto). */
  pagos: Array<{ medio: "CAJA" | "BANCO"; nombre: string; valor: number }>;
}

/** El número que sale si se emite ahora (`GET /facturas/numeracion`). */
export interface NumeracionFactura {
  siguiente: string;
  resolucion: string;
  desde: number;
  hasta: number;
  quedan: number;
}

/**
 * Qué se le cobra de más al cliente. A diferencia de la nota crédito —que
 * devuelve al precio de la factura—, acá el precio se digita siempre: lo que
 * se cobra es un valor nuevo, no uno del catálogo.
 */
export interface LineaNotaDebitoInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CrearNotaDebitoInput {
  /** La factura EMITIDA sobre la que se cobra. Sin factura no hay nota. */
  documentoOrigenId: string;
  fecha: string;
  motivo: string;
  lineas: LineaNotaDebitoInput[];
}

/** Una línea de la factura que la nota crédito corrige, y por cuánto. */
export interface LineaNotaCreditoInput {
  lineaOrigenId: string;
  cantidad: number;
}

/**
 * Nota crédito de venta: baja lo que el cliente debe. Sin `lineas` reversa la
 * factura completa —menos lo que notas anteriores ya devolvieron—; con ellas,
 * solo esas cantidades. El precio y el IVA no se piden: son los de la
 * factura, no se renegocian al corregir.
 */
export interface CrearNotaCreditoInput {
  documentoOrigenId: string;
  fecha: string;
  motivo: string;
  lineas?: LineaNotaCreditoInput[];
}

/**
 * Convertir una cotización en factura: la fecha y cómo se paga — el cliente,
 * las líneas y el precio de cada una salen de la propia cotización. Se
 * factura al precio cotizado.
 */
export interface ConvertirCotizacionInput {
  fecha: string;
  /** Ver `CrearFacturaInput.confirmaSinExistencia`: la factura sale igual. */
  confirmaSinExistencia?: boolean;
  /** Ver `CrearFacturaInput.confirmaPrecioBajoCosto`. */
  confirmaPrecioBajoCosto?: boolean;
  /** Ver `CrearFacturaInput.formaPago`. */
  formaPago: "CREDITO" | "CONTADO";
  pagos?: MedioAlEmitirInput[];
  /** A crédito: cuándo vence. Sin él, el plazo del cliente o 30 días. */
  vence?: string;
  /** Lo que el cliente nos retiene: el concepto y la base. */
  retenciones?: Array<{ conceptoId: string; base: number }>;
}

/**
 * Cobra una factura repartida entre uno o varios medios: una fecha —es un
 * solo acto— y un renglón por caja o cuenta que recibe. Con un renglón se
 * comporta como el cobro de siempre. El concepto de cada movimiento lo arma
 * el backend con el número de la factura.
 */
export interface CobrarInput {
  fecha: string;
  pagos: MedioPagoInput[];
}

/** Un producto que no alcanza para la venta (`POST /facturas/existencia`). */
export interface FaltanteExistencia {
  productoId: string;
  codigo: string;
  nombre: string;
  pide: number;
  hay: number;
  faltan: number;
  /** Sin saldo o sin costo: no se puede vender en descubierto; primero una entrada. */
  nuncaTuvoEntrada: boolean;
}

/** Qué no alcanza, y si la empresa vende sin existencia (`VENDE_SIN_EXISTENCIA`). */
export interface ExistenciaVenta {
  vendeSinExistencia: boolean;
  faltantes: FaltanteExistencia[];
}
