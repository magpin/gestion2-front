import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderizar, screen } from "@testing-library/react";
import type { ReactElement } from "react";

import type { TurnoConversacion } from "../types/conversacion.types";
import { TurnoGuardado, TurnoRespondiendo, textoDeConsulta } from "./TurnosConversacion";

const turno = (e: Partial<TurnoConversacion>): TurnoConversacion => ({
  id: "t-1",
  orden: 2,
  autor: "ASISTENTE",
  texto: "Almacenes Corona te debe **$ 27.316.050**.",
  estado: "COMPLETO",
  motivo: null,
  creado_en: "2026-09-21T15:00:00Z",
  fuentes: [],
  propuestas: [],
  ...e,
});

/** Con React Query: la tarjeta de una propuesta confirma con una mutación. */
const render = (ui: ReactElement) =>
  renderizar(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("TurnoGuardado — las fuentes", () => {
  it("una respuesta con consultas dice de dónde salieron las cifras", () => {
    render(<TurnoGuardado turno={turno({ fuentes: ["Cartera", "Saldos de caja y bancos"] })} />);
    expect(screen.getByText("Según: Cartera · Saldos de caja y bancos")).toBeInTheDocument();
  });

  it("sin consultas no dice nada", () => {
    render(<TurnoGuardado turno={turno({ fuentes: [] })} />);
    expect(screen.queryByText(/Según:/)).not.toBeInTheDocument();
  });
});

describe("TurnoRespondiendo — pensando, consultando, escribiendo", () => {
  it("antes del primer pedazo: pensando", () => {
    render(<TurnoRespondiendo enVivo={{ pregunta: "¿Cuánto me debe?", texto: "", consultando: null }} />);
    expect(screen.getByRole("status", { name: "Pensando" })).toBeInTheDocument();
  });

  it("mientras consulta dice qué está mirando, debajo de lo que ya escribió", () => {
    render(
      <TurnoRespondiendo
        enVivo={{ pregunta: "¿Cuánto me debe?", texto: "Busco el cliente.", consultando: "Cartera" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Consultando cartera…");
    expect(screen.getByText("Busco el cliente.")).toBeInTheDocument();
  });

  it("cuando vuelve a llegar texto, escribe", () => {
    render(
      <TurnoRespondiendo
        enVivo={{ pregunta: "¿Cuánto me debe?", texto: "Te debe $ 1.000.", consultando: null }}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Te debe $ 1.000.")).toBeInTheDocument();
  });
});

describe("textoDeConsulta", () => {
  it("con palabras de la aplicación", () => {
    expect(textoDeConsulta("Cartera")).toBe("Consultando cartera…");
    expect(textoDeConsulta("Saldos de caja y bancos")).toBe("Consultando saldos de caja y bancos…");
    expect(textoDeConsulta("Búsqueda")).toBe("Buscando cómo está escrito…");
  });
});
