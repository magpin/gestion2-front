import { env } from "@/core/config/env";

/**
 * El tablero de consumo de la IA (`docs/planes/consumo-ia.md`): el contrato
 * de `GET /consumo-ia`, la llamada con la clave y los formatos.
 *
 * **Aparte del sistema.** No usa el cliente de axios —que le pega el token de
 * la sesión de empresa a todo y cierra la sesión con un 401—: la única llave
 * de esta página es la clave del tablero, en la cabecera `x-clave-consumo`.
 */

export interface Tokens {
  entrada: number;
  salida: number;
  cacheLeido: number;
  cacheEscrito: number;
}

export interface TableroConsumo {
  desde: string;
  hasta: string;
  totales: {
    costoUsd: number;
    respuestas: number;
    documentos: number;
    empresas: number;
    costoPorRespuesta: number | null;
    costoPorEmpresa: number | null;
    tokens: Tokens;
  };
  porDia: {
    dia: string;
    chatUsd: number;
    lecturaUsd: number;
    respuestas: number;
  }[];
  porEmpresa: {
    empresaId: string;
    empresa: string;
    respuestas: number;
    documentos: number;
    tokens: number;
    costoUsd: number;
    costoPorRespuesta: number | null;
    aprovechamientoCache: number;
  }[];
  porModelo: { modelo: string; llamadas: number; costoUsd: number }[];
  eficiencia: {
    aprovechamientoCache: number;
    cacheEscritoPorRespuesta: number | null;
    consultasPorRespuesta: number | null;
    vueltasPorRespuesta: number | null;
    duracionMediana: number | null;
    duracionP95: number | null;
    sinDuracion: number;
  };
  simulacion: { opus: number; sonnet: number; haiku: number };
  masCaras: {
    fecha: string;
    empresa: string;
    estado: string;
    modelo: string | null;
    consultas: number;
    vueltas: number | null;
    tokens: number;
    costoUsd: number;
    duracionMs: number | null;
  }[];
  lectura: {
    tipo: string;
    cantidad: number;
    fallidas: number;
    medidas: number;
    costoPromedio: number | null;
    duracionPromedio: number | null;
  }[];
  empresas: { id: string; nombre: string }[];
  empresaId: string | null;
  truncado: boolean;
}

/** Un rechazo del tablero: la clave, la configuración o el rango. */
export class ErrorTablero extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export async function pedirTablero(
  clave: string,
  filtro: { desde: string; hasta: string; empresaId: string | null },
): Promise<TableroConsumo> {
  const params = new URLSearchParams({
    desde: filtro.desde,
    hasta: filtro.hasta,
  });
  if (filtro.empresaId !== null) params.set("empresa", filtro.empresaId);
  const r = await fetch(`${env.apiUrl}/consumo-ia?${params.toString()}`, {
    headers: { "x-clave-consumo": clave },
  });
  if (!r.ok) {
    const cuerpo = (await r.json().catch(() => ({}))) as { message?: string };
    throw new ErrorTablero(
      r.status,
      cuerpo.message ?? "No se pudo cargar el tablero.",
    );
  }
  return (await r.json()) as TableroConsumo;
}

/** Para qué se llamó al modelo. */
export type Categoria = "AYUDA" | "CONSULTA" | "PROPUESTA" | "LECTURA";

export const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  AYUDA: "Ayuda sobre el sistema",
  CONSULTA: "Consulta de datos",
  PROPUESTA: "Propuesta de cobro o pago",
  LECTURA: "Lectura de documentos",
};

export type OrdenDetalle = "FECHA" | "COSTO";

export interface CostoDesglosado {
  entrada: number;
  cacheLeido: number;
  cacheEscrito: number;
  salida: number;
  total: number;
}

