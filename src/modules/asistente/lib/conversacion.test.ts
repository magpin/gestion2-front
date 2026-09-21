import { describe, expect, it } from "vitest";

import type { ConversacionEnLista } from "../types/conversacion.types";
import { agruparPorFecha, detalleDeConversacion, partirEventos } from "./conversacion";

describe("partirEventos", () => {
  it("devuelve los eventos completos y guarda lo que quedó a medias", () => {
    const { eventos, resto } = partirEventos(
      'data: {"tipo":"TROZO","texto":"Ho"}\n\ndata: {"tipo":"TROZO","texto":"la"}\n\ndata: {"tipo":"FI',
    );
    expect(eventos).toEqual([
      { tipo: "TROZO", texto: "Ho" },
      { tipo: "TROZO", texto: "la" },
    ]);
    expect(resto).toBe('data: {"tipo":"FI');
  });

  it("un evento que no parsea se descarta sin tumbar a los demás", () => {
    const { eventos } = partirEventos('data: {roto\n\ndata: {"tipo":"TROZO","texto":"ok"}\n\n');
    expect(eventos).toEqual([{ tipo: "TROZO", texto: "ok" }]);
  });

  it("el texto con saltos de línea viaja escapado dentro del JSON", () => {
    const { eventos } = partirEventos(`data: ${JSON.stringify({ tipo: "TROZO", texto: "a\n\nb" })}\n\n`);
    expect(eventos).toEqual([{ tipo: "TROZO", texto: "a\n\nb" }]);
  });
});

const conversacion = (id: string, ultima_en: string, preguntas = 2): ConversacionEnLista => ({
  id,
  titulo: id,
  preguntas,
  creada_en: ultima_en,
  archivada_en: null,
  ultima_en,
});

describe("agruparPorFecha", () => {
  const ahora = new Date(2026, 8, 21, 10, 0);

  it("agrupa en Hoy, Ayer, Esta semana y Antes, sin grupos vacíos", () => {
    const grupos = agruparPorFecha(
      [
        conversacion("hoy", new Date(2026, 8, 21, 8, 0).toISOString()),
        conversacion("anoche", new Date(2026, 8, 20, 23, 50).toISOString()),
        conversacion("lunes", new Date(2026, 8, 15, 12, 0).toISOString()),
        conversacion("agosto", new Date(2026, 7, 2, 12, 0).toISOString()),
      ],
      ahora,
    );
    expect(grupos.map((g) => [g.rotulo, g.conversaciones.map((c) => c.id)])).toEqual([
      ["Hoy", ["hoy"]],
      ["Ayer", ["anoche"]],
      ["Esta semana", ["lunes"]],
      ["Antes", ["agosto"]],
    ]);
    expect(agruparPorFecha([conversacion("hoy", ahora.toISOString())], ahora)).toHaveLength(1);
  });

  it("el detalle dice cuántas preguntas y la hora, o la fecha si no es de hoy", () => {
    expect(detalleDeConversacion(conversacion("a", new Date(2026, 8, 21, 14, 5).toISOString(), 1), ahora)).toBe(
      "1 pregunta · 14:05",
    );
    expect(detalleDeConversacion(conversacion("b", new Date(2026, 8, 12, 9, 0).toISOString(), 3), ahora)).toMatch(
      /^3 preguntas · 12 sept?$/,
    );
  });
});
