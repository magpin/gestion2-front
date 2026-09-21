import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MenuAgregar } from "./MenuAgregar";

function mostrar(deshabilitado = false) {
  const alElegir = vi.fn();
  render(
    <div>
      <MenuAgregar deshabilitado={deshabilitado} alElegir={alElegir} />
      <p>afuera</p>
    </div>,
  );
  const mas = screen.getByRole("button", { name: "Agregar al mensaje" });
  return { alElegir, mas };
}

describe("MenuAgregar", () => {
  it("cerrado no hay menú, y el + dice que abre uno", () => {
    const { mas } = mostrar();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(mas).toHaveAttribute("aria-haspopup", "menu");
    expect(mas).toHaveAttribute("aria-expanded", "false");
  });

  it("abre con los tres documentos y nada más: lo que no existe no está en el marcado", async () => {
    const { mas } = mostrar();
    await userEvent.click(mas);
    expect(mas).toHaveAttribute("aria-expanded", "true");
    const opciones = screen.getAllByRole("menuitem");
    expect(opciones.map((o) => o.textContent)).toEqual([
      expect.stringContaining("RUT"),
      expect.stringContaining("Cámara de Comercio"),
      expect.stringContaining("Resolución DIAN"),
    ]);
    for (const falta of ["Tomar foto", "Recientes", "Adjuntar del sistema", "Asentar sin preguntar"]) {
      expect(screen.queryByText(falta)).not.toBeInTheDocument();
    }
  });

  it("al abrir, el foco va a la primera opción; las flechas se mueven y dan la vuelta", async () => {
    const { mas } = mostrar();
    await userEvent.click(mas);
    const [rut, camara, resolucion] = screen.getAllByRole("menuitem");
    expect(rut).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(camara).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(resolucion).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(rut).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(resolucion).toHaveFocus();
  });

  it("elegir cierra el menú y pide ese documento", async () => {
    const { mas, alElegir } = mostrar();
    await userEvent.click(mas);
    await userEvent.click(screen.getByRole("menuitem", { name: /Cámara de Comercio/ }));
    expect(alElegir).toHaveBeenCalledWith("CAMARA_COMERCIO");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Escape cierra y devuelve el foco al +", async () => {
    const { mas } = mostrar();
    await userEvent.click(mas);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(mas).toHaveFocus();
  });

  it("clic afuera y el mismo botón también cierran", async () => {
    const { mas } = mostrar();
    await userEvent.click(mas);
    await userEvent.click(screen.getByText("afuera"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(mas);
    await userEvent.click(mas);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("mientras se sube un archivo no se abre", () => {
    const { mas } = mostrar(true);
    expect(mas).toBeDisabled();
  });
});
