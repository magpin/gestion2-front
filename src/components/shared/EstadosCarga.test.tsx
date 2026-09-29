import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./EmptyState";
import { ErrorCarga } from "./ErrorCarga";
import { ErrorDeCampo } from "./ErrorDeCampo";

/** Un error como los que devuelve axios cuando el servidor contesta. */
const errorDelServidor = (status: number, message?: string) =>
  ({ response: { status, data: message ? { message } : {} } }) as unknown as AxiosError;

describe("vacíos", () => {
  it("dicen qué sigue, con uno o dos botones, y el punto lo pone el diseño", async () => {
    const limpiar = vi.fn();
    render(
      <EmptyState
        titulo="Nada con esos filtros."
        descripcion="No hubo movimientos del 1 al 7 de septiembre."
        accion={{ label: "Nueva factura de venta", href: "/dashboard/ventas" }}
        accionSecundaria={{ label: "Limpiar filtros", onClick: limpiar }}
      />,
    );
    // El punto final del título no se duplica.
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Nada con esos filtros.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nueva factura de venta" })).toHaveAttribute("href", "/dashboard/ventas");
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(limpiar).toHaveBeenCalledOnce();
  });
});

describe("error de carga", () => {
  it("explica qué pasó y reintenta", async () => {
    const reintentar = vi.fn().mockResolvedValue(undefined);
    render(<ErrorCarga error={errorDelServidor(500)} titulo="No se pudieron leer las facturas" onReintentar={reintentar} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron leer las facturas");
    expect(screen.getByRole("alert")).toHaveTextContent("El servidor tuvo un problema");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reintentar).toHaveBeenCalledOnce();
  });

  it("sin respuesta del servidor, lo dice", () => {
    render(<ErrorCarga error={new Error("Network Error")} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("sin el error en la mano, no adivina la causa", () => {
    render(<ErrorCarga error={undefined} onReintentar={() => undefined} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los datos");
  });
});

describe("error de campo", () => {
  it("se pinta con su mensaje y desaparece sin él", () => {
    const { rerender, container } = render(<ErrorDeCampo id="e" mensaje="El valor tiene que ser mayor que cero." />);
    expect(screen.getByRole("alert")).toHaveTextContent("El valor tiene que ser mayor que cero.");
    rerender(<ErrorDeCampo id="e" mensaje={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
