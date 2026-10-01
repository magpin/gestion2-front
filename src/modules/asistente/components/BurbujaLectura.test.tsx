import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BurbujaLectura, caraDeLectura } from "./BurbujaLectura";
import type { LecturaEnVivo } from "../lib/lecturaEnVivo";
import type { Documento } from "../types/asistente.types";

const creadoEn = "2026-09-21T10:00:00.000Z";
const documento: Documento = {
  id: "d-1",
  tipo: "RUT",
  estado: "LEYENDO",
  claveAlmacenamiento: "x",
  datos: [],
  error: null,
  creadoEn,
  leidoEn: null,
};

const lectura: LecturaEnVivo = {
  documentoId: "d-1",
  tipo: "RUT",
  etapa: "EXTRAYENDO",
  mensaje: "Encontré la razón social",
  datos: [
    {
      paso: "EMPRESA",
      campo: "razonSocial",
      valor: "ACME Repuestos S.A.S.",
      etiqueta: "Razón social",
      fuente: { documento: "RUT", casilla: "35" },
      confianza: "ALTA",
    },
  ],
};

function mostrar(props: Partial<React.ComponentProps<typeof BurbujaLectura>> = {}) {
  const alDetener = vi.fn();
  render(
    <BurbujaLectura
      documento={documento}
      lectura={lectura}
      enVivo
      ahora={Date.parse(creadoEn) + 7_000}
      deteniendo={false}
      alDetener={alDetener}
      {...props}
    />,
  );
  return { alDetener };
}

describe("BurbujaLectura", () => {
  it("dice lo que dijo el último evento y lo que llegó, con el tiempo desde que se subió", () => {
    mostrar();
    expect(screen.getByText("Encontré la razón social")).toBeInTheDocument();
    expect(screen.getByText("Razón social")).toBeInTheDocument();
    expect(screen.getByText("ACME Repuestos S.A.S.")).toBeInTheDocument();
    expect(screen.getByText("00:07")).toBeInTheDocument();
    expect(screen.getByText(/1 dato hasta ahora/)).toBeInTheDocument();
  });

  it("no afirma lo que nadie midió: ni porcentaje ni pasos", () => {
    mostrar();
    const texto = screen.getByRole("status").textContent ?? "";
    expect(texto).not.toMatch(/%/);
    expect(texto).not.toMatch(/Paso \d|de \d/);
  });

  it("«EN VIVO» solo con el flujo abierto", () => {
    mostrar({ enVivo: false });
    expect(screen.queryByText("EN VIVO")).not.toBeInTheDocument();
    expect(screen.getByText("RECONECTANDO")).toBeInTheDocument();
  });

  it("sin eventos todavía, dice lo que dice la base y no inventa avance", () => {
    mostrar({ lectura: undefined });
    expect(screen.getByText("Leyendo el RUT…")).toBeInTheDocument();
    expect(screen.getByText("Nada se guarda hasta que usted lo revise.")).toBeInTheDocument();
  });

  it("en cola lo dice, y no dibuja el renglón que se sigue buscando", () => {
    mostrar({ documento: { ...documento, estado: "EN_COLA" }, lectura: undefined });
    expect(screen.getByText("RUT está en la cola.")).toBeInTheDocument();
    expect(screen.getByText(/Espera su turno/)).toBeInTheDocument();
  });

  it("Detener corta esta lectura", async () => {
    const { alDetener } = mostrar();
    await userEvent.click(screen.getByRole("button", { name: "Detener" }));
    expect(alDetener).toHaveBeenCalledWith("d-1");
  });
});

describe("caraDeLectura — la cara del turno de la burbuja", () => {
  it("en reposo mientras espera en la cola", () => {
    expect(caraDeLectura({ ...documento, estado: "EN_COLA" })).toBe("reposo");
  });

  it("leyendo en cuanto empieza", () => {
    expect(caraDeLectura(documento)).toBe("leyendo");
  });

  it("manda lo que llegó por el flujo sobre lo que dice la base", () => {
    expect(caraDeLectura({ ...documento, estado: "EN_COLA" }, lectura)).toBe("leyendo");
  });
});
