import { expect, type Page } from "@playwright/test";

import type { EmpresaLista } from "./empresa";

/**
 * Entrar al producto como lo hace una persona: el mismo login de siempre y
 * después elegir la empresa. Son dos etapas a propósito —el token de sesión no
 * puede leer datos contables—, así que la prueba pasa por las dos.
 */
export async function entrarAlProducto(page: Page, e: EmpresaLista): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(e.acceso.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(e.acceso.password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  // Con una sola empresa, el sistema la elige solo y entra derecho; con
  // varias, muestra el selector. La prueba sirve para los dos casos.
  await page.waitForURL(/\/(empresa|dashboard)/);
  if (page.url().includes("/empresa")) {
    await page.getByRole("button", { name: new RegExp(e.razonSocial) }).click();
  }
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Lo que dice el kardex del producto, por la API: es el número que manda. */
export async function existencia(
  page: Page,
  e: EmpresaLista,
  api = process.env.E2E_API ?? "http://localhost:3001/api/v1",
): Promise<number> {
  const r = await page.request.get(`${api}/productos/${e.producto.id}`, {
    headers: { Authorization: `Bearer ${e.token}` },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  // `saldo_cantidad` es lo que dice el kardex: el saldo del último movimiento.
  const p = (await r.json()) as { saldo_cantidad?: string | number };
  return Number(p.saldo_cantidad ?? 0);
}
