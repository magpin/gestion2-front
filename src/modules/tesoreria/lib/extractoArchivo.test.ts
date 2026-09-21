// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  ajustarFormato,
  conEncabezados,
  cuadre,
  decodificarTexto,
  formatoGuardado,
  interpretar,
  leerCsv,
  leerFecha,
  leerNumero,
  ordenFechaDudoso,
  proponerFormato,
  sha256Hex,
  type FilaLeida,
  type FormatoExtracto,
} from "./extractoArchivo";

const filas = (...celdas: Array<Array<string | number | null>>): FilaLeida[] =>
  celdas.map((c, i) => ({ fila: i + 1, celdas: c }));

describe("leerCsv", () => {
  it("detecta el punto y coma de Excel en español", () => {
    expect(leerCsv("Fecha;Valor\n01/09/2026;1.234,50\n")).toEqual([
      { fila: 1, celdas: ["Fecha", "Valor"] },
      { fila: 2, celdas: ["01/09/2026", "1.234,50"] },
    ]);
  });

  it("detecta la coma, y respeta la coma entre comillas", () => {
    expect(leerCsv('fecha,descripcion,valor\r\n2026-09-01,"Pago, factura 12",-5000')[1].celdas).toEqual([
      "2026-09-01",
      "Pago, factura 12",
      "-5000",
    ]);
  });

  it("comillas duplicadas y un salto de línea adentro de un campo", () => {
    const [fila] = leerCsv('"Dijo ""hola""\nen dos líneas";5');
    expect(fila.celdas).toEqual(['Dijo "hola"\nen dos líneas', "5"]);
  });

  it("detecta el tabulador", () => {
    expect(leerCsv("a\tb\tc\n1\t2\t3")[1].celdas).toEqual(["1", "2", "3"]);
  });

  it("salta las filas vacías pero conserva la numeración", () => {
    expect(leerCsv("a;b\n;\n\n1;2").map((f) => f.fila)).toEqual([1, 4]);
  });
});

describe("decodificarTexto", () => {
  it("UTF-8 con marca", () => {
    expect(decodificarTexto(new TextEncoder().encode("\uFEFFDébito"))).toBe("Débito");
  });

  it("Windows-1252 cuando no es UTF-8: así exporta Excel en español", () => {
    expect(decodificarTexto(new Uint8Array([0x44, 0xe9, 0x62]))).toBe("Déb");
  });
});

describe("leerNumero", () => {
  it.each([
    ["1.234.567,89", ",", 1234567.89],
    ["1,234,567.89", ".", 1234567.89],
    ["$ 5.000", ",", 5000],
    ["-5.000", ",", -5000],
    ["5.000-", ",", -5000],
    ["(5.000)", ",", -5000],
    ["$ -5.000,50", ",", -5000.5],
    ["92400", ",", 92400],
  ] as const)("«%s» con decimal «%s» es %s", (texto, decimal, esperado) => {
    expect(leerNumero(texto, decimal)).toBe(esperado);
  });

  it("el mismo «1.234» cambia según el separador decimal: no se adivina", () => {
    expect(leerNumero("1.234", ",")).toBe(1234);
    expect(leerNumero("1.234", ".")).toBe(1.234);
  });

  it("un número de Excel no pasa por el separador", () => {
    expect(leerNumero(1234.5, ",")).toBe(1234.5);
  });

  it("vacío es null; texto es NaN", () => {
    expect(leerNumero(null, ",")).toBeNull();
    expect(leerNumero("  ", ",")).toBeNull();
    expect(leerNumero("N/A", ",")).toBeNaN();
  });

  it("«1,234,567» leído con coma decimal es un error, no 1,234", () => {
    expect(leerNumero("1,234,567", ",")).toBeNaN();
  });
});

describe("leerFecha", () => {
  it.each([
    ["01/09/2026", "DMA", "2026-09-01"],
    ["09/01/2026", "MDA", "2026-09-01"],
    ["2026-09-01", "DMA", "2026-09-01"],
    ["2026/09/01", "MDA", "2026-09-01"],
    ["1-sep-26", "DMA", "2026-09-01"],
    ["01-SET-2026", "DMA", "2026-09-01"],
    ["20260901", "DMA", "2026-09-01"],
    ["01/09/2026 00:00:00", "DMA", "2026-09-01"],
    ["2026-09-01T00:00:00", "DMA", "2026-09-01"],
  ] as const)("«%s» (%s) es %s", (texto, orden, esperado) => {
    expect(leerFecha(texto, orden)).toBe(esperado);
  });

  it("el número de serie de Excel", () => {
    expect(leerFecha(46266, "DMA")).toBe("2026-09-01");
    expect(leerFecha("46266", "DMA")).toBe("2026-09-01");
  });

  it("un Excel que cuenta desde 1904 corre el número de serie 1.462 días", () => {
    expect(leerFecha(46266 - 1462, "DMA", true)).toBe("2026-09-01");
  });

  it("una fecha que no existe no se corre al mes siguiente", () => {
    expect(leerFecha("31/02/2026", "DMA")).toBeNull();
  });

  it("lo que no es fecha es null", () => {
    expect(leerFecha("SALDO ANTERIOR", "DMA")).toBeNull();
    expect(leerFecha(null, "DMA")).toBeNull();
  });
});

