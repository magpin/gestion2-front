import type { Venta } from "../types/ventas.types";

/**
 * Primitiva compartida del ciclo de la venta. Fuente única de verdad para la
 * línea del módulo, la fila y el detalle: no duplicar estas reglas en los
 * componentes.
 *
 * Reescrita para el modelo de 32 tablas. Lo que se cayó del ciclo viejo y por
 * qué:
 *
 *   · `PREVENTA` — no existe: no hay orden de compra previa, la compra ES la
 *     factura del proveedor ya recibida. Con ella desaparece el nodo
 *     «Disponibilidad», que era la espera sobre un tercero.
 *   · Las cuotas y con ellas la mora — la venta nueva no pacta plan de pagos:
 *     tiene un saldo y nada más. Declarar «mora» sin fecha pactada sería
 *     inventar un dato.
 *
 * Y lo que entró, porque el modelo nuevo sí lo tiene: el nodo `facturar`. La
 * venta no numera —el número lo aporta la factura, que es de otro módulo— así
 * que emitirla es trabajo pendiente y ahora se ve.
 *
 * Firmar un precio bajo el piso NO es un nodo. Es trabajo del director y su
 * pantalla es Administración; en el proceso de venta aparece solo como lo que
 * significa acá: una venta que no se puede facturar todavía.
 */

// ── Subbandejas ──────────────────────────────────────────────────────────────

export type IdSubbandejaVenta = "sin_autorizar" | "sin_facturar" | "con_saldo";

/**
 * Lo mínimo para ubicar una venta.
 *
 * `facturada` y `lineasSinFirmar` son obligatorias y pueden ser falsas, pero no
 * `undefined`: «no vino en la respuesta» y «no tiene» son cosas distintas, y
 * confundirlas dejaría al vendedor mirando una bandeja vacía. Quien no tenga el
 * dato, que no llame.
 */
export interface VentaUbicable {
  anulada: boolean;
  saldoPendiente: number;
  facturada: boolean;
  lineasSinFirmar: number;
}

export interface SubbandejaVenta {
  id: IdSubbandejaVenta;
  label: string;
  pct: number;
  contiene: (venta: VentaUbicable) => boolean;
}

/**
 * Avance del proceso. Las dos bandejas de facturación comparten el % porque son
 * el mismo punto: una venta frenada por una firma no está más atrás, está
 * detenida en el mismo paso.
 */
const PCT: Record<IdSubbandejaVenta, number> = {
  sin_autorizar: 50,
  sin_facturar: 50,
  con_saldo: 100,
};

/** Anulada no está en ninguna bandeja: no hay trabajo pendiente sobre ella. */
const viva = (venta: VentaUbicable): boolean => !venta.anulada;

export const SUBBANDEJAS: SubbandejaVenta[] = [
  {
    id: "sin_autorizar",
    label: "Precio sin firmar",
    pct: PCT.sin_autorizar,
    contiene: (venta) => viva(venta) && venta.lineasSinFirmar > 0,
  },
  {
    // Va después de la firma a propósito: una venta con las dos cosas
    // pendientes aparece donde está el bloqueo, no donde está el trámite. Las
    // dos viven en el nodo Facturar; lo que cambia es la urgencia.
    id: "sin_facturar",
    label: "Sin facturar",
    pct: PCT.sin_facturar,
    contiene: (venta) => viva(venta) && venta.lineasSinFirmar === 0 && !venta.facturada,
  },
  {
    id: "con_saldo",
    label: "Con saldo",
    pct: PCT.con_saldo,
    contiene: (venta) =>
      viva(venta) &&
      venta.lineasSinFirmar === 0 &&
      venta.facturada &&
      Number(venta.saldoPendiente) > 0,
  },
];

function subbandejaQueContiene(venta: VentaUbicable): SubbandejaVenta | undefined {
  return SUBBANDEJAS.find((sub) => sub.contiene(venta));
}

/** `null` = anulada, o cerrada porque ya no debe nada. No revienta. */
export function subbandejaDe(venta: VentaUbicable): IdSubbandejaVenta | null {
  return subbandejaQueContiene(venta)?.id ?? null;
}

// ── Nodos ────────────────────────────────────────────────────────────────────

/**
 * Los nodos se nombran por el TRABAJO que falta hacer, no por el estado en que
 * quedó la venta. Los dos están vivos a la vez: no es una barra de progreso.
 */
export type IdNodoVenta = "vender" | "facturar";

export interface NodoVenta {
  id: IdNodoVenta;
  label: string;
  subbandejas: readonly IdSubbandejaVenta[];
  /** El nodo 1 se abre aunque esté vacío: es el que dispara el proceso. */
  abreVacio?: boolean;
}

export const NODOS = [
  { id: "vender", label: "Vender", subbandejas: [], abreVacio: true },
  // Firmar un precio bajo el piso NO es un nodo propio: es del director, y su
  // pantalla es Administración. Acá aparece como lo que significa para este
  // proceso — una venta que no se puede facturar hasta que alguien llame.
  {
    id: "facturar",
    label: "Facturar",
    subbandejas: ["sin_autorizar", "sin_facturar"],
    abreVacio: false,
  },
] as const satisfies readonly NodoVenta[];

