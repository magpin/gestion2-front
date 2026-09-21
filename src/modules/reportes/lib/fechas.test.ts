import { describe, expect, it } from "vitest";

import { leerVisor, rutaDelVisor } from "./eleccion";
import { deTextoAIso, paginasCorto, rangoCorto, rangoLargo, ultimaVez } from "./fechas";

describe("las fechas en palabras", () => {
  it("un rango del mismo mes nombra el mes una vez", () => {
    expect(rangoCorto("2026-09-01", "2026-09-30")).toBe("1 – 30 sep 2026");
    expect(rangoLargo("2026-09-01", "2026-09-30")).toBe("del 1 al 30 de septiembre de 2026");
  });

  it("uno que cruza el mes nombra los dos", () => {
    expect(rangoCorto("2026-01-01", "2026-09-21")).toBe("1 ene – 21 sep 2026");
  });

  it("uno que cruza el año nombra los dos años", () => {
    expect(rangoCorto("2025-12-15", "2026-01-10")).toBe("15 dic 2025 – 10 ene 2026");
  });

  it("una fecha escrita a mano que no existe no pasa", () => {
    expect(deTextoAIso("31/08/2026")).toBe("2026-08-31");
    expect(deTextoAIso("31/09/2026")).toBeNull();
    expect(deTextoAIso("29/02/2025")).toBeNull();
    expect(deTextoAIso("2026-08-31")).toBeNull();
  });

  it("la última vez se dice como hoy, ayer o la fecha, en hora de Colombia", () => {
    // 15:42 UTC son las 10:42 en Bogotá.
    expect(ultimaVez("2026-09-21T15:42:00Z", "2026-09-21")).toBe("Hoy 10:42");
    expect(ultimaVez("2026-09-20T15:42:00Z", "2026-09-21")).toBe("Ayer 10:42");
    expect(ultimaVez("2026-09-18T15:42:00Z", "2026-09-21")).toBe("18 sep");
    // Las 2 de la mañana UTC del 21 son todavía el 20 en Colombia.
    expect(ultimaVez("2026-09-21T02:00:00Z", "2026-09-21")).toBe("Ayer 21:00");
  });

  it("las páginas en corto", () => {
    expect(paginasCorto("2 páginas")).toBe("2 págs.");
    expect(paginasCorto("1 página")).toBe("1 pág.");
  });
});

describe("la elección viaja en la URL", () => {
  const ida = (ruta: string) => leerVisor(new URLSearchParams(ruta.split("?")[1]));

  it("un atajo vuelve como atajo, no como fechas", () => {
    const ruta = rutaDelVisor("VENTAS_POR_CLIENTE", { tipo: "ATAJO_RANGO", atajo: "ESTE_MES" });
    expect(ida(ruta)).toEqual({
      reporte: "VENTAS_POR_CLIENTE",
      eleccion: { tipo: "ATAJO_RANGO", atajo: "ESTE_MES" },
    });
  });

  it("unas fechas a mano vuelven fijas", () => {
    const ruta = rutaDelVisor("VENTAS_POR_CLIENTE", {
      tipo: "RANGO",
      desde: "2026-03-01",
      hasta: "2026-03-15",
    });
    expect(ida(ruta)?.eleccion).toEqual({ tipo: "RANGO", desde: "2026-03-01", hasta: "2026-03-15" });
  });

  it("un corte a mano vuelve fijo", () => {
    const ruta = rutaDelVisor("ANTIGUEDAD_CARTERA", { tipo: "CORTE", corte: "2026-06-30" });
    expect(ida(ruta)?.eleccion).toEqual({ tipo: "CORTE", corte: "2026-06-30" });
  });

  it("un reporte que no existe no se lee", () => {
    expect(leerVisor(new URLSearchParams("reporte=OTRO"))).toBeNull();
  });

  it("un atajo de rango en la cartera cae a hoy", () => {
    expect(leerVisor(new URLSearchParams("reporte=ANTIGUEDAD_CARTERA&atajo=ESTE_MES"))?.eleccion).toEqual({
      tipo: "ATAJO_CORTE",
      atajo: "HOY",
    });
  });
});
