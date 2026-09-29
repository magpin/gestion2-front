import type { Page } from "@playwright/test";

import { API } from "../fixtures/datos";
import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { expect, test } from "../fixtures/consola";

/**
 * Las pantallas complementarias (docs/planes/plan-pantallas-complementarias.md,
 * Fases 7 a 10): la compra y la factura como página, con su resumen y el
 * asiento antes de guardar; el comprobante manual que arma María; y el móvil.
 *
 * Necesitan las piezas prendidas (`NEXT_PUBLIC_FUNCIONES=todas`, como en QA).
 */

/** Cuánto se sale la página de lado: más de 0 es que hay que desplazar. */
async function anchoQueSeSale(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** Le da al dueño de la cuenta también el rol CONTADOR: el comprobante manual es suyo. */
async function hacerContador(request: import("@playwright/test").APIRequestContext, e: EmpresaLista) {
  const sesion = (await request
    .post(`${API}/auth/login`, { data: e.acceso })
    .then((r) => r.json())) as { token: string };
  const auth = { Authorization: `Bearer ${sesion.token}` };
  const usuarios = (await request.get(`${API}/usuarios`, { headers: auth }).then((r) => r.json())) as Array<{
    id: string;
    email: string;
  }>;
  const yo = usuarios.find((u) => u.email === e.acceso.email)!;
  const r = await request.post(`${API}/usuarios/${yo.id}/roles`, {
    headers: auth,
    data: { empresaId: e.empresaId, rol: "CONTADOR" },
  });
  expect(r.ok(), `asignar CONTADOR: ${await r.text()}`).toBeTruthy();
}

test.describe("Pantallas complementarias", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  test("la compra como página muestra lo que se le va a pagar y el asiento antes de guardar", async ({ page }) => {
    await page.goto("/dashboard/compras");
    await page.getByRole("button", { name: "Nueva compra" }).click();
    await expect(page).toHaveURL(/\/dashboard\/compras\/nueva$/);

    await page.getByRole("button", { name: /Seleccione un proveedor/ }).click();
    await page.getByLabel("Buscar proveedor").fill("Distribuidora");
    await page.getByRole("button", { name: /Distribuidora del Valle/ }).first().click();
    await page.getByLabel("N.° factura proveedor").fill(`FP-${Date.now().toString().slice(-6)}`);
    // Un CUFE corto no se acepta: se dice antes de pedir el resumen.
    await page.getByLabel("CUFE (opcional)").fill("a41f9c07e2");
    await expect(page.getByText(/El CUFE tiene entre 20 y 200 caracteres/)).toBeVisible();
    await page.getByLabel("CUFE (opcional)").fill("a41f9c07e2b8d3f1c6a094e7d2b5c8f1a3e6d9b0");

    await page.getByRole("button", { name: /Seleccione un producto/ }).click();
    await page.getByLabel("Buscar producto").fill(e.producto.codigo);
    await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
    await page.getByLabel("Cantidad de la línea 1").fill("2");
    await page.getByLabel("Costo unitario de la línea 1").fill("90000");
    await page.getByRole("radio", { name: "Crédito" }).click();

    // El resumen lo arma el servidor corriendo la compra y deshaciéndola.
    await expect(page.getByText("Le vas a pagar")).toBeVisible();
    await expect(page.getByText("Así queda en el libro")).toBeVisible();
    await expect(page.getByText("Proveedores nacionales").first()).toBeVisible();
    await page.screenshot({ path: "e2e/.capturas/compra-pagina.png", fullPage: true });

    await page.getByRole("button", { name: "Registrar compra" }).click();
    await expect(page).toHaveURL(/\/dashboard\/compras$/);
    await expect(page.getByText(/Distribuidora del Valle/).first()).toBeVisible();
  });

  test("el documento soporte sin resolución lo dice antes de intentar", async ({ page }) => {
    await page.goto("/dashboard/compras/nueva");
    await page.getByRole("radio", { name: /Documento soporte/ }).click();
    await expect(page.getByText(/No hay una resolución de documento soporte vigente/)).toBeVisible();
    // El soporte lo numera la empresa: no se pide el número del proveedor.
    await expect(page.getByLabel("N.° factura proveedor")).toBeHidden();
  });

  test("la factura lleva un producto y un servicio, y el servicio no sale del inventario", async ({ page }) => {
    await page.goto("/dashboard/ventas/nueva");

    await page.getByRole("button", { name: /Seleccione un cliente/ }).click();
    await page.getByLabel("Buscar cliente").fill("José");
    await page.getByRole("button", { name: /José Vargas/ }).first().click();

    await page.getByRole("button", { name: /Seleccione un producto/ }).click();
    await page.getByLabel("Buscar producto").fill(e.producto.codigo);
    await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
    await page.getByLabel("Cantidad de la línea 1").fill("1");

    await page.getByRole("button", { name: "Agregar servicio u otro ingreso" }).click();
    await page.getByRole("combobox").filter({ hasText: "Elegí el concepto" }).click();
    await page.getByRole("option", { name: /Servicios de taller/ }).click();
    await page.getByLabel("Detalle de la línea 2").fill("Instalación en el local del cliente");
    await page.getByLabel("Precio de la línea 2").fill("120000");

    await page.getByRole("radio", { name: "Crédito" }).click();
    await expect(page.getByText("Vas a recibir")).toBeVisible();
    // El servicio entra a su cuenta, no a la de la mercancía.
    await expect(page.getByText("415595").first()).toBeVisible();
    await expect(page.getByText(/Y aparte, el costo/)).toBeVisible();
    await page.screenshot({ path: "e2e/.capturas/factura-pagina.png", fullPage: true });

    await page.getByRole("button", { name: "Emitir factura" }).click();
    await expect(page).toHaveURL(/\/dashboard\/ventas\?seccion=facturas$/);
  });

  test("María arma la depreciación y explica la cuenta", async ({ page, request }) => {
    await hacerContador(request, e);
    // Los roles se leen al entrar: se sale y se vuelve a entrar.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await entrarAlProducto(page, e);
    await page.goto("/dashboard/contabilidad/comprobante");

    await page.getByPlaceholder(/Depreciación de septiembre/).fill("Depreciación de septiembre de los equipos de cómputo");
    await page.getByRole("button", { name: "Armar asiento" }).click();

    // Reconoce la plantilla y la clase; faltan el costo y los meses.
    await page.getByLabel("Costo del activo").fill("24750000");
    await page.getByLabel("Vida útil (meses)").fill("60");
    await page.getByRole("button", { name: "Proponer" }).click();

    await expect(page.getByText("Cómo lo calculó María")).toBeVisible();
    await expect(page.getByText("24.750.000 ÷ 60 = 412.500")).toBeVisible();
    await expect(page.getByText("Antes de contabilizar")).toBeVisible();
    await page.screenshot({ path: "e2e/.capturas/comprobante-manual.png", fullPage: true });
  });
});

