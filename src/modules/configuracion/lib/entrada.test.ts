import { describe, expect, it } from "vitest";

import { MARIA_PROXIMAMENTE } from "@/modules/asistente/proximamente";
import type { EstadoConfiguracion, EstadoPaso, Paso } from "../types/configuracion.types";
import { destinoAlEntrar, permitidaSinConfigurar } from "./entrada";

const paso = (clave: Paso["clave"], estado: EstadoPaso): Paso => ({
  clave,
  nombre: clave,
  orden: 1,
  obligatorio: true,
  estado,
  resumen: "",
  faltantes: [],
  opcionales: [],
});

const estado = (
  pasos: Array<[Paso["clave"], EstadoPaso]>,
  siguiente: Paso["clave"] | null = "SEDES",
): EstadoConfiguracion => ({
  pasos: pasos.map(([c, e]) => paso(c, e)),
  completados: pasos.filter(([, e]) => e === "LISTO").length,
  totalObligatorios: 5,
  porcentaje: 0,
  completa: siguiente === null,
  siguiente,
  modo: null,
  bienvenidaVista: false,
});

describe("destinoAlEntrar", () => {
  it("una empresa recién creada —«Empresa» ya lista, lo demás sin tocar— va a la bienvenida", () => {
    expect(
      destinoAlEntrar(
        estado([
          ["EMPRESA", "LISTO"],
          ["SEDES", "PENDIENTE"],
          ["SITUACION_LEGAL", "PENDIENTE"],
          ["PLAN_CUENTAS", "BLOQUEADO"],
          ["RESOLUCIONES", "PENDIENTE"],
        ]),
      ),
    ).toBe("/configuracion/bienvenida");
  });

  it("si ya empezó otro paso, va directo al que sigue: no entra a operar a medio configurar", () => {
    expect(
      destinoAlEntrar(
        estado([
          ["EMPRESA", "LISTO"],
          ["SEDES", "FALTA"],
          ["SITUACION_LEGAL", "PENDIENTE"],
        ]),
      ),
    ).toBe("/configuracion/sedes");
  });

  it("completa, al tablero", () => {
    expect(destinoAlEntrar(estado([["EMPRESA", "LISTO"]], null))).toBe("/dashboard");
  });
});

describe("destinoAlEntrar con modo y paso", () => {
  it.runIf(MARIA_PROXIMAMENTE)("con María cerrada, quien eligió IA sigue a mano", () => {
    expect(destinoAlEntrar({ ...estado([["EMPRESA", "LISTO"], ["SEDES", "FALTA"]]), modo: "IA" })).toBe(
      "/configuracion/sedes",
    );
  });

  it.skipIf(MARIA_PROXIMAMENTE)("quien eligió IA vuelve a IA", () => {
    expect(destinoAlEntrar({ ...estado([["EMPRESA", "LISTO"], ["SEDES", "FALTA"]]), modo: "IA" })).toBe(
      "/configuracion/ia",
    );
  });

  it("el paso que sigue, con la ruta del paso", () => {
    expect(
      destinoAlEntrar(estado([["EMPRESA", "LISTO"], ["SEDES", "LISTO"]], "PLAN_CUENTAS")),
    ).toBe("/configuracion/plan_cuentas");
  });
});

describe("permitidaSinConfigurar", () => {
  it("el plan de cuentas se puede mirar desde el paso; el resto no", () => {
    expect(permitidaSinConfigurar("/dashboard/plan-cuentas")).toBe(true);
    expect(permitidaSinConfigurar("/dashboard/ventas")).toBe(false);
    expect(permitidaSinConfigurar("/dashboard")).toBe(false);
  });
});
