/**
 * Del archivo del banco a las líneas del extracto, en el navegador.
 *
 * Tres pasos, cada uno probado por separado:
 * 1. **Leer**: `.xlsx` (con `leerXlsx`) o texto separado por `;`, `,` o
 *    tabulador (RFC 4180). Sale una lista de filas con su número real.
 * 2. **Mapear**: qué columna es qué, desde qué fila empiezan los datos, cómo
 *    escribe el banco los números y las fechas. `proponerFormato` adivina;
 *    una persona corrige; el mapeo se guarda en la cuenta para el mes
 *    siguiente.
 * 3. **Interpretar**: cada fila pasa a línea, o a un error con su número de
 *    fila y el motivo. Una fila que no se pudo leer no se sube, y el cuadre
 *    dice si importaba.
 *
 * Ningún número se adivina en silencio: «1.234» es mil doscientos treinta y
 * cuatro o uno coma dos, según el separador decimal que diga el mapeo.
 */
import { leerXlsx, type Celda, type FilaLeida } from "./xlsx";

export type { Celda, FilaLeida };

/** El orden en que el banco escribe día, mes y año. */
export type OrdenFecha = "DMA" | "MDA" | "AMD";
export type SeparadorDecimal = "," | ".";

export type ColumnasValor =
  /** Una columna con signo: negativo es débito (lo que sale). */
  | { modo: "UNA"; columna: number }
  /** Una columna para lo que sale y otra para lo que entra. */
  | { modo: "DOS"; debito: number; credito: number };

/**
 * El mapeo de columnas. Se guarda tal cual en `cuenta_bancaria.formato_extracto`:
 * el backend no lo interpreta. Las columnas van desde 0; `encabezados` guarda
 * cómo se llamaban, para encontrarlas el mes siguiente si el banco las movió.
 */
export interface FormatoExtracto {
  version: 1;
  /** La primera fila con datos, como la numera el archivo (desde 1). */
  filaInicio: number;
  fecha: number;
  descripcion: number;
  referencia: number | null;
  valor: ColumnasValor;
  decimal: SeparadorDecimal;
  ordenFecha: OrdenFecha;
  encabezados?: Partial<Record<RolColumna, string>>;
}

export type RolColumna = "fecha" | "descripcion" | "referencia" | "valor" | "debito" | "credito";

/** Lo que manda `POST /cuentas-bancarias/:id/extractos/importar` por línea. */
export interface LineaImportada {
  fila: number;
  fecha: string;
  descripcion: string;
  referencia?: string;
  valor: number;
  tipo: "DEBITO" | "CREDITO";
}

export interface FilaConError {
  fila: number;
  motivo: string;
}

// -----------------------------------------------------------------------------
// 1. Leer
// -----------------------------------------------------------------------------

export interface ArchivoLeido {
  nombre: string;
  /** SHA-256 en hexadecimal: el backend rechaza el mismo archivo dos veces. */
  huella: string;
  filas: FilaLeida[];
  /** Un Excel que cuenta los días desde 1904 (ver `HojaLeida`). Un CSV, nunca. */
  fechas1904: boolean;
}

export async function leerArchivo(archivo: File): Promise<ArchivoLeido> {
  const contenido = await archivo.arrayBuffer();
  const bytes = new Uint8Array(contenido);
  const huella = await sha256Hex(contenido);

  let filas: FilaLeida[];
  let fechas1904 = false;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    ({ filas, fechas1904 } = await leerXlsx(contenido));
  } else if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new Error(
      "Es un Excel viejo (.xls). Abrilo en Excel y guardalo como .xlsx o como CSV.",
    );
  } else if (bytes[0] === 0x25 && bytes[1] === 0x50) {
    throw new Error("Es un PDF. Por ahora el extracto se sube en Excel o CSV.");
  } else {
    filas = leerCsv(decodificarTexto(bytes));
  }
  if (filas.length === 0) throw new Error("El archivo está vacío.");
  return { nombre: archivo.name, huella, filas, fechas1904 };
}

