import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { ArqueoCaja, DocumentoEnCartera } from "../types/caja.types";

/**
 * Primitiva compartida del ciclo de la caja. Fuente única de verdad para la
 * línea del módulo, el selector y el arqueo: no duplicar estas reglas en los
 * componentes.
 *
 * Escrita para el modelo de 32 tablas. Lo que se cayó del ciclo viejo y por qué:
 *
 *   · El TURNO — no existe. La pantalla anterior abría y cerraba turnos con un
 *     fondo inicial; el modelo nuevo tiene un arqueo POR DÍA y el saldo es la
 *     suma de `movimiento_caja`. Sin turno no hay nada que abrir: la caja está
 *     siempre disponible y lo que se cierra es el día.
 *   · El MOVIMIENTO A MANO — no existe `POST /caja/movimientos`. Las entradas y
 *     salidas las produce un abono o un arqueo. Crearlas a mano permitiría
 *     inventar efectivo sin documento que lo respalde, que es justo lo que el
 *     arqueo existe para detectar.
 *
 * Y lo que entró: cobrar y pagar son el MISMO trabajo con el sentido cambiado
 * —una sola tabla `abono` del lado del backend—, así que son dos nodos con un
 * solo formulario detrás.
 */

// ── Fecha ────────────────────────────────────────────────────────────────────

/**
 * Hoy, en la zona del navegador.
 *
 * `toISOString().slice(0, 10)` daría la fecha en UTC: a las 7 de la noche en
 * Colombia allá ya es el día siguiente, y el cajero arquearía el día
 * equivocado. Por eso todas las peticiones de este módulo mandan la fecha
 * explícita en vez de dejar que el backend ponga la suya.
 */
