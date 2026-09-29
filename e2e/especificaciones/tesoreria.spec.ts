import type { Page } from "@playwright/test";

import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { prepararCaja, saldoCaja } from "../fixtures/tesoreria";
import { facturar } from "../fixtures/venta";
import { expect, test } from "../fixtures/consola";

/** La factura de la preparación: 2 × $150.000 más el 19% de IVA. */
const FACTURA = 357_000;
/**
 * La compra al proveedor: 1 × $90.000, sin IVA. El IVA de una compra sale del
 * proveedor, no del producto: el de la preparación no es responsable de IVA,
 * así que lo que se le debe es el costo pelado.
 */
const COMPRA = 90_000;

/**
 * La plata: la que entra cuando el cliente paga y la que sale cuando se le
 * paga al proveedor.
 *
 * Las dos pasan por la misma caja, y la caja lleva su libro: cobrar y pagar no
 * son dos botones sueltos, son el movimiento de un saldo que después alguien
 * cuadra contra el efectivo del cajón.
 */
test.describe("Tesorería", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;
  let caja: { id: string; nombre: string };

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    caja = await prepararCaja(request, e);
    await entrarAlProducto(page, e);
  });

  /** Elige la caja y el valor en el renglón de medios de pago del diálogo. */
  async function pagarPorCaja(page: Page, valor: number) {
    await page.getByRole("combobox").filter({ hasText: /Seleccione una caja/ }).click();
    await page.getByRole("option", { name: caja.nombre }).click();
    await page.getByLabel("Valor del renglón 1").fill(String(valor));
  }

  test("cobrar una factura mete la plata en la caja y la deja sin saldo", async ({
    page,
    request,
  }) => {
    await facturar(page, e);
    expect(await saldoCaja(request, e, caja.id)).toBe(0);

    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await page.getByRole("menuitem", { name: "Cobrar" }).click();

    // El diálogo dice cuánto falta antes de que uno lo escriba.
    await expect(page.getByRole("dialog")).toContainText("357.000");
    await pagarPorCaja(page, FACTURA);
    await page.getByRole("dialog").getByRole("button", { name: "Cobrar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // La plata está en la caja, y la factura ya no se puede volver a cobrar.
    expect(await saldoCaja(request, e, caja.id)).toBe(FACTURA);
    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await expect(page.getByRole("menuitem", { name: "Cobrar" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Devolver cobro" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("pagarle al proveedor saca la plata de la misma caja", async ({ page, request }) => {
    // Primero entra la plata: una caja no puede quedar en negativo.
    await facturar(page, e);
    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await page.getByRole("menuitem", { name: "Cobrar" }).click();
    await pagarPorCaja(page, FACTURA);
    await page.getByRole("dialog").getByRole("button", { name: "Cobrar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // ── La compra, a crédito, para deberle al proveedor ──
    await page.goto("/dashboard/compras");
    await page.getByRole("button", { name: "Nueva compra" }).click();
    await page.getByRole("button", { name: /Seleccione un proveedor/ }).click();
    await page.getByLabel("Buscar proveedor").fill("Distribuidora");
    await page.getByRole("button", { name: /Distribuidora del Valle/ }).first().click();
    await page.getByLabel("Número de factura").fill(`FP-${Date.now().toString().slice(-6)}`);
    await page.getByRole("button", { name: /Seleccione un producto/ }).click();
    await page.getByLabel("Buscar producto").fill(e.producto.codigo);
    await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
    await page.getByLabel("Cantidad de la línea 1").fill("1");
    await page.getByLabel("Costo unitario de la línea 1").fill("90000");
    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Registrar compra" }).click();
    // Guardada: el diálogo se cierra, o la página vuelve a la lista (Fase 7).
    await expect(page.getByRole("button", { name: "Registrar compra" })).toBeHidden();

    // ── Y el pago ──
    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await page.getByRole("menuitem", { name: "Pagar" }).click();
    await pagarPorCaja(page, COMPRA);
    await page.getByRole("dialog").getByRole("button", { name: "Pagar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    expect(await saldoCaja(request, e, caja.id)).toBe(FACTURA - COMPRA);
  });

  test("el libro de la caja deja ver de dónde salió cada peso", async ({ page }) => {
    await facturar(page, e);
    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await page.getByRole("menuitem", { name: "Cobrar" }).click();
    await pagarPorCaja(page, FACTURA);
    await page.getByRole("dialog").getByRole("button", { name: "Cobrar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/dashboard/caja-bancos");
    await page.getByRole("button", { name: "Movimientos", exact: true }).click();

    // El cobro no se digita en tesorería: llega solo desde la factura.
    await expect(page.getByText("357.000").first()).toBeVisible();
  });
});