export async function sha256Hex(contenido: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", contenido);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * UTF-8 si lo es; si no, Windows-1252, que es como exporta Excel en español
 * un CSV sin marca. Sin esto, «Débito» llega como «D�bito».
 */
export function decodificarTexto(bytes: Uint8Array): string {
  let texto: string;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    texto = new TextDecoder("windows-1252").decode(bytes);
  }
  return texto.replace(/^\uFEFF/, "");
}

/**
 * Texto separado, según RFC 4180: comillas que encierran separadores y saltos
 * de línea, comillas duplicadas adentro. El separador se detecta en las
 * primeras líneas —`;` es lo que usa Excel en español, `,` el resto del
 * mundo—. La fila es el número de registro, como la mostraría Excel.
 */
export function leerCsv(texto: string): FilaLeida[] {
  const separador = detectarSeparador(texto);
  const registros: string[][] = [];
  let registro: string[] = [];
  let campo = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else entreComillas = false;
      } else campo += c;
    } else if (c === '"' && campo.trim() === "") {
      campo = "";
      entreComillas = true;
    } else if (c === separador) {
      registro.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i += 1;
      registro.push(campo);
      registros.push(registro);
      registro = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || registro.length > 0) {
    registro.push(campo);
    registros.push(registro);
  }

  return registros
    .map((celdas, i) => ({
      fila: i + 1,
      celdas: celdas.map((x) => (x.trim() === "" ? null : x.trim())),
    }))
    .filter((f) => f.celdas.some((x) => x !== null));
}

function detectarSeparador(texto: string): string {
  const muestra = texto.split(/\r?\n/).slice(0, 20).join("\n").replace(/"[^"]*"/g, "");
  const cuenta = (s: string) => muestra.split(s).length - 1;
  const candidatos = [";", "\t", ","] as const;
  return candidatos.reduce((mejor, s) => (cuenta(s) > cuenta(mejor) ? s : mejor), ";");
}

// -----------------------------------------------------------------------------
// Números y fechas
// -----------------------------------------------------------------------------

/**
 * Un valor del banco. `null` si la celda está vacía, `NaN` si trae algo que no
 * es un número. Acepta «$ 1.234.567,89», «1,234,567.89», «-5.000», «5.000-» y
 * «(5.000)»: el separador de miles es el que no es el decimal.
 */
export function leerNumero(celda: Celda, decimal: SeparadorDecimal): number | null {
  if (celda === null) return null;
  if (typeof celda === "number") return celda;
  const t = celda.trim();
  if (t === "") return null;
  if (!/\d/.test(t)) return Number.NaN;
  const negativo = /^\(.*\)$/.test(t) || /-\s*[\d.,$]/.test(t) || /\d\s*-$/.test(t);
  const limpio = t.replace(/[^\d.,]/g, "");
  const miles = decimal === "," ? "." : ",";
  const normal = limpio.split(miles).join("").replace(decimal, ".");
  // Un segundo separador decimal: «1,234,567» leído con coma decimal.
  if ((normal.match(/\./g) ?? []).length > 1) return Number.NaN;
  const n = Number(normal);
  return Number.isFinite(n) ? (negativo ? -n : n) : Number.NaN;
}

const MESES: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

/**
 * Una fecha del banco como `aaaa-mm-dd`, o `null` si no se entiende o no
 * existe (31 de febrero). Acepta el número de serie de Excel, `aaaammdd`,
 * «01/09/2026», «1-sep-26», y la hora pegada detrás. `orden` decide solo
 * cuando la fecha es ambigua: con el año adelante, siempre es año-mes-día.
 * `fechas1904` corrige el número de serie de un Excel que cuenta desde 1904;
 * solo aplica a una celda numérica, que es lo único que viene de ese Excel.
 */
