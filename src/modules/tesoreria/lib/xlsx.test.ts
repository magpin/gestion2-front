// @vitest-environment node
// `DecompressionStream` existe en Node pero no en jsdom.
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { leerXlsx, letraColumna } from "./xlsx";

/**
 * Un zip mínimo, armado a mano: lo justo para que `leerXlsx` lo lea como lo
 * haría con uno de Excel. `comprimir` elige deflate (método 8) o guardado
 * (método 0), los dos que se ven en la práctica.
 */
function zip(archivos: Record<string, string>, comprimir = true): ArrayBuffer {
  const enc = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const n = enc.encode(nombre);
    const crudo = enc.encode(contenido);
    const datos = comprimir ? new Uint8Array(deflateRawSync(crudo)) : crudo;
    const metodo = comprimir ? 8 : 0;

    const local = new Uint8Array(30 + n.length + datos.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, metodo, true);
    lv.setUint32(18, datos.length, true);
    lv.setUint32(22, crudo.length, true);
    lv.setUint16(26, n.length, true);
    local.set(n, 30);
    local.set(datos, 30 + n.length);

    const central = new Uint8Array(46 + n.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, metodo, true);
    cv.setUint32(20, datos.length, true);
    cv.setUint32(24, crudo.length, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(42, offset, true);
    central.set(n, 46);

    locales.push(local);
    centrales.push(central);
    offset += local.length;
  }
  const tamanoCentral = centrales.reduce((t, c) => t + c.length, 0);
  const fin = new Uint8Array(22);
  const fv = new DataView(fin.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, centrales.length, true);
  fv.setUint16(10, centrales.length, true);
  fv.setUint32(12, tamanoCentral, true);
  fv.setUint32(16, offset, true);

  const partes = [...locales, ...centrales, fin];
  const total = new Uint8Array(partes.reduce((t, p) => t + p.length, 0));
  let pos = 0;
  for (const p of partes) {
    total.set(p, pos);
    pos += p.length;
  }
  return total.buffer;
}

const COMPARTIDAS = `<sst><si><t>Fecha</t></si><si><t>Descripción</t></si><si><r><t>GMF </t></r><r><t>4X1000</t></r></si><si><t>Tom &amp;amp; Jerry &amp; Cía</t></si></sst>`;

const HOJA = `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="3"><c r="A3"><v>46266</v></c><c r="B3" t="s"><v>2</v></c><c r="D3"><v>-1234.5</v></c></row>
<row r="4"><c r="A4" t="inlineStr"><is><t>01/09/2026</t></is></c><c r="B4" t="s"><v>3</v></c></row>
<row r="5"><c t="str"><v>sin r</v></c><c><v>7</v></c></row>
</sheetData></worksheet>`;

describe("leerXlsx", () => {
  for (const comprimir of [true, false]) {
    it(`lee la primera hoja ${comprimir ? "comprimida" : "sin comprimir"}`, async () => {
      const { filas } = await leerXlsx(
        zip({ "xl/sharedStrings.xml": COMPARTIDAS, "xl/worksheets/sheet1.xml": HOJA }, comprimir),
      );
      expect(filas.map((f) => f.fila)).toEqual([1, 3, 4, 5]);
      expect(filas[0].celdas).toEqual(["Fecha", "Descripción"]);
    });
  }

  it("un número llega como número y un hueco como null", async () => {
    const { filas: [, fila3] } = await leerXlsx(
      zip({ "xl/sharedStrings.xml": COMPARTIDAS, "xl/worksheets/sheet1.xml": HOJA }),
    );
    expect(fila3.celdas).toEqual([46266, "GMF 4X1000", null, -1234.5]);
  });

  it("junta los tramos con formato de una cadena compartida, y desescapa &amp; al final", async () => {
    const { filas } = await leerXlsx(
      zip({ "xl/sharedStrings.xml": COMPARTIDAS, "xl/worksheets/sheet1.xml": HOJA }),
    );
    expect(filas[2].celdas).toEqual(["01/09/2026", "Tom &amp; Jerry & Cía"]);
  });

  it("una celda sin referencia toma la columna siguiente", async () => {
    const { filas } = await leerXlsx(
      zip({ "xl/sharedStrings.xml": COMPARTIDAS, "xl/worksheets/sheet1.xml": HOJA }),
    );
    expect(filas[3].celdas).toEqual(["sin r", 7]);
  });

  it("elige sheet2 antes que sheet10", async () => {
    const hoja = (texto: string) =>
      `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>${texto}</t></is></c></row></sheetData></worksheet>`;
    const { filas } = await leerXlsx(
      zip({ "xl/worksheets/sheet10.xml": hoja("diez"), "xl/worksheets/sheet2.xml": hoja("dos") }),
    );
    expect(filas[0].celdas).toEqual(["dos"]);
  });

  it("dice si el libro cuenta los días desde 1904", async () => {
    const hoja = { "xl/worksheets/sheet1.xml": HOJA, "xl/sharedStrings.xml": COMPARTIDAS };
    const de1900 = await leerXlsx(zip({ ...hoja, "xl/workbook.xml": "<workbook><workbookPr/></workbook>" }));
    const de1904 = await leerXlsx(
      zip({ ...hoja, "xl/workbook.xml": '<workbook><workbookPr date1904="1"/></workbook>' }),
    );
    expect(de1900.fechas1904).toBe(false);
    expect(de1904.fechas1904).toBe(true);
  });

  it("rechaza lo que no es un zip", async () => {
    await expect(leerXlsx(new TextEncoder().encode("fecha;valor").buffer)).rejects.toThrow(/xlsx/);
  });
});

describe("letraColumna", () => {
  it("cuenta como Excel", () => {
    expect([0, 25, 26, 27, 701, 702].map(letraColumna)).toEqual(["A", "Z", "AA", "AB", "ZZ", "AAA"]);
  });
});
