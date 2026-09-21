import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ReglaAutonoma } from "../types/autonomia.types";
import { FilaRegla } from "./FilaRegla";

const regla = (e: Partial<ReglaAutonoma> = {}): ReglaAutonoma => ({
  accion: "COBRO",
  modo: "SOLO_PROPONER",
  limite: null,
  activadaPor: null,
  desde: null,
  aciertos: { confirmadas: 3, sinCorregir: 2, automaticas: 0 },
  hayHistoria: false,
  ...e,
});

function mostrar(r = regla(), puedeEditar = true) {
  const alGuardar = vi.fn();
  render(
    <FilaRegla
      regla={r}
      puedeEditar={puedeEditar}
      historiaMinima={20}
      guardando={false}
      alGuardar={alGuardar}
    />,
  );
  return { alGuardar };
}

describe("FilaRegla", () => {
  it("sin historia no se puede soltar, y dice cuántas faltan", () => {
    mostrar();
    expect(screen.getByRole("radio", { name: "Confirmar si pasa todo" })).toBeDisabled();
    expect(screen.getByText(/faltan 17 confirmadas/)).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("con historia se suelta con un límite, y se guarda", async () => {
    const { alGuardar } = mostrar(
      regla({ hayHistoria: true, aciertos: { confirmadas: 25, sinCorregir: 24, automaticas: 0 } }),
    );
    await userEvent.click(screen.getByRole("radio", { name: "Confirmar si pasa todo" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Límite por documento" }), "2000000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(alGuardar).toHaveBeenCalledWith("CONFIRMAR_SI_PASA", 2000000);
  });

  it("sin límite no se guarda una regla que confirma sola", async () => {
    mostrar(regla({ hayHistoria: true }));
    await userEvent.click(screen.getByRole("radio", { name: "Confirmar si pasa todo" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("quien no edita ve la regla sin controles", () => {
    mostrar(
      regla({
        modo: "CONFIRMAR_SI_PASA",
        limite: 2000000,
        hayHistoria: true,
        activadaPor: "Luisa Pena",
        desde: "2026-09-21T15:00:00Z",
      }),
      false,
    );
    expect(screen.getByRole("radio", { name: "Solo proponer" })).toBeDisabled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Cambiada por Luisa Pena/)).toBeInTheDocument();
  });
});