export function leerFecha(celda: Celda, orden: OrdenFecha, fechas1904 = false): string | null {
  if (celda === null) return null;
  if (typeof celda === "number") return desdeSerie(fechas1904 ? celda + 1462 : celda);
  const t = sinHora(celda);
  if (/^\d{8}$/.test(t)) return armar(+t.slice(0, 4), +t.slice(4, 6), +t.slice(6, 8));
  if (/^\d{5}$/.test(t)) return desdeSerie(Number(t));

  const partes = t.split(/[/\-.]/);
  if (partes.length !== 3) return null;
  const [a, b, c] = partes;
  const mes = (p: string) => (/^\d+$/.test(p) ? Number(p) : MESES[p.slice(0, 3).toLowerCase()]);
  const anio = (p: string) => (p.length === 2 ? 2000 + Number(p) : Number(p));
  // El día y el año son números; el mes puede venir en letras («sep»).
  if (!/^\d+$/.test(a) || !/^\d+$/.test(c)) return null;

  if (a.length === 4) return armar(anio(a), mes(b), Number(c));
  if (!/^\d+$/.test(b)) return armar(anio(c), mes(b), Number(a)); // 01-sep-2026
  if (orden === "MDA") return armar(anio(c), Number(a), Number(b));
  return armar(anio(c), Number(b), Number(a));
}

/**
 * La fecha sin la hora que traen pegada algunos bancos: «01/09/2026 00:00» o
 * «2026-09-01T00:00». La T parte solo si le sigue un dígito: «01-SET-2026»
 * también tiene una T.
 */
function sinHora(texto: string): string {
  return texto.trim().split(/\s|T(?=\d)/)[0];
}

/** Días desde el 30 de diciembre de 1899: así cuenta Excel (con su año bisiesto de 1900 incluido). */
function desdeSerie(serie: number): string | null {
  if (!Number.isFinite(serie) || serie < 1 || serie > 2958465) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serie) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function armar(anio: number, mes: number | undefined, dia: number): string | null {
  if (!mes || !Number.isInteger(anio) || !Number.isInteger(dia)) return null;
  if (anio < 1900 || anio > 2999) return null;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// 2. Mapear
// -----------------------------------------------------------------------------

const PATRONES: Record<RolColumna, RegExp> = {
  fecha: /fecha|date/i,
  descripcion: /descrip|concepto|detalle|transacci|movimiento|narrativa/i,
  referencia: /refer|documento|comprobante|cheque|n[uú]mero|^no\.?$|^nro/i,
  debito: /d[eé]bito|cargo|retiro|egreso|salida/i,
  credito: /cr[eé]dito|abono|dep[oó]sito|ingreso|entrada|consignaci/i,
  valor: /valor|monto|importe|amount/i,
};

/**
 * Un primer mapeo, para corregir y no para llenar desde cero. Busca la fila de
 * encabezados en las primeras 30 (la primera con una columna «Fecha») y
 * reconoce las columnas por su nombre. Nunca toma una columna de saldo como
 * valor. Si no hay encabezados, propone fecha-descripción-valor en orden.
 */
export function proponerFormato(filas: FilaLeida[]): FormatoExtracto {
  const encabezado = filas
    .slice(0, 30)
    .find((f) => f.celdas.some((c) => typeof c === "string" && PATRONES.fecha.test(c)));

  const nombres = (encabezado?.celdas ?? []).map((c) => (typeof c === "string" ? c : ""));
  const usadas = new Set<number>();
  const buscar = (rol: RolColumna): number | null => {
    const i = nombres.findIndex(
      (n, idx) => !usadas.has(idx) && PATRONES[rol].test(n) && !/saldo|balance/i.test(n),
    );
    if (i < 0) return null;
    usadas.add(i);
    return i;
  };

  const fecha = buscar("fecha") ?? 0;
  const debito = buscar("debito");
  const credito = buscar("credito");
  const valorUnico = debito !== null && credito !== null ? null : buscar("valor");
  const descripcion = buscar("descripcion") ?? (fecha === 0 ? 1 : 0);
  const referencia = buscar("referencia");

  const valor: ColumnasValor =
    debito !== null && credito !== null
      ? { modo: "DOS", debito, credito }
      : { modo: "UNA", columna: valorUnico ?? debito ?? credito ?? 2 };

  const filaInicio = encabezado ? encabezado.fila + 1 : (filas[0]?.fila ?? 1);
  const datos = filas.filter((f) => f.fila >= filaInicio).slice(0, 50);
  const columnasValor = valor.modo === "DOS" ? [valor.debito, valor.credito] : [valor.columna];

  return {
    version: 1,
    filaInicio,
    fecha,
    descripcion,
    referencia,
    valor,
    decimal: detectarDecimal(datos, columnasValor),
    ordenFecha: detectarOrden(datos, fecha),
  };
}

/** Coma decimal salvo que los números digan otra cosa: es el formato colombiano. */
function detectarDecimal(filas: FilaLeida[], columnas: number[]): SeparadorDecimal {
  let coma = 0;
  let punto = 0;
  for (const f of filas) {
    for (const c of columnas) {
      const v = f.celdas[c];
      if (typeof v !== "string") continue;
      // Dos decimales después del separador lo delatan como decimal; tres
      // dígitos al final, como separador de miles («150.000» es coma decimal,
      // «150,000» es punto). Un banco no lleva tres decimales en pesos.
      if (/\d,\d{1,2}\)?-?$/.test(v) || /\d\.\d{3}(\.|\)?-?$)/.test(v)) coma += 1;
      else if (/\d\.\d{1,2}\)?-?$/.test(v) || /\d,\d{3}(,|\)?-?$)/.test(v)) punto += 1;
    }
  }
  return punto > coma ? "." : ",";
}

