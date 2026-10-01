import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmar = vi.fn(() => Promise.resolve(true));
const falla = vi.fn();
vi.mock("@/lib/avisos", () => ({
  aviso: { confirmar: (...a: unknown[]) => confirmar(...(a as [])), falla: (...a: unknown[]) => falla(...(a as [])), errorConSalida: vi.fn() },
}));
vi.mock("@/core/api/api", () => ({
  mensajeDeError: (e: { message: string }) => e.message,
}));

import { manejarErrorEmision } from "./errores";

const faltaExistencia = { message: "FER-001: Solo hay 3 en existencia; no se puede sacar 10." };

describe("manejarErrorEmision", () => {
  beforeEach(() => {
    confirmar.mockClear();
    falla.mockClear();
  });

  it("si la empresa no vende sin existencia, no ofrece «Emitir igual»", async () => {
    const reintentar = vi.fn();
    await manejarErrorEmision(faltaExistencia, {}, reintentar, () => {}, false);
    expect(confirmar).not.toHaveBeenCalled();
    expect(reintentar).not.toHaveBeenCalled();
    expect(falla).toHaveBeenCalled();
  });

  it("si la vende, pregunta y reintenta con la confirmación", async () => {
    const reintentar = vi.fn();
    await manejarErrorEmision(faltaExistencia, { x: 1 }, reintentar, () => {}, true);
    expect(confirmar).toHaveBeenCalled();
    expect(reintentar).toHaveBeenCalledWith({ x: 1, confirmaSinExistencia: true });
  });

  it("si el backend dice que la empresa no vende sin existencia, no vuelve a preguntar", async () => {
    const reintentar = vi.fn();
    await manejarErrorEmision(
      { message: "FER-001: Solo hay 3 en existencia; no se puede sacar 10. Esta empresa no vende sin existencia: registre la compra o un ajuste de entrada." },
      {},
      reintentar,
      () => {},
    );
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("precio bajo costo: pregunta y reintenta con esa confirmación", async () => {
    const reintentar = vi.fn();
    await manejarErrorEmision(
      { message: "El producto X se vendería por debajo de su costo" },
      {},
      reintentar,
      () => {},
      false,
    );
    expect(reintentar).toHaveBeenCalledWith({ confirmaPrecioBajoCosto: true });
  });
});
