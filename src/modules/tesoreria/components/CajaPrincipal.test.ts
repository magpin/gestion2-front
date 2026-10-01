import { describe, expect, it } from "vitest";

import type { CajaResumen } from "../types/tesoreria.types";
import { elegirCajaPrincipal } from "./CajaPrincipal";

const caja = (id: string, cambios: Partial<CajaResumen> = {}): CajaResumen => ({
  id,
  nombre: id,
  tipo: "PRINCIPAL",
  sede_id: null,
  cuenta_id: "c",
  activa: true,
  responsable: null,
  saldo: "0",
  ultimo_movimiento: null,
  ...cambios,
});

describe("elegirCajaPrincipal", () => {
  it("con dos sedes, la de la sede principal (como Computintas en QA)", () => {
    const cajas = [
      caja("sede-2", { sede_id: "s2" }),
      caja("principal", { sede_id: "s1" }),
    ];
    expect(elegirCajaPrincipal(cajas, "s1")?.id).toBe("principal");
  });

  it("nunca la caja menor, aunque sea la única de la sede principal", () => {
    const cajas = [
      caja("menor", { tipo: "MENOR", sede_id: "s1" }),
      caja("unica", { sede_id: "s2" }),
    ];
    expect(elegirCajaPrincipal(cajas, "s1")?.id).toBe("unica");
  });

  it("ni una inactiva", () => {
    const cajas = [caja("vieja", { sede_id: "s1", activa: false }), caja("nueva")];
    expect(elegirCajaPrincipal(cajas, "s1")?.id).toBe("nueva");
  });

  it("si hay varias y ninguna es de la sede principal, no adivina", () => {
    const cajas = [caja("a", { sede_id: "s2" }), caja("b", { sede_id: "s3" })];
    expect(elegirCajaPrincipal(cajas, "s1")).toBeNull();
  });

  it("sin cajas, ninguna", () => {
    expect(elegirCajaPrincipal([], "s1")).toBeNull();
  });
});