/** Día primero salvo evidencia de lo contrario: un «13» en la segunda posición es un día. */
function detectarOrden(filas: FilaLeida[], columna: number): OrdenFecha {
  let orden: OrdenFecha = "DMA";
  for (const f of filas) {
    const v = f.celdas[columna];
    if (typeof v !== "string") continue;
    const partes = sinHora(v).split(/[/\-.]/);
    if (partes.length !== 3) continue;
    if (partes[0].length === 4) return "AMD";
    if (Number(partes[0]) > 12) return "DMA";
    if (Number(partes[1]) > 12) orden = "MDA";
  }
  return orden;
}

/**
 * Si el orden de la fecha no se puede saber del archivo: ninguna fecha escrita
 * como texto tiene un número mayor a 12 ni el año adelante. Un extracto del 1
 * al 12 en mes/día/año se leería con día y mes cambiados y cuadraría igual
 * —el cuadre no mira fechas—, así que la pantalla lo dice en vez de suponer.
 */
export function ordenFechaDudoso(filas: FilaLeida[], f: FormatoExtracto): boolean {
  let hayTexto = false;
  for (const { fila, celdas } of filas) {
    if (fila < f.filaInicio) continue;
    const v = celdas[f.fecha];
    if (typeof v !== "string") continue;
    const partes = sinHora(v).split(/[/\-.]/);
    if (partes.length !== 3 || !/^\d+$/.test(partes[1])) continue;
    hayTexto = true;
    if (partes[0].length === 4 || Number(partes[0]) > 12 || Number(partes[1]) > 12) return false;
  }
  return hayTexto;
}