/**
 * Cobrar NO es un nodo de este proceso: el cobro se registra en Caja, que es
 * otro módulo y otro rol. Acá vive como el botón «Cobrar» —abre la cartera de
 * clientes— y como la bandeja `con_saldo`, que sigue describiendo la venta en
 * la fila y en el detalle aunque nadie la opere desde la línea.
 */
type SubbandejaSinNodo = "con_saldo";

// Falla la compilación si una subbandeja queda sin nodo y sin excepción
// declarada: sin esto, una bandeja nueva se contaría en el selector y en ningún
// contador de la línea.
type SubbandejaCubierta = (typeof NODOS)[number]["subbandejas"][number];
type _CoberturaCompleta = [
  Exclude<IdSubbandejaVenta, SubbandejaCubierta | SubbandejaSinNodo>,
] extends [never]
  ? true
  : never;
const _cobertura: _CoberturaCompleta = true;
void _cobertura;

const NODO_DE_SUBBANDEJA = Object.fromEntries(
  NODOS.flatMap((nodo) => nodo.subbandejas.map((sub) => [sub, nodo.id])),
) as Partial<Record<IdSubbandejaVenta, IdNodoVenta>>;

/**
 * Definido vía `subbandejaDe`, nunca con predicado propio. `null` también para
 * la venta con saldo: está viva, pero su trabajo pendiente no es de esta línea.
 */
export function nodoDe(venta: VentaUbicable): IdNodoVenta | null {
  const sub = subbandejaDe(venta);
  return sub === null ? null : (NODO_DE_SUBBANDEJA[sub] ?? null);
}

// ── Conteos ──────────────────────────────────────────────────────────────────

export type ConteosPorSubbandejaVenta = Record<IdSubbandejaVenta, number>;

export const CONTEOS_VACIOS: ConteosPorSubbandejaVenta = {
  sin_autorizar: 0,
  sin_facturar: 0,
  con_saldo: 0,
};

/**
 * Se cuenta en el navegador y no en el backend.
 *
 * No hay endpoint de conteos: las tres bandejas salen de datos que la pantalla
 * ya tiene —el listado de ventas, las facturas emitidas y las líneas sin
 * firmar—. Un contador servido sería más barato el día que el volumen lo pida;
 * hoy sería un endpoint más que mantener en paridad con estos predicados.
 */
export function contar(ventas: VentaUbicable[]): ConteosPorSubbandejaVenta {
  return ventas.reduce<ConteosPorSubbandejaVenta>(
    (conteos, venta) => {
      const sub = subbandejaDe(venta);
      if (sub) conteos[sub] += 1;
      return conteos;
    },
    { ...CONTEOS_VACIOS },
  );
}

/** El contador de un nodo es SIEMPRE la suma de sus subbandejas. */
export function conteoDeNodo(
  nodo: NodoVenta,
  conteos: ConteosPorSubbandejaVenta,
): number {
  return nodo.subbandejas.reduce((total, sub) => total + conteos[sub], 0);
}

/**
 * Las frenadas son un SUBCONJUNTO del nodo, no un sumando: se comunican como
 * «7, de ellas 2 esperando firma», nunca como «7 + 2».
 */
export function frenadasDeNodo(
  nodo: NodoVenta,
  conteos: ConteosPorSubbandejaVenta,
): number {
  return nodo.subbandejas.includes("sin_autorizar") ? conteos.sin_autorizar : 0;
}

// ── Lectura visual ───────────────────────────────────────────────────────────

export type TonoVenta = "avance" | "espera" | "traba" | "anulada";

export interface EstadoVisualVenta {
  subbandeja: IdSubbandejaVenta | null;
  label: string;
  pct: number;
  tono: TonoVenta;
}

const TONO: Record<IdSubbandejaVenta, TonoVenta> = {
  // Traba y no espera: nadie va a firmar solo. Alguien tiene que llamar.
  sin_autorizar: "traba",
  sin_facturar: "avance",
  con_saldo: "espera",
};

/**
 * Cómo se lee una venta: label + avance + tono, resueltos en un solo lugar para
 * que la fila y el detalle no puedan contradecirse.
 */
export function estadoVisualDe(venta: VentaUbicable): EstadoVisualVenta {
  if (venta.anulada) {
    return { subbandeja: null, label: "Anulada", pct: 0, tono: "anulada" };
  }

  const sub = subbandejaQueContiene(venta);
  if (sub) {
    return { subbandeja: sub.id, label: sub.label, pct: sub.pct, tono: TONO[sub.id] };
  }

  // Facturada y sin saldo: la venta está cerrada. No hay trabajo pendiente.
  return { subbandeja: null, label: "Cerrada", pct: 100, tono: "avance" };
}

/** Cuántas líneas sin firmar tiene cada venta, indexado por `ventaId`. */
export function lineasSinFirmarPorVenta(
  pendientes: { ventaId: string }[],
): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const linea of pendientes) {
    mapa.set(linea.ventaId, (mapa.get(linea.ventaId) ?? 0) + 1);
  }
  return mapa;
}

/** La venta del listado, ya ubicable: se le pegan los dos datos que le faltan. */
export function ubicar(
  venta: Venta,
  facturadas: Set<string>,
  sinFirmar: Map<string, number>,
): Venta & VentaUbicable {
  return {
    ...venta,
    facturada: facturadas.has(venta.id),
    lineasSinFirmar: sinFirmar.get(venta.id) ?? 0,
  };
}
