import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { FormularioCobro, type ModoCobro } from "./FormularioCobro";
import type { VentaDocumentoResumen } from "../types/ventas.types";

// Los selectores de caja y cuenta consultan la API; acá no importa qué traen.
vi.mock("@/core/api/api", () => ({
  api: { get: vi.fn(() => Promise.resolve({ data: [] })) },
  mensajeDeError: () => "",
}));

/** Cobrada entera por 119.000 y con una nota crédito de 19.000 después. */
const factura = {
  id: "f-1",
  prefijo: "FE-",
  consecutivo: 104,
  total: "119000",
  monto_pagado: "119000",
  saldo_efectivo: "100000",
  pendiente: "0",
  saldo_a_favor: "19000",
} as unknown as VentaDocumentoResumen;

function abrir(modo: ModoCobro, f = factura) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FormularioCobro factura={f} modo={modo} onCerrar={() => {}} onGuardar={() => {}} guardando={false} />
    </QueryClientProvider>,
  );
}

describe("FormularioCobro en modo devolver", () => {
  it("arranca con el saldo a favor y dice que no es una nota crédito", () => {
    abrir("DEVOLVER");
    expect(screen.getByRole("heading", { name: "Devolver al cliente" })).toBeInTheDocument();
    expect(screen.getByLabelText("Valor del renglón 1")).toHaveValue("19.000");
    expect(screen.getByText(/lo que va es una nota\s+crédito/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devolver" })).toBeInTheDocument();
  });

  it("el tope es lo cobrado, no el saldo: se puede devolver más que el saldo a favor", async () => {
    abrir("DEVOLVER");
    const valor = screen.getByLabelText("Valor del renglón 1");
    await userEvent.clear(valor);
    await userEvent.type(valor, "119000");
    expect(screen.queryByText(/Se pasó/)).not.toBeInTheDocument();

    // El pie muestra un problema a la vez (primero, elegir la caja); el
    // exceso lo marca el editor al lado del botón de agregar medio.
    await userEvent.clear(valor);
    await userEvent.type(valor, "119001");
    expect(screen.getByText(/Se pasó por/)).toBeInTheDocument();
  });

  it("no dice «falta repartir» al devolver: no hay que devolverlo todo", () => {
    abrir("DEVOLVER");
    expect(screen.queryByText(/Falta repartir/)).not.toBeInTheDocument();
  });

  it("sin saldo a favor arranca vacío: cuánto devolver lo decide una persona", () => {
    abrir("DEVOLVER", { ...factura, saldo_a_favor: "0" } as VentaDocumentoResumen);
    expect(screen.getByLabelText("Valor del renglón 1")).toHaveValue("");
  });

  it("en modo cobrar sigue igual que antes", () => {
    abrir("COBRAR", { ...factura, monto_pagado: "0", pendiente: "100000", saldo_a_favor: "0" } as VentaDocumentoResumen);
    expect(screen.getByRole("heading", { name: "Cobrar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Valor del renglón 1")).toHaveValue("100.000");
  });
});
