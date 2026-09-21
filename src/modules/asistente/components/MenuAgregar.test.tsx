import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MenuAgregar } from "./MenuAgregar";

function mostrar({
  deshabilitado = false,
  conversa = true,
  conCamara = false,
  nuevaDeshabilitada = false,
}: {
  deshabilitado?: boolean;
  conversa?: boolean;
  conCamara?: boolean;
  nuevaDeshabilitada?: boolean;
} = {}) {
  const alSubir = vi.fn();
  const alPreguntar = vi.fn();
  const alNueva = vi.fn();
  render(
    <div>
      <MenuAgregar
        deshabilitado={deshabilitado}
        alSubir={alSubir}
        conCamara={conCamara}
        {...(conversa
          ? {
              preguntas: ["¿Cómo registro una compra?", "¿Dónde concilio el banco?"],
              alPreguntar,
              alNueva,
              nuevaDeshabilitada,
            }
          : {})}
      />
      <p>afuera</p>
    </div>,
  );
  const mas = screen.getByRole("button", { name: "Agregar al mensaje" });
  const titulos = () =>
    screen.getAllByRole("menuitem").map((o) => o.querySelector(".font-medium")?.textContent);
  return { alSubir, alPreguntar, alNueva, mas, titulos };
}

describe("MenuAgregar", () => {
  it("cerrado no hay menú, y el + dice que abre uno", () => {
    const { mas } = mostrar();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(mas).toHaveAttribute("aria-haspopup", "menu");
    expect(mas).toHaveAttribute("aria-expanded", "false");
  });

  it("abre con Subir y Conversación, y nada de lo que no existe", async () => {
    const { mas, titulos } = mostrar();
    await userEvent.click(mas);
    expect(mas).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Subir")).toBeInTheDocument();
    expect(screen.getByText("Conversación")).toBeInTheDocument();
    expect(titulos()).toEqual(["Subir documento", "Preguntas sugeridas", "Nueva conversación"]);
    for (const falta of ["Recientes", "Adjuntar del sistema", "Pedirle que haga", "Asentar sin preguntar"]) {
      expect(screen.queryByText(falta)).not.toBeInTheDocument();
    }
  });

  it("sin conversación, solo la sección Subir", async () => {
    const { mas, titulos } = mostrar({ conversa: false });
    await userEvent.click(mas);
    expect(screen.queryByText("Conversación")).not.toBeInTheDocument();
    expect(titulos()).toEqual(["Subir documento"]);
  });

  it("«Tomar foto» aparece solo donde hay cámara, y pide el documento con la cámara", async () => {
    const { mas, titulos, alSubir } = mostrar({ conCamara: true });
    await userEvent.click(mas);
    expect(titulos()).toContain("Tomar foto");
    await userEvent.click(screen.getByRole("menuitem", { name: /Tomar foto/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Cámara de Comercio/ }));
    expect(alSubir).toHaveBeenCalledWith("CAMARA_COMERCIO", "CAMARA");
  });

  it("«Subir documento» abre los tres documentos; elegir cierra y pide ese", async () => {
    const { mas, titulos, alSubir } = mostrar();
    await userEvent.click(mas);
    await userEvent.click(screen.getByRole("menuitem", { name: /Subir documento/ }));
    expect(screen.getByText("¿Qué documento es?")).toBeInTheDocument();
    expect(titulos()).toEqual(["Volver", "RUT", "Cámara de Comercio", "Resolución DIAN"]);
    expect(screen.getByRole("menuitem", { name: "Volver" })).toHaveFocus();
    await userEvent.click(screen.getByRole("menuitem", { name: /Resolución DIAN/ }));
    expect(alSubir).toHaveBeenCalledWith("RESOLUCION_DIAN", "ARCHIVO");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("«Volver» regresa a la primera lista", async () => {
    const { mas, titulos } = mostrar();
    await userEvent.click(mas);
    await userEvent.click(screen.getByRole("menuitem", { name: /Preguntas sugeridas/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Volver" }));
    expect(titulos()).toEqual(["Subir documento", "Preguntas sugeridas", "Nueva conversación"]);
  });

  it("una pregunta sugerida se entrega para llenar el campo, sin mandarse", async () => {
    const { mas, alPreguntar } = mostrar();
    await userEvent.click(mas);
    await userEvent.click(screen.getByRole("menuitem", { name: /Preguntas sugeridas/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "¿Dónde concilio el banco?" }));
    expect(alPreguntar).toHaveBeenCalledWith("¿Dónde concilio el banco?");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("«Nueva conversación» se pide, y deshabilitada no se puede elegir", async () => {
    const primero = mostrar();
    await userEvent.click(primero.mas);
    await userEvent.click(screen.getByRole("menuitem", { name: /Nueva conversación/ }));
    expect(primero.alNueva).toHaveBeenCalledTimes(1);
  });

  it("con «Nueva conversación» deshabilitada, las flechas la saltan", async () => {
    const { mas } = mostrar({ nuevaDeshabilitada: true });
    await userEvent.click(mas);
    const nueva = screen.getByRole("menuitem", { name: /Nueva conversación/ });
    expect(nueva).toBeDisabled();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: /Subir documento/ })).toHaveFocus();
  });

  it("al abrir, el foco va a la primera opción; las flechas se mueven y dan la vuelta", async () => {
    const { mas } = mostrar();
    await userEvent.click(mas);
    const [subir, preguntas, nueva] = screen.getAllByRole("menuitem");
    expect(subir).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(preguntas).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(nueva).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(subir).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(nueva).toHaveFocus();
  });

  it("Escape cierra y devuelve el foco al +", async () => {
    const { mas } = mostrar();
    await userEvent.click(mas);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(mas).toHaveFocus();
  });

  it("clic afuera y el mismo botón también cierran; al reabrir vuelve a la primera lista", async () => {
    const { mas, titulos } = mostrar();
    await userEvent.click(mas);
    await userEvent.click(screen.getByRole("menuitem", { name: /Subir documento/ }));
    await userEvent.click(screen.getByText("afuera"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(mas);
    expect(titulos()[0]).toBe("Subir documento");
    await userEvent.click(mas);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("mientras se sube un archivo no se abre", () => {
    const { mas } = mostrar({ deshabilitado: true });
    expect(mas).toBeDisabled();
  });
});