describe("proponerFormato", () => {
  const BANCO = filas(
    ["BANCO DE PRUEBA S.A."],
    ["Cuenta de ahorros 123"],
    ["Fecha", "Descripción", "Referencia", "Débito", "Crédito", "Saldo"],
    ["01/09/2026", "GMF 4X1000", null, "400,00", null, "999.600,00"],
    ["15/09/2026", "CONSIGNACION", "778899", null, "1.000.000,00", "1.999.600,00"],
  );

  it("encuentra la fila de encabezados y las columnas por su nombre", () => {
    expect(proponerFormato(BANCO)).toEqual({
      version: 1,
      filaInicio: 4,
      fecha: 0,
      descripcion: 1,
      referencia: 2,
      valor: { modo: "DOS", debito: 3, credito: 4 },
      decimal: ",",
      ordenFecha: "DMA",
    });
  });

  it("una sola columna de valor, y nunca la de saldo", () => {
    const f = proponerFormato(
      filas(["fecha", "saldo", "concepto", "valor"], ["2026-09-01", "10.00", "x", "-5.00"]),
    );
    expect(f.valor).toEqual({ modo: "UNA", columna: 3 });
    expect(f.decimal).toBe(".");
    expect(f.ordenFecha).toBe("AMD");
  });

  it("«150,000» sin decimales es punto decimal con coma de miles, y «150.000» al revés", () => {
    const f = (valor: string) =>
      proponerFormato(filas(["Fecha", "Descripción", "Valor"], ["2026-09-01", "x", valor])).decimal;
    expect(f("150,000")).toBe(".");
    expect(f("150.000")).toBe(",");
  });

  it("un 13 en la segunda posición dice que el mes va primero", () => {
    const f = proponerFormato(filas(["Fecha", "Descripción", "Valor"], ["09/13/2026", "x", "1"]));
    expect(f.ordenFecha).toBe("MDA");
  });

  it("sin encabezados propone fecha, descripción y valor en orden", () => {
    const f = proponerFormato(filas(["01/09/2026", "x", "-400"]));
    expect(f).toMatchObject({ filaInicio: 1, fecha: 0, descripcion: 1, valor: { modo: "UNA", columna: 2 } });
  });
});

describe("ordenFechaDudoso", () => {
  const conFechas = (...fechas: Array<string | number>) =>
    filas(["Fecha"], ...fechas.map((x) => [x, "x", "1"]));
  const f = { filaInicio: 2, fecha: 0 } as FormatoExtracto;

  it("sin ningún número mayor a 12, no se puede saber el orden", () => {
    expect(ordenFechaDudoso(conFechas("01/09/2026", "10/09/2026"), f)).toBe(true);
  });

  it("un 13 en cualquiera de las dos posiciones lo resuelve", () => {
    expect(ordenFechaDudoso(conFechas("01/09/2026", "13/09/2026"), f)).toBe(false);
    expect(ordenFechaDudoso(conFechas("09/13/2026"), f)).toBe(false);
  });

  it("con el año adelante, el mes en letras o números de Excel no hay duda", () => {
    expect(ordenFechaDudoso(conFechas("2026-09-01"), f)).toBe(false);
    expect(ordenFechaDudoso(conFechas("01-sep-2026"), f)).toBe(false);
    expect(ordenFechaDudoso(conFechas(46266), f)).toBe(false);
  });
});

const DOS_COLUMNAS: FormatoExtracto = {
  version: 1,
  filaInicio: 2,
  fecha: 0,
  descripcion: 1,
  referencia: 2,
  valor: { modo: "DOS", debito: 3, credito: 4 },
  decimal: ",",
  ordenFecha: "DMA",
};

