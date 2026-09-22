import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto, existencia } from "../fixtures/producto";
import { expect, test } from "../fixtures/consola";

/**
 * Comprar: la factura del proveedor entra la mercancía al inventario y deja
 * la deuda con él. Y lo que el sistema no debe dejar pasar.
 */
test.describe("Compras", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  /** Abre el formulario de compra con proveedor, número y una línea. */
  async function llenarCompra(
    page: import("@playwright/test").Page,
    cantidad: number,
    costo: number,
  ) {
    await page.goto("/dashboard/compras");
    await page.getByRole("button", { name: "Nueva compra" }).click();

    await page.getByRole("button", { name: /Seleccione un proveedor/ }).click();
    await page.getByLabel("Buscar proveedor").fill("Distribuidora");
    await page.getByRole("button", { name: /Distribuidora del Valle/ }).first().click();

    await page.getByLabel("N.° factura proveedor").fill(`FP-${Date.now().toString().slice(-6)}`);

    await page.getByRole("button", { name: /Seleccione un producto/ }).click();
    await page.getByLabel("Buscar producto").fill(e.producto.codigo);
    await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
    await page.getByLabel("Cantidad de la línea 1").fill(String(cantidad));
    await page.getByLabel("Costo unitario de la línea 1").fill(String(costo));
  }

  test("una compra entra la mercancía al inventario", async ({ page }) => {
    expect(await existencia(page, e)).toBe(10);

    await llenarCompra(page, 5, 90_000);
    // Como en ventas, no se registra sin decir cómo se paga.
    await expect(page.getByRole("button", { name: "Registrar compra" })).toBeDisabled();
    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Registrar compra" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Entraron cinco: el kardex es el que manda.
    expect(await existencia(page, e)).toBe(15);
    await expect(page.getByText(/Distribuidora del Valle/).first()).toBeVisible();
  });

  test("sin conceptos de retención cargados, dice dónde cargarlos", async ({ page }) => {
    await llenarCompra(page, 1, 100_000);

    // Las tarifas y las bases mínimas cambian cada año y las fija la DIAN: el
    // sistema no las inventa, las pide. Y lo dice donde estorba, no en una
    // ayuda aparte.
    const anio = new Date().getFullYear();
    await expect(
      page.getByText(new RegExp(`No hay conceptos cargados para ${anio}`)),
    ).toBeVisible();
    await expect(page.getByText(/Contabilidad → Retenciones/)).toBeVisible();
  });
});
