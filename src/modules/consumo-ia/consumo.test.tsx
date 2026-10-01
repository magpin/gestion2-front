import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { cop, porcentaje, rangoDe, usd, type TableroConsumo } from "./consumo";
import { TableroConsumoVista } from "./TableroConsumoVista";

describe("rangoDe", () => {
  it("los días hacia atrás incluyen hoy", () => {
    expect(rangoDe("7", "2026-09-21")).toEqual({
      desde: "2026-09-15",
      hasta: "2026-09-21",
    });
    expect(rangoDe("30", "2026-09-21")).toEqual({
      desde: "2026-08-23",
      hasta: "2026-09-21",
    });
  });

  it("este mes y el mes pasado, también en enero", () => {
    expect(rangoDe("MES", "2026-09-21")).toEqual({
      desde: "2026-09-01",
      hasta: "2026-09-21",
    });
    expect(rangoDe("MES_PASADO", "2026-09-21")).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-31",
    });
    expect(rangoDe("MES_PASADO", "2026-01-10")).toEqual({
      desde: "2025-12-01",
      hasta: "2025-12-31",
    });
  });
});

describe("formatos", () => {
  it("dólares: cuatro decimales para lo chico, dos para lo grande", () => {
    expect(usd(0.0347)).toBe("US$ 0,0347");
    expect(usd(1.25)).toBe("US$ 1,25");
    expect(usd(null)).toBe("—");
  });

  it("pesos con la tasa de la página, y porcentaje", () => {
    expect(cop(1.25, 4000)).toBe("$ 5.000");
    expect(porcentaje(0.6946)).toBe("69,5 %");
  });
});

const DATOS: TableroConsumo = {
  desde: "2026-09-15",
  hasta: "2026-09-21",
  totales: {
    costoUsd: 1.25,
    respuestas: 36,
    documentos: 5,
    empresas: 1,
    costoPorRespuesta: 0.0347,
    costoPorEmpresa: 1.25,
    tokens: {
      entrada: 132,
      salida: 9337,
      cacheLeido: 313163,
      cacheEscrito: 137504,
    },
  },
  porDia: [{ dia: "2026-09-21", chatUsd: 1.25, lecturaUsd: 0, respuestas: 36 }],
  porEmpresa: [
    {
      empresaId: "e-1",
      empresa: "Empresa Demo S.A.S.",
      respuestas: 36,
      documentos: 5,
      tokens: 460136,
      costoUsd: 1.25,
      costoPorRespuesta: 0.0347,
      aprovechamientoCache: 0.69,
    },
  ],
  porModelo: [{ modelo: "claude-opus-5", llamadas: 36, costoUsd: 1.25 }],
  eficiencia: {
    aprovechamientoCache: 0.6946,
    cacheEscritoPorRespuesta: 3819,
    consultasPorRespuesta: 0.9,
    vueltasPorRespuesta: null,
    duracionMediana: null,
    duracionP95: null,
    sinDuracion: 36,
  },
  simulacion: { opus: 1.25, sonnet: 0.5, haiku: 0.28 },
  masCaras: [
    {
      fecha: "2026-09-21T20:13:52.717Z",
      empresa: "Empresa Demo S.A.S.",
      estado: "COMPLETO",
      modelo: "claude-opus-5",
      consultas: 3,
      vueltas: null,
      tokens: 50549,
      costoUsd: 0.1165,
      duracionMs: null,
    },
  ],
  lectura: [
    {
      tipo: "RUT",
      cantidad: 4,
      fallidas: 1,
      medidas: 0,
      costoPromedio: null,
      duracionPromedio: null,
    },
  ],
  empresas: [{ id: "e-1", nombre: "Empresa Demo S.A.S." }],
  empresaId: null,
  truncado: false,
};

describe("TableroConsumoVista", () => {
  it("muestra los totales en dólares y en pesos, y el ahorro de cada modelo", () => {
    render(<TableroConsumoVista datos={DATOS} tasa={4000} />);
    expect(screen.getAllByText("US$ 1,25").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$ 5.000").length).toBeGreaterThan(0);
    expect(screen.getByText("−60 % frente a Opus")).toBeInTheDocument();
  });

  it("dice cuánto del costo es escritura del caché", () => {
    render(<TableroConsumoVista datos={DATOS} tasa={4000} />);
    // 137.504 × 6,25 / 1e6 = 0,8594.
    expect(
      screen.getByText(/fueron US\$ 0,86 de US\$ 1,25/),
    ).toBeInTheDocument();
  });

  it("avisa lo que no tiene medición en vez de mostrar ceros", () => {
    render(<TableroConsumoVista datos={DATOS} tasa={4000} />);
    expect(screen.getByText(/36 respuestas son de antes/)).toBeInTheDocument();
    expect(
      screen.getByText(/lecturas de antes de que se midiera/),
    ).toBeInTheDocument();
  });

  it("con el período cortado por el tope, lo dice", () => {
    render(
      <TableroConsumoVista datos={{ ...DATOS, truncado: true }} tasa={4000} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/incompletas/);
  });
});
