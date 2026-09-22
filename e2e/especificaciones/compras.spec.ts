import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto, existencia } from "../fixtures/producto";
import { prepararRetenciones } from "../fixtures/retenciones";
import { esperarFreno } from "../fixtures/venta";
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

  /** Abre el editor de retenciones y practica una con su base. */
  async function retener(page: import("@playwright/test").Page, base: number) {
    await page.getByRole("button", { name: "Agregar retención" }).click();
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: /Compras generales/ }).click();
    await page.getByLabel("Base de la retención 1").fill(String(base));
  }

  test("no deja retener si la empresa no es agente de retención", async ({ page, request }) => {
    await prepararRetenciones(request, e, { agenteRetenedor: false });

    await llenarCompra(page, 1, 100_000);
    await retener(page, 100_000);
    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Registrar compra" }).click();

    // Retener sin estar inscrito produce una declaración que no cuadra con lo
    // que la DIAN espera de la empresa.
    await esperarFreno(page, /no es agente de retención/i);
    expect(await existencia(page, e)).toBe(10);
  });

  test("una compra con retención descuenta lo retenido del pago", async ({ page, request }) => {
    const { tarifa } = await prepararRetenciones(request, e, { agenteRetenedor: true });

    await llenarCompra(page, 1, 100_000);
    await retener(page, 100_000);
    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Registrar compra" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // La mercancía entró igual, y lo retenido no se le paga al proveedor: se
    // le queda debiendo a la DIAN.
    expect(await existencia(page, e)).toBe(11);
    const retenido = (100_000 * tarifa) / 100;
    const neto = 100_000 - retenido;
    await expect(
      page.getByRole("row", { name: new RegExp("Distribuidora del Valle") }),
    ).toContainText(`$ ${neto.toLocaleString("es-CO")}`);
  });
});