/** Los nombres de las columnas elegidas, para guardarlos con el mapeo. */
export function conEncabezados(formato: FormatoExtracto, filas: FilaLeida[]): FormatoExtracto {
  const encabezado = filas.find((f) => f.fila === formato.filaInicio - 1);
  const nombre = (i: number | null) => {
    const v = i === null ? null : encabezado?.celdas[i];
    return typeof v === "string" ? v : undefined;
  };
  const encabezados: Partial<Record<RolColumna, string>> = {
    fecha: nombre(formato.fecha),
    descripcion: nombre(formato.descripcion),
    referencia: nombre(formato.referencia),
    ...(formato.valor.modo === "UNA"
      ? { valor: nombre(formato.valor.columna) }
      : { debito: nombre(formato.valor.debito), credito: nombre(formato.valor.credito) }),
  };
  return { ...formato, encabezados };
}

/**
 * El mapeo que guardó la cuenta, si tiene la forma de uno. Viene de la API
 * como `Record<string, unknown>`: se revisa en vez de creerle.
 */
export function formatoGuardado(x: Record<string, unknown> | null): FormatoExtracto | null {
  if (!x || x.version !== 1) return null;
  const f = x as unknown as FormatoExtracto;
  const entero = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;
  const valorOk =
    f.valor?.modo === "UNA"
      ? entero(f.valor.columna)
      : f.valor?.modo === "DOS" && entero(f.valor.debito) && entero(f.valor.credito);
  const ok =
    entero(f.filaInicio) &&
    entero(f.fecha) &&
    entero(f.descripcion) &&
    (f.referencia === null || entero(f.referencia)) &&
    valorOk &&
    (f.decimal === "," || f.decimal === ".") &&
    ["DMA", "MDA", "AMD"].includes(f.ordenFecha);
  return ok ? f : null;
}

/**
 * El mapeo guardado, ajustado a este archivo: si la fila de encabezados cambió
 * de lugar o el banco reordenó las columnas, se las busca por su nombre. Lo
 * que no se encuentra queda donde estaba.
 */
export function ajustarFormato(guardado: FormatoExtracto, filas: FilaLeida[]): FormatoExtracto {
  const e = guardado.encabezados;
  if (!e?.fecha) return guardado;
  const encabezado = filas
    .slice(0, 30)
    .find((f) => f.celdas.some((c) => typeof c === "string" && c.trim() === e.fecha!.trim()));
  if (!encabezado) return guardado;
  const indice = (nombre: string | undefined, antes: number) => {
    if (!nombre) return antes;
    const i = encabezado.celdas.findIndex((c) => typeof c === "string" && c.trim() === nombre.trim());
    return i >= 0 ? i : antes;
  };
  return {
    ...guardado,
    filaInicio: encabezado.fila + 1,
    fecha: indice(e.fecha, guardado.fecha),
    descripcion: indice(e.descripcion, guardado.descripcion),
    referencia: guardado.referencia === null ? null : indice(e.referencia, guardado.referencia),
    valor:
      guardado.valor.modo === "UNA"
        ? { modo: "UNA", columna: indice(e.valor, guardado.valor.columna) }
        : {
            modo: "DOS",
            debito: indice(e.debito, guardado.valor.debito),
            credito: indice(e.credito, guardado.valor.credito),
          },
  };
}

// -----------------------------------------------------------------------------
// 3. Interpretar
// -----------------------------------------------------------------------------

/**
 * Cada fila desde `filaInicio`, a línea o a error. Una fila vacía no cuenta.
 * Una fila con error no se sube: se muestra con su número y el motivo, y si
 * tenía plata el extracto no va a cuadrar, que es como se entera la persona.
 */