/** Una llamada al modelo: el renglón del detalle. */
export interface FilaDetalle {
  id: string;
  fecha: string;
  empresaId: string;
  empresa: string;
  categoria: Categoria;
  enQue: string;
  herramientas: { nombre: string; etiqueta: string; veces: number }[];
  estado: string;
  modelo: string | null;
  vueltas: number | null;
  duracionMs: number | null;
  tokens: Tokens | null;
  costo: CostoDesglosado | null;
}

/** El contrato de `GET /consumo-ia/detalle`. */
export interface DetalleConsumo {
  desde: string;
  hasta: string;
  porCategoria: {
    categoria: Categoria;
    etiqueta: string;
    llamadas: number;
    costoUsd: number;
    participacion: number;
  }[];
  porHerramienta: {
    herramienta: string;
    etiqueta: string;
    respuestas: number;
    veces: number;
    costoUsd: number;
  }[];
  filas: FilaDetalle[];
  total: number;
  totalUsd: number;
  pagina: number;
  paginas: number;
  porPagina: number;
  truncado: boolean;
}

export async function pedirDetalle(
  clave: string,
  filtro: {
    desde: string;
    hasta: string;
    empresaId: string | null;
    categoria: Categoria | null;
    orden: OrdenDetalle;
    pagina: number;
  },
): Promise<DetalleConsumo> {
  const params = new URLSearchParams({
    desde: filtro.desde,
    hasta: filtro.hasta,
    orden: filtro.orden,
    pagina: String(filtro.pagina),
  });
  if (filtro.empresaId !== null) params.set("empresa", filtro.empresaId);
  if (filtro.categoria !== null) params.set("categoria", filtro.categoria);
  const r = await fetch(
    `${env.apiUrl}/consumo-ia/detalle?${params.toString()}`,
    {
      headers: { "x-clave-consumo": clave },
    },
  );
  if (!r.ok) {
    const cuerpo = (await r.json().catch(() => ({}))) as { message?: string };
    throw new ErrorTablero(
      r.status,
      cuerpo.message ?? "No se pudo cargar el detalle.",
    );
  }
  return (await r.json()) as DetalleConsumo;
}

/** Los atajos de período: días hacia atrás desde hoy, o un mes calendario. */
export type Periodo = "7" | "30" | "90" | "MES" | "MES_PASADO";

export const ETIQUETA_PERIODO: Record<Periodo, string> = {
  "7": "7 días",
  "30": "30 días",
  "90": "90 días",
  MES: "Este mes",
  MES_PASADO: "Mes pasado",
};

/** El rango de un atajo, contra el día de hoy (`aaaa-mm-dd`). */
export function rangoDe(
  periodo: Periodo,
  hoy: string,
): { desde: string; hasta: string } {
  const [a, m] = hoy.split("-").map(Number);
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const base = Date.parse(`${hoy}T00:00:00Z`);
  if (periodo === "MES") return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
  if (periodo === "MES_PASADO") {
    const primero = Date.UTC(m === 1 ? a - 1 : a, m === 1 ? 11 : m - 2, 1);
    const ultimo = Date.UTC(a, m - 1, 0);
    return { desde: iso(primero), hasta: iso(ultimo) };
  }
  return { desde: iso(base - (Number(periodo) - 1) * 86_400_000), hasta: hoy };
}

/** Dólares con los decimales que dicen algo: de centavos para abajo, cuatro. */
export function usd(n: number | null): string {
  if (n === null) return "—";
  const decimales = Math.abs(n) < 0.1 ? 4 : 2;
  return `US$ ${n.toLocaleString("es-CO", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
}

/** Pesos, con la tasa que se escribió en la página. */
export function cop(n: number | null, tasa: number): string {
  if (n === null) return "—";
  return `$ ${Math.round(n * tasa).toLocaleString("es-CO")}`;
}

export const miles = (n: number): string =>
  Math.round(n).toLocaleString("es-CO");

export const porcentaje = (n: number): string =>
  `${(n * 100).toFixed(1).replace(".", ",")} %`;

export const segundos = (ms: number | null): string =>
  ms === null ? "—" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
