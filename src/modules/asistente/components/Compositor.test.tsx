import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Compositor, type ConversacionDelPie } from "./Compositor";

function mostrar(conversacion: Partial<ConversacionDelPie> | null = {}) {
  const alEnviar = vi.fn(() => Promise.resolve(true));
  const alNueva = vi.fn();
  render(
    <Compositor
      subiendo={false}
      alSubir={vi.fn()}
      conversacion={
        conversacion === null
          ? undefined
          : {
              alEnviar,
              respondiendo: false,
              superaTope: false,
              preguntas: ["¿Cómo registro una compra?"],
              alNueva,
              nuevaDeshabilitada: false,
              ...conversacion,
            }
      }
    />,
  );
  return { alEnviar, alNueva };
}

const campo = () => screen.getByRole("textbox", { name: "Su pregunta" });
const mandar = () => screen.getByRole("button", { name: "Mandar la pregunta" });

describe("Compositor", () => {
  it("sin conversación no hay campo de texto: solo la zona para soltar", () => {
    mostrar(null);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Arrastre documentos aquí/)).toBeInTheDocument();
  });

  it("Enter manda la pregunta sin espacios de más y vacía el campo", async () => {
    const { alEnviar } = mostrar();
    await userEvent.type(campo(), "  ¿Cómo pago una compra?  {Enter}");
    expect(alEnviar).toHaveBeenCalledWith("¿Cómo pago una compra?");
    expect(campo()).toHaveValue("");
  });

  it("Shift+Enter baja de renglón y no manda", async () => {
    const { alEnviar } = mostrar();
    await userEvent.type(campo(), "una{Shift>}{Enter}{/Shift}dos");
    expect(alEnviar).not.toHaveBeenCalled();
    expect(campo()).toHaveValue("una\ndos");
  });

  it("vacío o con una respuesta llegando no se puede mandar", async () => {
    mostrar({ respondiendo: true });
    expect(mandar()).toBeDisabled();
    await userEvent.type(campo(), "hola");
    expect(mandar()).toBeDisabled();
  });

  it("si el backend no la acepta, lo escrito vuelve al campo", async () => {
    mostrar({ alEnviar: () => Promise.resolve(false) });
    await userEvent.type(campo(), "hola");
    await userEvent.click(mandar());
    expect(await screen.findByDisplayValue("hola")).toBeInTheDocument();
  });

  it("con el tope alcanzado el campo se apaga y se ofrece empezar otra", async () => {
    const { alNueva } = mostrar({ superaTope: true });
    expect(campo()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Empezar una nueva" }));
    expect(alNueva).toHaveBeenCalledTimes(1);
  });

  it("una pregunta sugerida llena el campo sin mandarse", async () => {
    const { alEnviar } = mostrar();
    await userEvent.click(screen.getByRole("button", { name: "Agregar al mensaje" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Preguntas sugeridas/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "¿Cómo registro una compra?" }));
    expect(campo()).toHaveValue("¿Cómo registro una compra?");
    expect(campo()).toHaveFocus();
    expect(alEnviar).not.toHaveBeenCalled();
  });
});
