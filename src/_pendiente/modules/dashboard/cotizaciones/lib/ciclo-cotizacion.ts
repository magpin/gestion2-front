import type { Cotizacion } from "../types/cotizaciones.types";

/**
 * Primitiva compartida del ciclo de la cotización. Fuente única de verdad para
 * la línea del módulo, la fila y el detalle: no duplicar estas reglas en los
 * componentes.
 *
 * Adaptada al modelo de 32 tablas. Dos cambios respecto del ciclo viejo:
 *
 *   · `VISTA` y `CONVERTIDA` ya no son estados. Lo primero nunca se supo de
 *     verdad; lo segundo es una columna —`ventaId`— y no una etiqueta, que es
 *     lo que permite medir cuántas cierran.
 *   · `VENCIDA` sigue siendo derivada, pero ahora la deriva el backend a partir
 *     de `validoHasta`, que se GUARDA al crear. La pantalla la lee, no la
 *     calcula: si la política cambia de 3 a 5 días, las viejas conservan la
 *     fecha que se le imprimió al cliente.
 */

// ── Subbandejas ──────────────────────────────────────────────────────────────

export type IdSubbandejaCotizacion = "borrador" | "esperando" | "vencida" | "aceptada";

/** Lo mínimo para ubicar una cotización. Todo viene del backend ya resuelto. */
export interface CotizacionUbicable {
  estado: Cotizacion["estado"];
  vencida: boolean;
  ventaId: string | null;
}

export interface SubbandejaCotizacion {
  id: IdSubbandejaCotizacion;
  label: string;
  pct: number;
  contiene: (cotizacion: CotizacionUbicable) => boolean;
}

/**
 * Avance del proceso. La vencida hereda el % del paso al que la devuelve su
 * acción, no el del punto al que había llegado: re-cotizar arranca de nuevo.
 */
const PCT: Record<IdSubbandejaCotizacion, number> = {
  borrador: 33,
  esperando: 66,
  vencida: 33,
  aceptada: 100,
};

/** Convertida o rechazada: no hay trabajo pendiente sobre ella. */
const abierta = (cotizacion: CotizacionUbicable): boolean =>
  cotizacion.ventaId === null && cotizacion.estado !== "RECHAZADA";

export const SUBBANDEJAS: SubbandejaCotizacion[] = [
  {
    // Va primero: una vencida necesita re-cotizarse, y eso manda sobre
    // cualquier otra lectura de en qué punto estaba.
    id: "vencida",
    label: "Vencida",
    pct: PCT.vencida,
    contiene: (cotizacion) => abierta(cotizacion) && cotizacion.vencida,
  },
  {
    id: "borrador",
    label: "Sin enviar",
    pct: PCT.borrador,
    contiene: (cotizacion) => abierta(cotizacion) && cotizacion.estado === "BORRADOR",
  },
  {
    id: "esperando",
    label: "Esperando respuesta",
    pct: PCT.esperando,
    contiene: (cotizacion) => abierta(cotizacion) && cotizacion.estado === "ENVIADA",
  },
  {
    id: "aceptada",
    label: "Lista para vender",
    pct: PCT.aceptada,
    contiene: (cotizacion) => abierta(cotizacion) && cotizacion.estado === "ACEPTADA",
  },
];

function subbandejaQueContiene(
  cotizacion: CotizacionUbicable,
): SubbandejaCotizacion | undefined {
  return SUBBANDEJAS.find((sub) => sub.contiene(cotizacion));
}

/** `null` = convertida o rechazada. No revienta: ahí el proceso terminó. */
export function subbandejaDe(cotizacion: CotizacionUbicable): IdSubbandejaCotizacion | null {
  return subbandejaQueContiene(cotizacion)?.id ?? null;
}

// ── Nodos ────────────────────────────────────────────────────────────────────

/** Nombrados por el TRABAJO que falta, no por el estado en que quedaron. */
export type IdNodoCotizacion = "cotizar" | "enviar" | "respuesta" | "convertir";

export interface NodoCotizacion {
  id: IdNodoCotizacion;
  label: string;
  subbandejas: readonly IdSubbandejaCotizacion[];
  abreVacio?: boolean;
}

