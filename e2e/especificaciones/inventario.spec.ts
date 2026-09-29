import type { Page } from "@playwright/test";

import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto, existencia } from "../fixtures/producto";
import { expect, test } from "../fixtures/consola";

/**
 * El kardex: lo que entra, lo que sale y lo que queda.
 *
 * Es el número que manda cuando alguien pregunta «cuánto hay». La pantalla de
 * productos lo muestra, pero quien lo decide es el movimiento, y un
 * movimiento no se edita ni se anula: se corrige con el contrario.
 */
test.describe("Inventario", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  /** Abre el kardex del producto de la prueba y elige el tipo de movimiento. */
  async function abrirKardex(page: Page, tipo: string) {
    await page.goto("/dashboard/inventario");
    await page.getByRole("button", { name: "Kardex", exact: true }).click();

    await page.getByRole("button", { name: /Seleccione un producto/ }).click();
    await page.getByLabel("Buscar producto").fill(e.producto.codigo);
    await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: tipo }).click();
  }

  /** Llena y guarda el formulario ya abierto. La salida no pide costo. */
  async function registrar(page: Page, cantidad: number, motivo: string, costo?: number) {
    await page.getByLabel("Cantidad *").fill(String(cantidad));
    if (costo !== undefined) await page.getByLabel("Costo unitario *").fill(String(costo));
    await page.getByLabel("Motivo *").fill(motivo);
    await page.getByRole("dialog").getByRole("button", { name: "Registrar movimiento" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }

  // La cuenta de los ajustes ya no se elige en una pestaña de Configuración:
  // la pone el sistema con las cuentas automáticas del Plan de cuentas
  // (28f9db6). Una empresa nueva ajusta desde el primer día.
  test("entra, sale y el saldo cuadra", async ({ page }) => {
    expect(await existencia(page, e)).toBe(10);

    // ── La entrada: aparecieron tres más en el conteo físico ──
    await abrirKardex(page, "Entrada de ajuste");
    await page.getByRole("button", { name: "Registrar movimiento" }).click();
    await registrar(page, 3, "Sobrante en el conteo físico", 100_000);
    expect(await existencia(page, e)).toBe(13);

    // ── La salida: se valora al promedio vigente, por eso no pide costo ──
    await abrirKardex(page, "Salida de ajuste");
    await page.getByRole("button", { name: "Registrar movimiento" }).click();
    await expect(page.getByLabel("Costo unitario *")).toHaveCount(0);
    await registrar(page, 4, "Rotura en bodega");
    expect(await existencia(page, e)).toBe(9);

    // El kardex guarda los dos, con su motivo y el saldo que dejaron.
    await expect(page.getByRole("row").filter({ hasText: "Entrada de ajuste" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "Salida de ajuste" })).toHaveCount(1);
  });
});
