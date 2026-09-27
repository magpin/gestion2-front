import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto, existencia } from "../fixtures/producto";
import { prepararRetenciones } from "../fixtures/retenciones";
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

  test("sin ser agente de retención, no retiene y dice por qué", async ({ page }) => {
    await llenarCompra(page, 1, 1_000_000);

    // El motor mira primero si la empresa es agente (art. 368 ET): si no lo
    // es, no pregunta nada y lo dice donde estorba.
    await expect(page.getByText(/tu empresa no es agente de retención/i)).toBeVisible();
    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Registrar compra" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await existencia(page, e)).toBe(11);
  });

  test("una compra con retención descuenta lo retenido del pago", async ({ page, request }) => {
    const { tarifa } = await prepararRetenciones(request, e, { agenteRetenedor: true });

    // Por encima de la base mínima de la ley (10 UVT). Un producto del
    // inventario es compras generales: «La vi clara», sin preguntar nada.
    await llenarCompra(page, 1, 1_000_000);
    const retenido = (1_000_000 * tarifa) / 100;
    await expect(page.getByText("La vi clara")).toBeVisible();
    await expect(page.getByText(/Se retiene/)).toContainText(retenido.toLocaleString("es-CO"));

    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Registrar compra" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // La mercancía entró igual, y lo retenido no se le paga al proveedor: se
    // le queda debiendo a la DIAN.
    expect(await existencia(page, e)).toBe(11);
    const neto = 1_000_000 - retenido;
    await expect(
      page.getByRole("row", { name: new RegExp("Distribuidora del Valle") }),
    ).toContainText(`$ ${neto.toLocaleString("es-CO")}`);
  });

  test("sin retención se puede, pero con el motivo escrito", async ({ page, request }) => {
    await prepararRetenciones(request, e, { agenteRetenedor: true });

    await llenarCompra(page, 1, 1_000_000);
    await page.getByRole("button", { name: /Registrar sin retención/ }).click();
    await page.getByRole("radio", { name: "Crédito" }).click();
    await expect(page.getByRole("button", { name: "Registrar compra" })).toBeDisabled();

    await page.getByLabel("Motivo para registrar sin retención").fill("El proveedor mostró su resolución de autorretenedor.");
    await page.getByRole("button", { name: "Registrar compra" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("row", { name: new RegExp("Distribuidora del Valle") }),
    ).toContainText("$ 1.000.000");
  });
});