export const NODOS = [
  { id: "cotizar", label: "Cotizar", subbandejas: [], abreVacio: true },
  { id: "enviar", label: "Enviar", subbandejas: ["borrador"], abreVacio: false },
  // La vencida vive acá y no en un nodo propio: sigue siendo la espera de una
  // respuesta, solo que se detuvo. Separarla la dejaría fuera del recorrido.
  {
    id: "respuesta",
    label: "Respuesta",
    subbandejas: ["vencida", "esperando"],
    abreVacio: false,
  },
  { id: "convertir", label: "Convertir", subbandejas: ["aceptada"], abreVacio: false },
] as const satisfies readonly NodoCotizacion[];

type SubbandejaCubierta = (typeof NODOS)[number]["subbandejas"][number];
type _CoberturaCompleta = [Exclude<IdSubbandejaCotizacion, SubbandejaCubierta>] extends [
  never,
]
  ? true
  : never;
const _cobertura: _CoberturaCompleta = true;
void _cobertura;

const NODO_DE_SUBBANDEJA = Object.fromEntries(
  NODOS.flatMap((nodo) => nodo.subbandejas.map((sub) => [sub, nodo.id])),
) as Record<IdSubbandejaCotizacion, IdNodoCotizacion>;

export function nodoDe(cotizacion: CotizacionUbicable): IdNodoCotizacion | null {
  const sub = subbandejaDe(cotizacion);
  return sub === null ? null : NODO_DE_SUBBANDEJA[sub];
}

// ── Conteos ──────────────────────────────────────────────────────────────────

export type ConteosPorSubbandejaCotizacion = Record<IdSubbandejaCotizacion, number>;

export const CONTEOS_VACIOS: ConteosPorSubbandejaCotizacion = {
  borrador: 0,
  esperando: 0,
  vencida: 0,
  aceptada: 0,
};

export function contar(
  cotizaciones: CotizacionUbicable[],
): ConteosPorSubbandejaCotizacion {
  return cotizaciones.reduce<ConteosPorSubbandejaCotizacion>(
    (conteos, cotizacion) => {
      const sub = subbandejaDe(cotizacion);
      if (sub) conteos[sub] += 1;
      return conteos;
    },
    { ...CONTEOS_VACIOS },
  );
}

/** El contador de un nodo es SIEMPRE la suma de sus subbandejas. */
export function conteoDeNodo(
  nodo: NodoCotizacion,
  conteos: ConteosPorSubbandejaCotizacion,
): number {
  return nodo.subbandejas.reduce((total, sub) => total + conteos[sub], 0);
}

/**
 * La vencida es un SUBCONJUNTO del nodo, no un sumando: se comunica como «5, de
 * ellas 2 vencidas», nunca como «5 + 2».
 */
export function vencidasDeNodo(
  nodo: NodoCotizacion,
  conteos: ConteosPorSubbandejaCotizacion,
): number {
  return nodo.subbandejas.includes("vencida") ? conteos.vencida : 0;
}

// ── Lectura visual ───────────────────────────────────────────────────────────

export type TonoCotizacion = "avance" | "espera" | "traba" | "cerrada";

export interface EstadoVisualCotizacion {
  subbandeja: IdSubbandejaCotizacion | null;
  label: string;
  pct: number;
  tono: TonoCotizacion;
}

const TONO: Record<IdSubbandejaCotizacion, TonoCotizacion> = {
  borrador: "avance",
  esperando: "espera",
  vencida: "traba",
  aceptada: "avance",
};

export function estadoVisualDe(cotizacion: CotizacionUbicable): EstadoVisualCotizacion {
  if (cotizacion.ventaId) {
    return { subbandeja: null, label: "Convertida", pct: 100, tono: "cerrada" };
  }
  if (cotizacion.estado === "RECHAZADA") {
    return { subbandeja: null, label: "Rechazada", pct: 0, tono: "cerrada" };
  }

  const sub = subbandejaQueContiene(cotizacion);
  if (sub) {
    return { subbandeja: sub.id, label: sub.label, pct: sub.pct, tono: TONO[sub.id] };
  }
  return { subbandeja: null, label: "Cerrada", pct: 100, tono: "cerrada" };
}