export function hoyLocal(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// ── Subbandejas ──────────────────────────────────────────────────────────────

export type IdSubbandejaCaja = "por_cobrar" | "por_pagar";

/** Un documento de la cartera, con el lado por el que entró. */
export interface DocumentoUbicable extends DocumentoEnCartera {
  lado: IdSubbandejaCaja;
}

export interface SubbandejaCaja {
  id: IdSubbandejaCaja;
  label: string;
  pct: number;
  contiene: (documento: DocumentoUbicable) => boolean;
}

/**
 * Avance del día del cajero. No es una barra de progreso: cobrar y pagar
 * conviven toda la jornada. El porcentaje ordena la línea, no mide un documento.
 */
const PCT: Record<IdSubbandejaCaja, number> = {
  por_cobrar: 33,
  por_pagar: 66,
};

export const SUBBANDEJAS: SubbandejaCaja[] = [
  {
    id: "por_cobrar",
    label: "Por cobrar",
    pct: PCT.por_cobrar,
    contiene: (documento) => documento.lado === "por_cobrar" && documento.saldoPendiente > 0,
  },
  {
    id: "por_pagar",
    label: "Por pagar",
    pct: PCT.por_pagar,
    contiene: (documento) => documento.lado === "por_pagar" && documento.saldoPendiente > 0,
  },
];

/** `null` = sin saldo. El backend no lo lista, pero la regla vive acá igual. */
export function subbandejaDe(documento: DocumentoUbicable): IdSubbandejaCaja | null {
  return SUBBANDEJAS.find((sub) => sub.contiene(documento))?.id ?? null;
}

// ── Nodos ────────────────────────────────────────────────────────────────────

/**
 * Los nodos se nombran por el TRABAJO que falta, no por el estado del dinero.
 * Los tres están vivos a la vez.
 */
export type IdNodoCaja = "cobrar" | "pagar" | "cerrar";

export interface NodoCaja {
  id: IdNodoCaja;
  label: string;
  subbandejas: readonly IdSubbandejaCaja[];
  /** El cierre se abre aunque no haya documentos: cierra el día, no un documento. */
  abreVacio?: boolean;
}

export const NODOS = [
  { id: "cobrar", label: "Cobrar", subbandejas: ["por_cobrar"], abreVacio: false },
  { id: "pagar", label: "Pagar", subbandejas: ["por_pagar"], abreVacio: false },
  // Cerrar no agrupa documentos: lo que se arquea es el cajón del día. Su carga
  // no es un contador de filas sino un estado —arqueada o sin arquear—, así que
  // no tiene subbandejas y se abre siempre.
  { id: "cerrar", label: "Cerrar caja", subbandejas: [], abreVacio: true },
] as const satisfies readonly NodoCaja[];

// Falla la compilación si una subbandeja queda sin nodo: sin esto, una bandeja
// nueva se contaría en el selector y en ningún contador de la línea.
type SubbandejaCubierta = (typeof NODOS)[number]["subbandejas"][number];
type _CoberturaCompleta = [Exclude<IdSubbandejaCaja, SubbandejaCubierta>] extends [never]
  ? true
  : never;
const _cobertura: _CoberturaCompleta = true;
void _cobertura;

const NODO_DE_SUBBANDEJA = Object.fromEntries(
  NODOS.flatMap((nodo) => nodo.subbandejas.map((sub) => [sub, nodo.id])),
) as Record<IdSubbandejaCaja, IdNodoCaja>;

/** Definido vía `subbandejaDe`, nunca con predicado propio. */
export function nodoDe(documento: DocumentoUbicable): IdNodoCaja | null {
  const sub = subbandejaDe(documento);
  return sub === null ? null : NODO_DE_SUBBANDEJA[sub];
}

// ── Conteos ──────────────────────────────────────────────────────────────────

export type ConteosPorSubbandejaCaja = Record<IdSubbandejaCaja, number>;

export const CONTEOS_VACIOS: ConteosPorSubbandejaCaja = {
  por_cobrar: 0,
  por_pagar: 0,
};

/**
 * Se cuenta en el navegador y no en el backend.
 *
 * `GET /cartera` ya trae los dos lados completos: contar acá no cuesta una
 * petición más. Un contador servido sería más barato el día que el volumen lo
 * pida; hoy sería un endpoint más que mantener en paridad con estos predicados.
 */
export function contar(documentos: DocumentoUbicable[]): ConteosPorSubbandejaCaja {
  return documentos.reduce<ConteosPorSubbandejaCaja>(
    (conteos, documento) => {
      const sub = subbandejaDe(documento);
      if (sub) conteos[sub] += 1;
      return conteos;
    },
    { ...CONTEOS_VACIOS },
  );
}

/** El contador de un nodo es SIEMPRE la suma de sus subbandejas. */
export function conteoDeNodo(nodo: NodoCaja, conteos: ConteosPorSubbandejaCaja): number {
  return nodo.subbandejas.reduce((total, sub) => total + conteos[sub], 0);
}

/** Los dos lados de la cartera, ya ubicables. */
export function ubicar(
  porCobrar: DocumentoEnCartera[],
  porPagar: DocumentoEnCartera[],
): DocumentoUbicable[] {
  return [
    ...porCobrar.map((documento) => ({ ...documento, lado: "por_cobrar" as const })),
    ...porPagar.map((documento) => ({ ...documento, lado: "por_pagar" as const })),
  ];
}

// ── El cierre del día ────────────────────────────────────────────────────────

export interface EstadoDelCierre {
  arqueadoHoy: boolean;
  /** La fecha del arqueo más reciente. `null` si nunca se arqueó. */
  ultimoArqueo: string | null;
  /**
   * Días transcurridos desde el último arqueo. `null` cuando no hay ninguno:
   * «nunca se arqueó» y «se arqueó hace 4 días» son cosas distintas, y decir
   * cero en el primer caso sería inventar un cierre que no ocurrió.
   */
  diasSinArquear: number | null;
}

/**
 * Cómo está el cierre, leído de los arqueos que ya existen.
 *
 * Nada de esto se guarda: se deriva del listado. Una columna «arqueada hoy»
 * necesitaría un proceso que la moviera a medianoche, y el día que no corriera
 * la caja mentiría.
 */
export function estadoDelCierre(
  arqueos: ArqueoCaja[],
  hoy: string = hoyLocal(),
): EstadoDelCierre {
  const fechas = arqueos.map((arqueo) => arqueo.fecha).sort();
  const ultimoArqueo = fechas.length > 0 ? fechas[fechas.length - 1] : null;
  return {
    arqueadoHoy: fechas.includes(hoy),
    ultimoArqueo,
    diasSinArquear:
      ultimoArqueo === null
        ? null
        : differenceInCalendarDays(parseISO(hoy), parseISO(ultimoArqueo)),
  };
}

export type ResultadoArqueo = "CUADRA" | "FALTANTE" | "SOBRANTE";

/**
 * Qué pasó con el conteo, en centavos enteros.
 *
 * Es la misma función del backend (`clasificarArqueo`), y se compara en
 * centavos por lo mismo: una resta de flotantes convertiría un arqueo que
 * cuadra en un faltante de dos milésimas, y la pantalla pediría una observación
 * que el backend no va a pedir.
 *
 * Faltante y sobrante no son el mismo hecho con signo distinto: van a cuentas
 * de naturaleza opuesta —gasto e ingreso—, y por eso son dos conceptos y no uno.
 */
export function clasificarArqueo(
  saldoSistema: number,
  saldoContado: number,
): { diferencia: number; resultado: ResultadoArqueo } {
  const centavos = Math.round(saldoContado * 100) - Math.round(saldoSistema * 100);
  const diferencia = centavos / 100;
  if (centavos === 0) return { diferencia: 0, resultado: "CUADRA" };
  return { diferencia, resultado: centavos < 0 ? "FALTANTE" : "SOBRANTE" };
}

/** Cómo se lee un arqueo ya guardado. Misma clasificación, leída de la fila. */
export function resultadoDeArqueo(arqueo: ArqueoCaja): ResultadoArqueo {
  return clasificarArqueo(arqueo.saldoSistema, arqueo.saldoContado).resultado;
}
