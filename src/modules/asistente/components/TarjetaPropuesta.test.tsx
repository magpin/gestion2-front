import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { PropuestaConversacion } from "../types/conversacion.types";
import { TarjetaPropuesta } from "./TarjetaPropuesta";

const CAJA = "11111111-1111-4111-8111-111111111111";

const propuesta = (e: Partial<PropuestaConversacion> = {}): PropuestaConversacion => ({
  id: "p-1",
  accion: "COBRO",
  cuerpo: { fecha: "2026-09-21", pagos: [{ medio: "CAJA", cajaId: CAJA, valor: 1000 }] },
  vistaPrevia: {
    documento: {
      numero: "SETT-5",
      tercero: "ALMACENES CORONA S.A.S",
      pendienteAntes: "3944450.00",
      pendienteDespues: "3943450.00",
    },
    medios: [{ medio: "CAJA", nombre: "Caja principal", valor: 1000 }],
    asientos: [
      {
        numero: "RC-1",
        glosa: "Cobro de la factura SETT-5",
        lineas: [
          { cuenta: "11050501", nombre: "Caja general", tercero: null, debito: "1000.00", credito: "0.00" },
          { cuenta: "130505", nombre: "Clientes nacionales", tercero: "CORONA", debito: "0.00", credito: "1000.00" },
        ],
      },
    ],
  },
  estado: "PENDIENTE",
  venceEn: "2026-09-22T10:00:00Z",
  error: null,
  cuerpoConfirmado: null,
  ...e,
});

function mostrar(p = propuesta()) {
  const alConfirmar = vi.fn();
  const alDescartar = vi.fn();
  render(
    <TarjetaPropuesta
      propuesta={p}
      confirmando={false}
      descartando={false}
      alConfirmar={alConfirmar}
      alDescartar={alDescartar}
    />,
  );
  return { alConfirmar, alDescartar };
}

describe("TarjetaPropuesta — pendiente", () => {
  it("dice que no está registrada, y muestra factura, saldo antes y después, y de dónde entra", () => {
    mostrar();
    expect(screen.getByText("Sin registrar")).toBeInTheDocument();
    expect(screen.getByText("SETT-5")).toBeInTheDocument();
    expect(screen.getByText(/3\.944\.450.*→.*3\.943\.450/)).toBeInTheDocument();
    expect(screen.getByText("Caja principal")).toBeInTheDocument();
  });

  it("confirmar sin tocar nada manda lo propuesto, sin corrección", async () => {
    const { alConfirmar } = mostrar();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(alConfirmar).toHaveBeenCalledWith();
  });

  it("corregir el valor cambia el botón y manda la corrección", async () => {
    const { alConfirmar } = mostrar();
    const valor = screen.getByRole("textbox", { name: "Valor" });
    await userEvent.clear(valor);
    await userEvent.type(valor, "800");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar con los cambios" }));
    expect(alConfirmar).toHaveBeenCalledWith({
      fecha: "2026-09-21",
      pagos: [{ medio: "CAJA", cajaId: CAJA, valor: 800 }],
    });
  });

  it("un valor que no es un monto no se confirma", async () => {
    mostrar();
    const valor = screen.getByRole("textbox", { name: "Valor" });
    await userEvent.clear(valor);
    await userEvent.type(valor, "abc");
    expect(screen.getByRole("button", { name: /Confirmar/ })).toBeDisabled();
  });

  it("el asiento está plegado y se abre", async () => {
    mostrar();
    expect(screen.queryByText("130505")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ver el asiento/ }));
    expect(screen.getByText("130505")).toBeInTheDocument();
  });

  it("descartar se pide aparte", async () => {
    const { alDescartar, alConfirmar } = mostrar();
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(alDescartar).toHaveBeenCalled();
    expect(alConfirmar).not.toHaveBeenCalled();
  });

  it("si confirmar falló, lo dice y deja volver a intentar", () => {
    mostrar(propuesta({ error: "La factura ya no tiene saldo." }));
    expect(screen.getByRole("alert")).toHaveTextContent("La factura ya no tiene saldo.");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });
});

describe("TarjetaPropuesta — resuelta", () => {
  it("confirmada: registrada, sin botones, con lo que se registró y cómo deshacerlo", () => {
    mostrar(
      propuesta({
        estado: "CONFIRMADA",
        cuerpoConfirmado: { fecha: "2026-09-21", pagos: [{ medio: "CAJA", cajaId: CAJA, valor: 800 }] },
      }),
    );
    expect(screen.getByText("Registrado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/800/)).toBeInTheDocument();
    expect(screen.getByText(/Devolver cobro/)).toBeInTheDocument();
  });

  it("vencida: sin botones, y dice qué hacer", () => {
    mostrar(propuesta({ estado: "VENCIDA" }));
    expect(screen.getByText("Vencido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/24 horas/)).toBeInTheDocument();
  });
});

describe("TarjetaPropuesta — cuando confirmar falló", () => {
  it("muestra el motivo y deja volver a intentarlo", () => {
    mostrar(
      propuesta({
        error: "No se pudo registrar: la caja está cerrada. Probá de nuevo.",
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/caja está cerrada/);
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });
});
