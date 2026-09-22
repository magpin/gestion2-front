import { expect, type Page } from "@playwright/test";

import type { EmpresaLista } from "./empresa";

/**
 * Facturar por la pantalla: cliente, una línea de producto y cómo se paga.
 *
 * Lo usan las pruebas que necesitan una factura ya emitida para trabajar
 * sobre ella —una nota crédito, por ejemplo—. Emitirla es lo que numera contra
 * la resolución, asienta y descuenta el kardex.
 */
export async function facturar(
  page: Page,
  e: EmpresaLista,
  cantidad = 2,
): Promise<void> {
  await page.goto("/dashboard/ventas");
  await page.getByRole("button", { name: "Facturas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva factura" }).click();

  await page.getByRole("button", { name: /Seleccione un cliente/ }).click();
  await page.getByLabel("Buscar cliente").fill("José");
  await page.getByRole("button", { name: /José Vargas/ }).first().click();

  await page.getByRole("button", { name: /Seleccione un producto/ }).click();
  await page.getByLabel("Buscar producto").fill(e.producto.codigo);
  await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
  await page.getByLabel("Cantidad de la línea 1").fill(String(cantidad));

  await page.getByRole("radio", { name: "Crédito" }).click();
  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

/** El aviso de error que sale cuando el sistema frena algo. */
export async function esperarFreno(page: Page, texto: RegExp): Promise<void> {
  const aviso = page.locator(".swal2-popup");
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText(texto);
  await page.getByRole("button", { name: "Entendido" }).click();
}
