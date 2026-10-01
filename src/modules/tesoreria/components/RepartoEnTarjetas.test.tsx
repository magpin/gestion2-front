import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { RepartoEnTarjetas, estadoDelReparto } from "./RepartoEnTarjetas";
import { renglonRepartoVacio, type RenglonReparto } from "../lib/formaPago";

vi.mock("@/core/api/api", () => ({
  api: { get: vi.fn(() => Promise.resolve({ data: [] })) },
  mensajeDeError: () => "",
}));

const renglon = (valor: string, medio: "CAJA" | "BANCO" = "CAJA"): RenglonReparto => ({
  ...renglonRepartoVacio(medio),
  valor,
});

describe("estadoDelReparto", () => {
  it("con uno en blanco, ese se lleva el resto y no falta nada", () => {
    expect(estadoDelReparto([renglon("40000"), renglon("")], 100000.5)).toEqual({
      resto: 60000.5,
      falta: 0,
      sobra: 0,
    });
  });

  it("sin ninguno en blanco, dice cuánto falta", () => {
    expect(estadoDelReparto([renglon("40000"), renglon("50000")], 100000).falta).toBe(10000);
  });

  it("si se pasan, dice por cuánto", () => {
    expect(estadoDelReparto([renglon("80000"), renglon("50000")], 100000).sobra).toBe(30000);
  });
});

describe("RepartoEnTarjetas", () => {
  function montar(renglones: RenglonReparto[], total?: number) {
    const onCambiar = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RepartoEnTarjetas renglones={renglones} onCambiar={onCambiar} total={total} />
      </QueryClientProvider>,
    );
    return onCambiar;
  }

  it("con dos medios no deja quitar ninguno: es el mínimo", () => {
    montar([renglon(""), renglon("", "BANCO")]);
    expect(screen.queryByRole("button", { name: /Quitar el medio/ })).not.toBeInTheDocument();
  });

  it("con tres, quitar uno deja los otros dos", async () => {
    const r = [renglon("1"), renglon("2", "BANCO"), renglon("")];
    const onCambiar = montar(r);
    await userEvent.click(screen.getByRole("button", { name: "Quitar el medio 2" }));
    expect(onCambiar).toHaveBeenLastCalledWith([r[0], r[2]]);
  });

  it("muestra cuánto se lleva el que está en blanco, y si se pasaron", () => {
    montar([renglon("40000"), renglon("")], 100000);
    expect(screen.getByLabelText("Valor del medio 2")).toHaveAttribute("placeholder", expect.stringMatching(/el resto: \$\s?60\.000/));
  });

  it("avisa si se pasaron", () => {
    montar([renglon("80000"), renglon("50000")], 100000);
    expect(screen.getByText(/Se pasó por/)).toBeInTheDocument();
  });
});
