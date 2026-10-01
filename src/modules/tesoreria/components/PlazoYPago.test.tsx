import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PlazoYPago } from "./PlazoYPago";
import { formaPagoVacia, type FormaPagoBorrador } from "../lib/formaPago";

vi.mock("@/core/api/api", () => ({
  api: { get: vi.fn(() => Promise.resolve({ data: [] })) },
  mensajeDeError: () => "",
}));

function Envoltura({ valor, onCambiar }: { valor: FormaPagoBorrador; onCambiar: (v: FormaPagoBorrador) => void }) {
  return (
    <PlazoYPago
      valor={valor}
      onCambiar={onCambiar}
      plazo="30"
      onPlazo={() => {}}
      plazoHabitual={null}
      quien="este cliente"
      vence={null}
      medio="Entra a"
      conRepartido
    />
  );
}

describe("PlazoYPago con repartido", () => {
  it("de contado ofrece Efectivo, Transferencia y Repartido; repartido muestra las tarjetas", () => {
    const cliente = new QueryClient();
    render(
      <QueryClientProvider client={cliente}>
        <Envoltura valor={{ ...formaPagoVacia(), modo: "REPARTIDO" }} onCambiar={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("radio", { name: "Repartido" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Valor del medio 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Valor del medio 2")).toBeInTheDocument();
  });

  it("pasar a crédito y volver a contado conserva el repartido y sus renglones", async () => {
    const cliente = new QueryClient();
    const inicial = { ...formaPagoVacia(), modo: "REPARTIDO" as const };
    const onCambiar = vi.fn();
    const { rerender } = render(
      <QueryClientProvider client={cliente}>
        <Envoltura valor={inicial} onCambiar={onCambiar} />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "A crédito" }));
    const aCredito = onCambiar.mock.lastCall![0] as FormaPagoBorrador;
    expect(aCredito.modo).toBe("CREDITO");
    expect(aCredito.renglones).toBe(inicial.renglones);

    rerender(
      <QueryClientProvider client={cliente}>
        <Envoltura valor={aCredito} onCambiar={onCambiar} />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Contado" }));
    const deVuelta = onCambiar.mock.lastCall![0] as FormaPagoBorrador;
    expect(deVuelta.modo).toBe("REPARTIDO");
    expect(deVuelta.renglones).toBe(inicial.renglones);
  });
});
