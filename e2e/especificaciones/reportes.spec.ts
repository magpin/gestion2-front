import { mirar } from "../fixtures/datos";
import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { facturar } from "../fixtures/venta";
import { expect, test } from "../fixtures/consola";

/**
 * Los reportes: elegir uno, elegir el período y verlo en pantalla tal como se
 * imprime.
 *
 * La prueba factura primero, porque un reporte de una empresa sin movimientos
 * no demuestra nada: lo que importa es que lo facturado aparezca.
 */
test.describe("Reportes", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
    await facturar(page, e);
  });

  test("elegir un reporte, elegir el período y verlo con la venta adentro", async ({ page }) => {
    await page.goto("/dashboard/reportes");
    await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
    await mirar(page);

    // La tarjeta entera es el botón, y dice qué pregunta responde el reporte.
    await page.getByRole("button", { name: /Ventas del mes por cliente/ }).click();

    // El período no se teclea: se elige un atajo, y viene uno puesto.
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Este mes/ })).toBeChecked();
    await mirar(page);
    await page.getByRole("button", { name: "Ver el reporte" }).click();

    // El visor: la hoja llega armada del servidor y se muestra dentro de un
    // `iframe`, que es lo que hace que se vea igual impresa que en pantalla.
    await expect(page).toHaveURL(/\/reportes\//);
    const hoja = page.frameLocator("iframe").first();
    await expect(hoja.getByText(e.razonSocial).first()).toBeVisible();
    await expect(hoja.getByText("357.000").first()).toBeVisible();
    await expect(hoja.getByText(/1 facturas/).first()).toBeVisible();

    await mirar(page, 6);

    // Son dos páginas: el resumen con gráficas, y el detalle factura por
    // factura. Se pasa con la flecha, como un impreso.
    await expect(page.getByText("1 / 2")).toBeVisible();
    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText("2 / 2")).toBeVisible();
    await expect(hoja.getByText("José Vargas").first()).toBeVisible();
    await mirar(page, 6);

    // Y se puede sacar en PDF o en Excel, que es para lo que se pide.
    await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Excel" })).toBeEnabled();
  });

  test("la cartera muestra a quién le vendimos a crédito y desde cuándo", async ({ page }) => {
    await page.goto("/dashboard/reportes");

    // El otro reporte no pide un rango sino una fecha de corte: la cartera es
    // una foto de un día, no lo que pasó entre dos.
    await page.getByRole("button", { name: /Antigüedad de saldos de cartera/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await mirar(page);
    await page.getByRole("button", { name: "Ver el reporte" }).click();

    const hoja = page.frameLocator("iframe").first();
    await expect(hoja.getByText("José Vargas").first()).toBeVisible();
    // La factura se emitió hoy y a crédito: debe caer en el tramo más nuevo.
    await expect(hoja.getByText("357.000").first()).toBeVisible();
    await mirar(page, 6);
  });
});
