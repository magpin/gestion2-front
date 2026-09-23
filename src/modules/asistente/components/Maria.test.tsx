import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Maria, type EstadoMaria } from "./Maria";

/**
 * Lo que se prueba acá no es cómo se ve —eso se mira— sino lo que la cara
 * promete: que la geometría sale de una cuenta, que cada estado se distingue
 * de los demás, y que el distintivo de marca nunca falta.
 */

const ESTADOS: EstadoMaria[] = [
  "reposo",
  "leyendo",
  "pensando",
  "trabajando",
  "espera",
  "lista",
  "dormida",
  "noPude",
  "sinPermiso",
  "periodoCerrado",
  "noEntendi",
];

/** El punto naranja: se busca por su color, que es el que nunca cambia. */
function puntoDe(contenedor: HTMLElement): HTMLElement | undefined {
  return [...contenedor.querySelectorAll<HTMLElement>("span")].find((s) =>
    s.style.background.includes("--brand"),
  );
}

describe("Maria", () => {
  it("escala la cara multiplicando el tamaño, no con valores sueltos", () => {
    const { container } = render(<Maria estado="reposo" tamano={64} />);
    const ojos = [...container.querySelectorAll<HTMLElement>("span")].filter(
      (s) => s.style.width === "5.4px",
    );

    // 64 × 0,085 = 5,4 de ancho y 64 × 0,22 = 14,1 de alto.
    expect(ojos).toHaveLength(2);
    expect(ojos[0]!.style.height).toBe("14.1px");
  });

  it("lleva el punto de marca en todos los tamaños, también en el más chico", () => {
    for (const tamano of [16, 24, 64]) {
      const { container } = render(<Maria estado="reposo" tamano={tamano} />);
      const punto = puntoDe(container);
      expect(punto, `falta el punto a ${tamano} px`).toBeDefined();
      // Nunca por debajo de 2 px: más chico que eso no se ve.
      expect(Number.parseFloat(punto!.style.width)).toBeGreaterThanOrEqual(2);
    }
  });

  it("apaga el punto y el rostro solo cuando está dormida", () => {
    const { container } = render(<Maria estado="dormida" tamano={64} />);
    expect(puntoDe(container)).toBeUndefined();
    expect(container.innerHTML).toContain("--muted");
  });

  it("no deja dos estados que se vean igual", () => {
    const vistos = new Map<string, EstadoMaria>();
    for (const estado of ESTADOS) {
      const { container } = render(<Maria estado={estado} tamano={64} />);
      // Sin los retardos de parpadeo, que sí son distintos a propósito.
      const marca = container.innerHTML.replace(/animation-delay:[^;"]*;?/g, "");
      const gemelo = vistos.get(marca);
      expect(gemelo, `«${estado}» se ve igual que «${gemelo}»`).toBeUndefined();
      vistos.set(marca, estado);
    }
  });

  it("es decorativa: el estado se cuenta en texto, no en la cara", () => {
    const { container } = render(<Maria estado="espera" tamano={64} />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent?.trim()).toBe("");
  });

  it("debajo de 20 px no cabe la insignia, y no se dibuja", () => {
    const grande = render(<Maria estado="lista" tamano={64} />);
    const chica = render(<Maria estado="lista" tamano={16} />);
    expect(grande.container.innerHTML).toContain("--success");
    expect(chica.container.innerHTML).not.toContain("--success");
  });

  it("mueve los ojos hacia el campo activo, sin girar la cabeza", () => {
    const izquierda = render(<Maria estado="reposo" tamano={64} mirada="izquierda" />);
    const derecha = render(<Maria estado="reposo" tamano={64} mirada="derecha" />);
    expect(izquierda.container.innerHTML).toContain("translate(-4.5px, 1.9px)");
    expect(derecha.container.innerHTML).toContain("translate(4.5px, 1.9px)");
  });
});
