import { describe, expect, it } from "vitest";

import type { DatoExtraido, EventoProgreso } from "../types/asistente.types";
import { aplicarEvento, tiempoTranscurrido, type LecturasEnVivo } from "./lecturaEnVivo";

const dato = (campo: string, valor: string): DatoExtraido => ({
  paso: "EMPRESA",
  campo,
  valor,
  etiqueta: campo,
  fuente: { documento: "RUT" },
  confianza: "ALTA",
});

const evento = (e: Partial<EventoProgreso>): EventoProgreso => ({
  etapa: "LEYENDO",
  documento: "RUT",
  documentoId: "d-1",
  mensaje: "Leyendo el RUT…",
  datos: [],
  ...e,
});

describe("aplicarEvento", () => {
  it("una lectura nueva entra con su mensaje", () => {
    const r = aplicarEvento({}, evento({ etapa: "EN_COLA", mensaje: "El RUT entró a la cola." }));
    expect(r["d-1"]).toMatchObject({ etapa: "EN_COLA", tipo: "RUT", mensaje: "El RUT entró a la cola.", datos: [] });
  });

  it("los datos de EXTRAYENDO se acumulan en el orden en que llegan", () => {
    let r: LecturasEnVivo = {};
    r = aplicarEvento(r, evento({ etapa: "EXTRAYENDO", datos: [dato("razonSocial", "ACME")] }));
    r = aplicarEvento(r, evento({ etapa: "EXTRAYENDO", datos: [dato("nit", "900123456")] }));
    expect(r["d-1"].datos.map((d) => d.campo)).toEqual(["razonSocial", "nit"]);
  });

  it("un dato que llega dos veces no se duplica: gana el último, en su lugar", () => {
    let r: LecturasEnVivo = {};
    r = aplicarEvento(r, evento({ etapa: "EXTRAYENDO", datos: [dato("razonSocial", "ACM"), dato("nit", "9001")] }));
    r = aplicarEvento(r, evento({ etapa: "EXTRAYENDO", datos: [dato("razonSocial", "ACME S.A.S.")] }));
    expect(r["d-1"].datos.map((d) => [d.campo, d.valor])).toEqual([
      ["razonSocial", "ACME S.A.S."],
      ["nit", "9001"],
    ]);
  });

  it("un evento sin datos no borra lo que ya había llegado", () => {
    let r: LecturasEnVivo = {};
    r = aplicarEvento(r, evento({ etapa: "EXTRAYENDO", datos: [dato("nit", "9001")] }));
    r = aplicarEvento(r, evento({ etapa: "LEYENDO", mensaje: "Sigo leyendo…" }));
    expect(r["d-1"]).toMatchObject({ mensaje: "Sigo leyendo…", datos: [dato("nit", "9001")] });
  });

  it.each(["LISTO", "ERROR"] as const)("%s saca la lectura: lo demás lo cuenta el documento", (etapa) => {
    const r = aplicarEvento(aplicarEvento({}, evento({})), evento({ etapa }));
    expect(r).toEqual({});
  });

  it("las lecturas de dos documentos no se mezclan", () => {
    let r: LecturasEnVivo = {};
    r = aplicarEvento(r, evento({ documentoId: "d-1", etapa: "EXTRAYENDO", datos: [dato("nit", "1")] }));
    r = aplicarEvento(r, evento({ documentoId: "d-2", documento: "CAMARA_COMERCIO", datos: [] }));
    r = aplicarEvento(r, evento({ documentoId: "d-2", etapa: "ERROR" }));
    expect(Object.keys(r)).toEqual(["d-1"]);
  });

  it("no toca el estado anterior", () => {
    const previas = aplicarEvento({}, evento({ etapa: "EXTRAYENDO", datos: [dato("nit", "1")] }));
    const copia = structuredClone(previas);
    aplicarEvento(previas, evento({ etapa: "EXTRAYENDO", datos: [dato("dv", "8")] }));
    expect(previas).toEqual(copia);
  });
});

describe("tiempoTranscurrido", () => {
  const desde = "2026-09-21T10:00:00.000Z";
  const a = (s: number) => Date.parse(desde) + s * 1000;

  it("minutos y segundos", () => {
    expect(tiempoTranscurrido(desde, a(7))).toBe("00:07");
    expect(tiempoTranscurrido(desde, a(92))).toBe("01:32");
  });

  it("nunca negativo si el reloj del navegador va atrasado", () => {
    expect(tiempoTranscurrido(desde, a(-3))).toBe("00:00");
  });
});
