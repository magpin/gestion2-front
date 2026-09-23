import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Bienvenida } from "./AsistenteView";

/**
 * La bienvenida de una conversación nueva: María a 64 px con el gesto que
 * corresponde a lo que pasa. Las manos se reconocen por la clase de su
 * animación.
 */
const tiene = (html: string, clase: string) => new RegExp(`class="[^"]*${clase}`).test(html);

describe("Bienvenida", () => {
  it("sin nada esperando: saluda", () => {
    const { container } = render(
      <Bienvenida pendientes={{ total: 0, propuestas: 0, facturas: 0, pedidos: 0 }} momento={null} />,
    );
    expect(screen.getByText("Hola, soy María.")).toBeInTheDocument();
    expect(tiene(container.innerHTML, "saluda")).toBe(true);
    expect(tiene(container.innerHTML, "levanta")).toBe(false);
  });

  it("con algo esperando: levanta la mano y dice qué es", () => {
    const { container } = render(
      <Bienvenida pendientes={{ total: 2, propuestas: 0, facturas: 1, pedidos: 1 }} momento={null} />,
    );
    expect(tiene(container.innerHTML, "levanta")).toBe(true);
    expect(screen.getByText(/Te esperan 2 cosas/)).toHaveTextContent(
      "1 factura leída sin registrar (Compras → Leídas) · 1 pedido leído sin facturar",
    );
  });

  it("recién aprobado lo último: el gesto de aprobado", () => {
    const { container } = render(
      <Bienvenida pendientes={{ total: 0, propuestas: 0, facturas: 0, pedidos: 0 }} momento="aprobado" />,
    );
    expect(tiene(container.innerHTML, "aparece")).toBe(true);
    expect(screen.getByText("Listo: no queda nada esperando.")).toBeInTheDocument();
  });
});
