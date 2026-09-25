import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CampoCantidad, CampoPesos } from "./CampoNumero";

/** El campo con su estado, como lo usa un formulario. */
function Pesos({
  inicial = "",
  alCambiar,
}: {
  inicial?: string;
  alCambiar?: (v: string) => void;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoPesos
      aria-label="Precio"
      value={valor}
      onChange={(v) => {
        setValor(v);
        alCambiar?.(v);
      }}
    />
  );
}

function Cantidad({ unidad }: { unidad: string }) {
  const [valor, setValor] = useState("");
  return (
    <>
      <CampoCantidad
        aria-label="Cantidad"
        unidad={unidad}
        value={valor}
        onChange={setValor}
      />
      <output>{valor}</output>
    </>
  );
}

describe("CampoPesos", () => {
  it("se ve con punto de mil y entrega el número sin él", async () => {
    const alCambiar = vi.fn();
    render(<Pesos alCambiar={alCambiar} />);
    const campo = screen.getByLabelText("Precio");
    await userEvent.type(campo, "1234567");
    expect(campo).toHaveValue("1.234.567");
    expect(alCambiar).toHaveBeenLastCalledWith("1234567");
  });

  it("no acepta letras: la tecla no hace nada", async () => {
    const alCambiar = vi.fn();
    render(<Pesos inicial="30000" alCambiar={alCambiar} />);
    const campo = screen.getByLabelText("Precio");
    await userEvent.type(campo, "x-");
    expect(campo).toHaveValue("30.000");
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("la coma no entra y se avisa, sin perder el foco: «30.000,5» no puede volverse 300.005 callado", async () => {
    render(<Pesos inicial="30000" />);
    const campo = screen.getByLabelText("Precio");
    await userEvent.type(campo, ",");
    expect(campo).toHaveValue("30.000");
    expect(screen.getByRole("alert")).toHaveTextContent("Sin centavos");
    expect(campo).toHaveFocus();
    expect(campo).toHaveAttribute("aria-invalid", "true");
  });

  it("un valor guardado con centavos se ve tal cual y no cambia si nadie lo edita", () => {
    const alCambiar = vi.fn();
    render(<Pesos inicial="54621.85" alCambiar={alCambiar} />);
    expect(screen.getByLabelText("Precio")).toHaveValue("54.621,85");
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("borrar deja el campo vacío, no en cero", async () => {
    const alCambiar = vi.fn();
    render(<Pesos inicial="500" alCambiar={alCambiar} />);
    await userEvent.clear(screen.getByLabelText("Precio"));
    expect(alCambiar).toHaveBeenLastCalledWith("");
  });
});

describe("CampoCantidad", () => {
  it("en unidades, entera", async () => {
    render(<Cantidad unidad="UND" />);
    await userEvent.type(screen.getByLabelText("Cantidad"), "2,5");
    expect(screen.getByRole("status")).toHaveTextContent(/^25$/);
  });

  it("en kilos, con coma decimal", async () => {
    render(<Cantidad unidad="KG" />);
    const campo = screen.getByLabelText("Cantidad");
    await userEvent.type(campo, "2,5");
    expect(campo).toHaveValue("2,5");
    expect(screen.getByRole("status")).toHaveTextContent(/^2\.5$/);
  });
});
