import { describe, expect, it } from "vitest";

import { explicarError, mensajeDelServidor } from "./errores";

/** Un error como los que arma axios, con el estado y el cuerpo que se le pase. */
const conRespuesta = (status: number, data: unknown) => ({
  isAxiosError: true,
  response: { status, data },
});

describe("mensajeDelServidor", () => {
  it("toma `message`, la lista de validación unida, o el `error` traducido de Postgres", () => {
    expect(mensajeDelServidor(conRespuesta(400, { message: "Solo hay 20000 en caja." }))).toBe(
      "Solo hay 20000 en caja.",
    );
    expect(
      mensajeDelServidor(conRespuesta(400, { message: ["fecha inválida", "valor requerido"] })),
    ).toBe("fecha inválida. valor requerido");
    expect(
      mensajeDelServidor(conRespuesta(409, { error: "Esa factura ya está registrada" })),
    ).toBe("Esa factura ya está registrada");
    expect(mensajeDelServidor(new Error("red"))).toBeNull();
  });
});

describe("explicarError", () => {
  it("sin respuesta: no hubo conexión, y al guardar dice que no se guardó", () => {
    const e = explicarError(new Error("Network Error"));
    expect(e.titulo).toMatch(/conectar/);
    expect(e.queHacer).toMatch(/No se guardó nada/);
    expect(e.silencioso).toBe(false);
  });

  it("al cargar avisa que la pantalla puede estar vacía: un vacío por error no es un vacío", () => {
    expect(explicarError(new Error("Network Error"), "cargar").queHacer).toMatch(
      /vacía o incompleta/,
    );
    expect(explicarError(conRespuesta(500, {}), "cargar").queHacer).toMatch(/vacía o incompleta/);
  });

  it("un rechazo del servidor usa su mensaje como título y dice que corrija", () => {
    const e = explicarError(conRespuesta(400, { message: "Esta factura ya está cobrada por completo." }));
    expect(e.titulo).toBe("Esta factura ya está cobrada por completo.");
    expect(e.queHacer).toMatch(/Corregí/);
  });

  it("403 dice a quién pedírselo, y no muestra el texto en inglés de Nest", () => {
    const e = explicarError(conRespuesta(403, { message: "Forbidden resource" }));
    expect(e.titulo).toBe("Tu usuario no tiene permiso para esto");
    expect(e.queHacer).toMatch(/Director/);
  });

  it("401 y el 403 de elegir empresa son silenciosos: el interceptor ya los resuelve", () => {
    expect(explicarError(conRespuesta(401, {})).silencioso).toBe(true);
    expect(
      explicarError(conRespuesta(403, { message: "Elegir una empresa antes de operar" })).silencioso,
    ).toBe(true);
  });

  it("409 pide recargar antes de reintentar", () => {
    expect(explicarError(conRespuesta(409, {})).queHacer).toMatch(/Recargá/);
  });

  it("5xx no expone el detalle técnico", () => {
    const e = explicarError(conRespuesta(500, { message: "relation \"x\" does not exist" }));
    expect(e.titulo).toBe("El servidor tuvo un problema");
  });
});