test.describe("Móvil", () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });

  test("la barra de abajo lleva a Pagos, que muestra una tarjeta por factura", async ({ page, request }) => {
    const e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);

    const barra = page.getByRole("navigation", { name: "Secciones" });
    await expect(barra).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inicio", level: 1 })).toBeVisible();
    await page.screenshot({ path: "e2e/.capturas/movil-inicio.png", fullPage: true });

    await barra.getByRole("link", { name: "Pagos" }).click();
    await expect(page.getByRole("heading", { name: "Pagos", level: 1 })).toBeVisible();
    expect(await anchoQueSeSale(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: "e2e/.capturas/movil-pagos.png", fullPage: true });

    await barra.getByRole("button", { name: "Más" }).click();
    await expect(page.getByRole("link", { name: "Compras" })).toBeVisible();
  });

  test("registrar gasto ocupa toda la pantalla", async ({ page, request }) => {
    const e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
    await page.goto("/dashboard/gastos");
    await page.getByRole("button", { name: "Registrar gasto" }).first().click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    // Después de la animación de entrada, de borde a borde. Con la ventana
    // visible, Chrome reserva hasta 15 px para su barra de desplazamiento.
    await expect
      .poll(async () => Math.round((await dialogo.boundingBox())?.width ?? 0))
      .toBeGreaterThanOrEqual(390 - 15);
    await page.screenshot({ path: "e2e/.capturas/movil-gasto.png" });
  });
});
