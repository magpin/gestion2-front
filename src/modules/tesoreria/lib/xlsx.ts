/**
 * Lector de .xlsx sin dependencias, en el navegador: un .xlsx es un zip con
 * XML adentro. Portado de `backend/scripts/lib/xlsx.js` (paso 16, decisión 5:
 * el archivo se lee en el navegador y no se agrega ninguna librería).
 *
 * Cubre lo que exportan los bancos: la primera hoja, celdas de texto o número,
 * cadenas compartidas o en línea. No es una librería de Excel: no evalúa
 * fórmulas (lee el último valor guardado) ni lee estilos, así que una fecha
 * llega como su número de serie y la interpreta quien sabe que esa columna es
 * fecha.
 *
 * Lo que cambió respecto al script, además de `zlib` → `DecompressionStream` y
 * `Buffer` → `DataView`:
 * - Una celda numérica llega como `number`, no como texto. Así «1234.5» de
 *   Excel no se confunde con «1.234» escrito a la colombiana.
 * - La fila conserva su número real (`<row r="7">`), para señalarla si falla.
 * - `&amp;` se desescapa al final: antes «&amp;lt;» terminaba en «<».
 * - La hoja se elige por número, no por orden de texto: `sheet10` iba antes
 *   que `sheet2`.
 * - Una celda sin `r` (el estándar la permite) toma la columna siguiente.
 */

export type Celda = string | number | null;

export interface FilaLeida {
  /** El número de fila del archivo, desde 1: el que ve la persona al abrirlo. */
  fila: number;
  celdas: Celda[];
}

interface EntradaZip {
  metodo: number;
  tamanoComprimido: number;
  offsetLocal: number;
}

function entradasZip(v: DataView): Record<string, EntradaZip> {
  // Fin del directorio central: firma 0x06054b50, buscada desde el final.
  let fin = v.byteLength - 22;
  while (fin >= 0 && v.getUint32(fin, true) !== 0x06054b50) fin -= 1;
  if (fin < 0) throw new Error("El archivo no es un Excel (.xlsx) válido.");
  const total = v.getUint16(fin + 10, true);
  let pos = v.getUint32(fin + 16, true);
  const entradas: Record<string, EntradaZip> = {};
  const decodificador = new TextDecoder();
  for (let i = 0; i < total; i += 1) {
    if (v.getUint32(pos, true) !== 0x02014b50) {
      throw new Error("El archivo Excel está dañado.");
    }
    const largoNombre = v.getUint16(pos + 28, true);
    const largoExtra = v.getUint16(pos + 30, true);
    const largoComentario = v.getUint16(pos + 32, true);
    const nombre = decodificador.decode(
      new Uint8Array(v.buffer, v.byteOffset + pos + 46, largoNombre),
    );
    entradas[nombre] = {
      metodo: v.getUint16(pos + 10, true),
      tamanoComprimido: v.getUint32(pos + 20, true),
      offsetLocal: v.getUint32(pos + 42, true),
    };
    pos += 46 + largoNombre + largoExtra + largoComentario;
  }
  return entradas;
}

async function leerEntrada(v: DataView, e: EntradaZip): Promise<string> {
  const largoNombre = v.getUint16(e.offsetLocal + 26, true);
  const largoExtra = v.getUint16(e.offsetLocal + 28, true);
  const inicio = e.offsetLocal + 30 + largoNombre + largoExtra;
  const datos = new Uint8Array(v.buffer, v.byteOffset + inicio, e.tamanoComprimido);
  if (e.metodo === 0) return new TextDecoder().decode(datos);
  if (e.metodo !== 8) {
    throw new Error("El archivo Excel usa una compresión que no se puede leer.");
  }
  // `slice` copia a un `ArrayBuffer` propio: `Blob` no acepta una vista cualquiera.
  const flujo = new Blob([datos.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(flujo).text();
}

function desescapar(s: string): string {
  return s
    .replace(/_x000D_/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function textoDe(xml: string): string {
  return desescapar([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
}

function columna(ref: string): number {
  let n = 0;
  for (const c of ref.match(/^[A-Z]+/)![0]) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** La letra de una columna, desde 0: 0 → A, 26 → AA. Para mostrar el mapeo. */
export function letraColumna(indice: number): string {
  let n = indice + 1;
  let letra = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    letra = String.fromCharCode(65 + r) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

/** La primera hoja del libro, y cómo cuenta los días. */
export interface HojaLeida {
  filas: FilaLeida[];
  /**
   * Si el libro cuenta los días desde 1904 y no desde 1900: lo hacían los
   * Excel de Mac viejos. Las fechas quedan corridas 1.462 días, y quien sabe
   * qué columna es fecha tiene que corregirlas.
   */
  fechas1904: boolean;
}

/**
 * Si `xl/workbook.xml` dice `date1904`. Se mira aparte porque el lector no
 * sabe qué celdas son fechas: solo lo sabe el mapeo.
 */
async function usaFechas1904(v: DataView, entradas: Record<string, EntradaZip>): Promise<boolean> {
  const libro = entradas["xl/workbook.xml"];
  if (!libro) return false;
  const xml = await leerEntrada(v, libro);
  return /\bdate1904="(1|true)"/.test(xml);
}

/** Las filas de la primera hoja. Las vacías no vienen: el XML no las trae. */
export async function leerXlsx(contenido: ArrayBuffer): Promise<HojaLeida> {
  const v = new DataView(contenido);
  const entradas = entradasZip(v);

  const compartidas: string[] = [];
  if (entradas["xl/sharedStrings.xml"]) {
    const xml = await leerEntrada(v, entradas["xl/sharedStrings.xml"]);
    for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) compartidas.push(textoDe(si[1]));
  }

  const hoja = Object.keys(entradas)
    .map((n) => ({ n, numero: Number(n.match(/^xl\/worksheets\/sheet(\d+)\.xml$/)?.[1]) }))
    .filter((h) => Number.isFinite(h.numero))
    .sort((a, b) => a.numero - b.numero)[0];
  if (!hoja) throw new Error("El archivo Excel no tiene hojas.");
  const xml = await leerEntrada(v, entradas[hoja.n]);

  const filas: FilaLeida[] = [];
  let siguienteFila = 1;
  for (const f of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const numero = Number(f[1].match(/\br="(\d+)"/)?.[1] ?? siguienteFila);
    siguienteFila = numero + 1;
    const celdas: Celda[] = [];
    let siguienteColumna = 0;
    for (const c of (f[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const cuerpo = c[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const col = ref ? columna(ref) : siguienteColumna;
      siguienteColumna = col + 1;

      const tipo = attrs.match(/\bt="(\w+)"/)?.[1];
      const v = cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let valor: Celda = null;
      if (tipo === "s" && v !== undefined) valor = compartidas[Number(v)] ?? null;
      else if (tipo === "inlineStr") valor = textoDe(cuerpo);
      else if (tipo === "str" || tipo === "e") valor = v === undefined ? null : desescapar(v);
      else if (tipo === "b") valor = v === undefined ? null : v === "1" ? "VERDADERO" : "FALSO";
      else if (v !== undefined) {
        const n = Number(v);
        valor = Number.isFinite(n) ? n : desescapar(v);
      }
      celdas[col] = valor;
    }
    // Los huecos de un arreglo disperso pasan a `null`: más fácil de recorrer.
    filas.push({ fila: numero, celdas: Array.from(celdas, (x) => x ?? null) });
  }
  return { filas, fechas1904: await usaFechas1904(v, entradas) };
}
