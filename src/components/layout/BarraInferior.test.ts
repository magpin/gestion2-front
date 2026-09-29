import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * La barra inferior del móvil (PC20) muestra las mismas puertas que el menú:
 * ni una pieza apagada, ni una sección que al abrirla da 403. Los interruptores
 * se leen al cargar el módulo, así que cada caso lo carga de nuevo.
 */
async function puertas(funciones: string, roles: string[]) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_FUNCIONES", funciones);
  const { puertasMoviles } = await import("./BarraInferior");
  return puertasMoviles(roles as never);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("puertasMoviles", () => {
  it("con las piezas apagadas, solo Inicio", async () => {
    expect(await puertas("", ["DIRECTOR"])).toEqual(["/dashboard"]);
  });

  it("el director ve las cuatro", async () => {
    expect(await puertas("todas", ["DIRECTOR"])).toEqual([
      "/dashboard",
      "/dashboard/cobros",
      "/dashboard/pagos",
      "/dashboard/gastos",
    ]);
  });

  it("cada rol ve solo lo suyo", async () => {
    expect(await puertas("todas", ["VENTAS"])).toEqual(["/dashboard", "/dashboard/cobros"]);
    expect(await puertas("todas", ["COMPRAS"])).toEqual(["/dashboard", "/dashboard/gastos"]);
    expect(await puertas("todas", ["CAJA"])).toEqual([
      "/dashboard",
      "/dashboard/cobros",
      "/dashboard/pagos",
      "/dashboard/gastos",
    ]);
  });
});