export function interpretar(
  filas: FilaLeida[],
  f: FormatoExtracto,
  { fechas1904 = false }: { fechas1904?: boolean } = {},
): { lineas: LineaImportada[]; errores: FilaConError[] } {
  const lineas: LineaImportada[] = [];
  const errores: FilaConError[] = [];

  for (const { fila, celdas } of filas) {
    if (fila < f.filaInicio || celdas.every((c) => c === null)) continue;
    const error = (motivo: string) => errores.push({ fila, motivo });

    const celdaFecha = celdas[f.fecha] ?? null;
    const fecha = leerFecha(celdaFecha, f.ordenFecha, fechas1904);
    if (fecha === null) {
      error(celdaFecha === null ? "Sin fecha." : `La fecha «${celdaFecha}» no se entiende.`);
      continue;
    }

    const descripcion = texto(celdas[f.descripcion]);
    if (descripcion === "") {
      error("Sin descripción.");
      continue;
    }
    if (descripcion.length > 300) {
      error("La descripción pasa de 300 caracteres.");
      continue;
    }

    const referencia = f.referencia === null ? "" : texto(celdas[f.referencia]);
    if (referencia.length > 100) {
      error("La referencia pasa de 100 caracteres.");
      continue;
    }

    let valor: number;
    let tipo: LineaImportada["tipo"];
    if (f.valor.modo === "UNA") {
      const celda = celdas[f.valor.columna] ?? null;
      const n = leerNumero(celda, f.decimal);
      if (n === null) {
        error("Sin valor.");
        continue;
      }
      if (Number.isNaN(n)) {
        error(`El valor «${celda}» no es un número.`);
        continue;
      }
      valor = Math.abs(n);
      tipo = n < 0 ? "DEBITO" : "CREDITO";
    } else {
      const cd = celdas[f.valor.debito] ?? null;
      const cc = celdas[f.valor.credito] ?? null;
      const d = leerNumero(cd, f.decimal);
      const c = leerNumero(cc, f.decimal);
      if (Number.isNaN(d)) {
        error(`El débito «${cd}» no es un número.`);
        continue;
      }
      if (Number.isNaN(c)) {
        error(`El crédito «${cc}» no es un número.`);
        continue;
      }
      // Hay bancos que escriben el débito en negativo en su propia columna.
      const debito = Math.abs(d ?? 0);
      const credito = Math.abs(c ?? 0);
      if (debito > 0 && credito > 0) {
        error("Trae débito y crédito a la vez.");
        continue;
      }
      valor = debito > 0 ? debito : credito;
      tipo = debito > 0 ? "DEBITO" : "CREDITO";
    }

    valor = redondear(valor);
    if (valor === 0) {
      error("El valor es cero.");
      continue;
    }

    lineas.push({
      fila,
      fecha,
      descripcion,
      ...(referencia !== "" ? { referencia } : {}),
      valor,
      tipo,
    });
  }
  return { lineas, errores };
}

function texto(celda: Celda | undefined): string {
  if (celda === null || celda === undefined) return "";
  if (typeof celda === "number") {
    return Number.isInteger(celda) ? celda.toFixed(0) : String(celda);
  }
  return celda.replace(/\s+/g, " ").trim();
}

/**
 * El cuadre del extracto consigo mismo, calculado igual que
 * `calcularSaldoExtracto` en el backend: saldo inicial más créditos menos
 * débitos, redondeado al final. Si no da el saldo final, el backend lo
 * rechazaría con el mismo número.
 */
export function cuadre(
  lineas: readonly LineaImportada[],
  saldoInicial: number,
  saldoFinal: number,
): {
  desde: string | null;
  hasta: string | null;
  creditos: number;
  debitos: number;
  calculado: number;
  diferencia: number;
  cuadra: boolean;
} {
  const fechas = lineas.map((l) => l.fecha).sort();
  const creditos = redondear(lineas.filter((l) => l.tipo === "CREDITO").reduce((t, l) => t + l.valor, 0));
  const debitos = redondear(lineas.filter((l) => l.tipo === "DEBITO").reduce((t, l) => t + l.valor, 0));
  const calculado = redondear(
    lineas.reduce((t, l) => t + (l.tipo === "CREDITO" ? l.valor : -l.valor), saldoInicial),
  );
  const diferencia = redondear(redondear(saldoFinal) - calculado);
  return {
    desde: fechas[0] ?? null,
    hasta: fechas.at(-1) ?? null,
    creditos,
    debitos,
    calculado,
    diferencia,
    cuadra: diferencia === 0,
  };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
