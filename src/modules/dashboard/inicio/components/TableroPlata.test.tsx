import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MARIA_PROXIMAMENTE } from "@/modules/asistente/proximamente";
import { AlertasMaria } from "./TableroPlata";

describe("alertas de María en el tablero", () => {
  it.skipIf(MARIA_PROXIMAMENTE)("abren el chat con la pregunta escrita, o llevan a la pantalla donde se resuelve", () => {
    render(
      <AlertasMaria
        alertas={[
          {
            clave: "cartera:a",
            partes: ["Ferretería lleva 65 días sin pagar ", 1980000, "."],
            accion: { tipo: "MARIA", pregunta: "¿Qué facturas me debe Ferretería y desde cuándo?" },
          },
          {
            clave: "vence:e",
            partes: ["El jueves 1 oct vence la factura A-10 de Arrendamientos, ", 2800000, ". Todavía no está programada."],
            accion: { tipo: "IR", href: "/dashboard/pagos", etiqueta: "Programar" },
          },
        ]}
      />,
    );
    const maria = screen.getByRole("link", { name: "Preguntarle a María" });
    expect(decodeURIComponent(maria.getAttribute("href")!)).toBe(
      "/dashboard/asistente?pregunta=¿Qué facturas me debe Ferretería y desde cuándo?",
    );
    expect(screen.getByRole("link", { name: "Programar" })).toHaveAttribute("href", "/dashboard/pagos");
    // Los montos van como plata, sin partirse.
    expect(screen.getByText(/1\.980\.000/)).toHaveClass("whitespace-nowrap");
  });

  it("sin alertas no pinta nada", () => {
    const { container } = render(<AlertasMaria alertas={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
