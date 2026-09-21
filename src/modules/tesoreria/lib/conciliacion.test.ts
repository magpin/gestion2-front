import { describe, expect, it } from "vitest";

import { estadoDelCierre } from "./conciliacion";

const cruzada = { grupo_id: "g-1", nota: null };
const suelta = { grupo_id: null, nota: null };
const anotada = { grupo_id: null, nota: "Cobró dos veces la comisión" };

describe("estadoDelCierre", () => {
  it("todo cruzado se cierra", () => {
    expect(estadoDelCierre([cruzada, cruzada])).toEqual({
      sinExplicar: 0,
      porReclamar: 0,
      sePuedeCerrar: true,
    });
  });

  it("una línea suelta sin nota impide cerrar", () => {
    expect(estadoDelCierre([cruzada, suelta])).toMatchObject({
      sinExplicar: 1,
      sePuedeCerrar: false,
    });
  });

  it("una línea anotada como error del banco está explicada: se cierra y se cuenta por reclamar", () => {
    expect(estadoDelCierre([cruzada, anotada])).toEqual({
      sinExplicar: 0,
      porReclamar: 1,
      sePuedeCerrar: true,
    });
  });

  it("una nota vacía no explica nada", () => {
    expect(estadoDelCierre([{ grupo_id: null, nota: "" }]).sePuedeCerrar).toBe(false);
  });

  it("una línea cruzada con nota vieja no cuenta como por reclamar", () => {
    expect(estadoDelCierre([{ grupo_id: "g-1", nota: "vieja" }]).porReclamar).toBe(0);
  });

  it("un extracto sin líneas se puede cerrar: el backend decide si cuadran los saldos", () => {
    expect(estadoDelCierre([]).sePuedeCerrar).toBe(true);
  });
});
