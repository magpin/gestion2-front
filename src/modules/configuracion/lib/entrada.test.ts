import { describe, expect, it } from "vitest";

import type { EstadoConfiguracion, EstadoPaso, Paso } from "../types/configuracion.types";
import { destinoAlEntrar } from "./entrada";

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

  it("si ya empezó otro paso, entra a operar", () => {
    expect(
      destinoAlEntrar(
        estado([
          ["EMPRESA", "LISTO"],
          ["SEDES", "FALTA"],
          ["SITUACION_LEGAL", "PENDIENTE"],
        ]),
      ),
    ).toBe("/dashboard");
  });

  it("completa, al tablero", () => {
    expect(destinoAlEntrar(estado([["EMPRESA", "LISTO"]], null))).toBe("/dashboard");
  });
});
