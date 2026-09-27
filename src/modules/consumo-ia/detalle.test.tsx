import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { DetalleConsumo, FilaDetalle } from "./consumo";
import {
  DetalleConsumoVista,
  type FiltroVistaDetalle,
} from "./DetalleConsumoVista";

const CONSULTA: FilaDetalle = {
  id: "t-1",
  fecha: "2026-09-21T20:13:52.717Z",
  empresaId: "e-1",
  empresa: "Empresa Demo S.A.S.",
  categoria: "CONSULTA",
  enQue: "Búsqueda de nombres, Cartera",
  herramientas: [
    { nombre: "buscar_valores", etiqueta: "Búsqueda de nombres", veces: 1 },
    { nombre: "consultar_cartera", etiqueta: "Cartera", veces: 2 },
  ],
  estado: "COMPLETO",
  modelo: "claude-opus-5",
  vueltas: 3,
  duracionMs: 9_500,
  tokens: { entrada: 100, salida: 200, cacheLeido: 9_000, cacheEscrito: 1_000 },
  costo: {
    entrada: 0.0005,
    cacheLeido: 0.0045,
    cacheEscrito: 0.00625,
    salida: 0.005,
    total: 0.01625,
  },
};

const LECTURA_SIN_MEDIR: FilaDetalle = {
  id: "d-1",
  fecha: "2026-09-20T10:00:00.000Z",
  empresaId: "e-1",
  empresa: "Empresa Demo S.A.S.",
  categoria: "LECTURA",
  enQue: "RUT",
  herramientas: [],
  estado: "LEIDO",
  modelo: null,
  vueltas: null,
  duracionMs: null,
  tokens: null,
  costo: null,
};

const DATOS: DetalleConsumo = {
  desde: "2026-09-15",
  hasta: "2026-09-21",
  porCategoria: [
    {
      categoria: "AYUDA",
      etiqueta: "Ayuda sobre el sistema",
      llamadas: 0,
      costoUsd: 0,
      participacion: 0,
    },
    {
      categoria: "CONSULTA",
      etiqueta: "Consulta de datos",
      llamadas: 1,
      costoUsd: 0.01625,
      participacion: 1,
    },
    {
      categoria: "PROPUESTA",
      etiqueta: "Propuesta de cobro o pago",
      llamadas: 0,
      costoUsd: 0,
      participacion: 0,
    },
    {
      categoria: "LECTURA",
      etiqueta: "Lectura de documentos",
      llamadas: 1,
      costoUsd: 0,
      participacion: 0,
    },
  ],
  porHerramienta: [
    {
      herramienta: "consultar_cartera",
      etiqueta: "Cartera",
      respuestas: 1,
      veces: 2,
      costoUsd: 0.01625,
    },
  ],
  filas: [CONSULTA, LECTURA_SIN_MEDIR],
  total: 2,
  totalUsd: 0.01625,
  pagina: 1,
  paginas: 1,
  porPagina: 50,
  truncado: false,
};

const FILTRO: FiltroVistaDetalle = {
  categoria: null,
  orden: "FECHA",
  pagina: 1,
};

describe("DetalleConsumoVista", () => {
  it("lista cada llamada con en qué se gastó y su costo", () => {
    render(
      <DetalleConsumoVista
        datos={DATOS}
        tasa={4000}
        filtro={FILTRO}
        alCambiar={() => {}}
      />,
    );
    expect(
      screen.getByText("Búsqueda de nombres, Cartera"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("US$ 0,0163").length).toBeGreaterThan(0);
    // La hora va en Colombia: 20:13 UTC son las 15:13.
    expect(screen.getByText("2026-09-21 15:13")).toBeInTheDocument();
    expect(screen.getByText("sin medir")).toBeInTheDocument();
  });

  it("al tocar una fila muestra el costo desarmado y lo que consultó", () => {
    render(
      <DetalleConsumoVista
        datos={DATOS}
        tasa={4000}
        filtro={FILTRO}
        alCambiar={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Búsqueda de nombres, Cartera"));
    expect(screen.getByText("Caché escrito")).toBeInTheDocument();
    // 0,00625 de 0,01625.
    expect(screen.getByText("38,5 %")).toBeInTheDocument();
    expect(
      screen.getByText("Búsqueda de nombres, Cartera ×2"),
    ).toBeInTheDocument();
  });

  it("una lectura sin medir lo dice en vez de mostrar ceros", () => {
    render(
      <DetalleConsumoVista
        datos={DATOS}
        tasa={4000}
        filtro={FILTRO}
        alCambiar={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("RUT"));
    expect(
      screen.getByText(/antes de que se midiera el consumo/),
    ).toBeInTheDocument();
  });

  it("filtrar u ordenar vuelve a la primera página", () => {
    const alCambiar = vi.fn();
    render(
      <DetalleConsumoVista
        datos={DATOS}
        tasa={4000}
        filtro={{ ...FILTRO, pagina: 3 }}
        alCambiar={alCambiar}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Propuesta" }));
    expect(alCambiar).toHaveBeenLastCalledWith({
      categoria: "PROPUESTA",
      orden: "FECHA",
      pagina: 1,
    });
    fireEvent.click(screen.getByRole("radio", { name: "Más caras" }));
    expect(alCambiar).toHaveBeenLastCalledWith({
      categoria: null,
      orden: "COSTO",
      pagina: 1,
    });
  });

  it("pagina cuando hay más de una página", () => {
    const alCambiar = vi.fn();
    render(
      <DetalleConsumoVista
        datos={{ ...DATOS, pagina: 2, paginas: 3 }}
        tasa={4000}
        filtro={{ ...FILTRO, pagina: 2 }}
        alCambiar={alCambiar}
      />,
    );
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(alCambiar).toHaveBeenLastCalledWith({ ...FILTRO, pagina: 3 });
  });
});