describe("interpretar", () => {
  it("cada fila a línea, con su número de fila", () => {
    const { lineas, errores } = interpretar(
      filas(
        ["Fecha", "Descripción", "Ref", "Débito", "Crédito"],
        ["01/09/2026", "GMF  4X1000", null, "400,00", null],
        ["15/09/2026", "CONSIGNACION", 778899, null, "1.000.000,00"],
      ),
      DOS_COLUMNAS,
    );
    expect(errores).toEqual([]);
    expect(lineas).toEqual([
      { fila: 2, fecha: "2026-09-01", descripcion: "GMF 4X1000", valor: 400, tipo: "DEBITO" },
      { fila: 3, fecha: "2026-09-15", descripcion: "CONSIGNACION", referencia: "778899", valor: 1000000, tipo: "CREDITO" },
    ]);
  });

  it("el débito en negativo dentro de su propia columna sigue siendo débito", () => {
    const { lineas } = interpretar(
      filas(["h"], ["01/09/2026", "x", null, "-400,00", null]),
      DOS_COLUMNAS,
    );
    expect(lineas[0]).toMatchObject({ valor: 400, tipo: "DEBITO" });
  });

  it("una columna con signo: negativo es débito", () => {
    const { lineas } = interpretar(filas(["h"], ["01/09/2026", "x", null, -400]), {
      ...DOS_COLUMNAS,
      valor: { modo: "UNA", columna: 3 },
    });
    expect(lineas[0]).toMatchObject({ valor: 400, tipo: "DEBITO" });
  });

  it("lo que no se puede leer va a errores con su fila y el motivo, y no se sube", () => {
    const { lineas, errores } = interpretar(
      filas(
        ["h"],
        ["SALDO ANTERIOR", null, null, null, "5.000,00"],
        ["01/09/2026", null, null, "1,00", null],
        ["01/09/2026", "x", null, "abc", null],
        ["01/09/2026", "x", null, "1,00", "2,00"],
        ["01/09/2026", "x", null, null, null],
        [null, null, null, null, null],
      ),
      DOS_COLUMNAS,
    );
    expect(lineas).toEqual([]);
    expect(errores).toEqual([
      { fila: 2, motivo: "La fecha «SALDO ANTERIOR» no se entiende." },
      { fila: 3, motivo: "Sin descripción." },
      { fila: 4, motivo: "El débito «abc» no es un número." },
      { fila: 5, motivo: "Trae débito y crédito a la vez." },
      { fila: 6, motivo: "El valor es cero." },
    ]);
  });

  it("redondea al centavo lo que Excel guarda como 400.00000000001", () => {
    const { lineas } = interpretar(filas(["h"], ["01/09/2026", "x", null, 400.00000000001, null]), DOS_COLUMNAS);
    expect(lineas[0].valor).toBe(400);
  });
});

describe("cuadre", () => {
  const lineas = [
    { fila: 2, fecha: "2026-09-15", descripcion: "x", valor: 1000000, tipo: "CREDITO" as const },
    { fila: 3, fecha: "2026-09-01", descripcion: "y", valor: 400, tipo: "DEBITO" as const },
  ];

  it("cuadra: inicial más créditos menos débitos es el final", () => {
    expect(cuadre(lineas, 500000, 1499600)).toEqual({
      desde: "2026-09-01",
      hasta: "2026-09-15",
      creditos: 1000000,
      debitos: 400,
      calculado: 1499600,
      diferencia: 0,
      cuadra: true,
    });
  });

  it("no cuadra, y dice por cuánto: casi siempre, el débito y el crédito cruzados", () => {
    expect(cuadre(lineas, 500000, 1500400)).toMatchObject({ cuadra: false, diferencia: 800 });
  });

  it("los centavos no dejan residuo", () => {
    const tres = [0.1, 0.2, 0.3].map((valor, i) => ({
      fila: i, fecha: "2026-09-01", descripcion: "x", valor, tipo: "CREDITO" as const,
    }));
    expect(cuadre(tres, 0, 0.6).cuadra).toBe(true);
  });
});

describe("el mapeo guardado", () => {
  const archivo = filas(
    ["Fecha", "Descripción", "Referencia", "Débito", "Crédito"],
    ["01/09/2026", "x", null, "1,00", null],
  );

  it("se guarda con los nombres de las columnas", () => {
    expect(conEncabezados(DOS_COLUMNAS, archivo).encabezados).toEqual({
      fecha: "Fecha",
      descripcion: "Descripción",
      referencia: "Referencia",
      debito: "Débito",
      credito: "Crédito",
    });
  });

  it("encuentra las columnas por su nombre si el banco las movió", () => {
    const guardado = conEncabezados(DOS_COLUMNAS, archivo);
    const movido = filas(
      ["Extracto de septiembre"],
      ["Crédito", "Fecha", "Débito", "Descripción", "Referencia"],
      ["1,00", "01/09/2026", null, "x", null],
    );
    expect(ajustarFormato(guardado, movido)).toMatchObject({
      filaInicio: 3,
      fecha: 1,
      descripcion: 3,
      referencia: 4,
      valor: { modo: "DOS", debito: 2, credito: 0 },
    });
  });

  it("se revisa antes de creerle a la API", () => {
    expect(formatoGuardado(DOS_COLUMNAS as unknown as Record<string, unknown>)).toEqual(DOS_COLUMNAS);
    expect(formatoGuardado(null)).toBeNull();
    expect(formatoGuardado({ version: 1, fecha: "A" })).toBeNull();
    expect(formatoGuardado({ ...DOS_COLUMNAS, decimal: ";" } as unknown as Record<string, unknown>)).toBeNull();
  });
});

describe("sha256Hex", () => {
  it("es la huella que espera el backend: 64 caracteres hexadecimales", async () => {
    const h = await sha256Hex(new TextEncoder().encode("abc").buffer);
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
