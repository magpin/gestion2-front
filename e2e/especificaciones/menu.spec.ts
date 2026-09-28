import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { expect, test } from "../fixtures/consola";

/**
 * El menú por el camino de la plata (`docs/planes/menu-propuesto-ingresos-egresos.md`).
 *
 * Reordenar no puede perder nada: cada pantalla y cada pestaña de antes se
 * abre desde el menú nuevo, y los enlaces viejos —favoritos, avisos de María—
 * siguen llegando a su lugar nuevo.
 */
test.describe("Menú nuevo", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  test("los grupos del menú, en el orden de la plata", async ({ page }) => {
    const menu = page.locator("[data-sidebar='sidebar']").first();
    for (const grupo of ["Ingresos", "Egresos", "Dinero", "Inventario", "Contabilidad", "Análisis"]) {
      await expect(menu.getByText(grupo, { exact: true }).first()).toBeVisible();
    }
    for (const entrada of [
      "Ventas",
      "Compras",
      "Caja y bancos",
      "Control",
      "Libro",
      "Retenciones",
      "Plan de cuentas",
      "Terceros",
      "Reportes",
      "Referencia",
    ]) {
      await expect(menu.getByRole("link", { name: entrada, exact: true })).toBeVisible();
    }
  });

  test("Tesorería partida en dos: Caja y bancos, y Control", async ({ page }) => {
    await page.goto("/dashboard/caja-bancos");
    await expect(page.getByRole("heading", { name: "Caja y bancos." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cajas", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cuentas bancarias", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Movimientos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Libro de caja" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Libro de bancos" })).toBeVisible();

    await page.goto("/dashboard/control");
    await expect(page.getByRole("heading", { name: "Control." })).toBeVisible();
    for (const pestana of ["Arqueo", "Corte diario", "Extractos", "Conciliación", "Reglas"]) {
      await expect(page.getByRole("button", { name: pestana, exact: true })).toBeVisible();
    }
  });

  test("los enlaces viejos llegan a su lugar nuevo", async ({ page }) => {
    await page.goto("/dashboard/tesoreria");
    await expect(page).toHaveURL(/\/dashboard\/caja-bancos$/);

    await page.goto("/dashboard/catalogos/ciiu");
    await expect(page).toHaveURL(/\/dashboard\/referencia\?catalogo=ciiu$/);
    await expect(page.getByRole("heading", { name: "Actividades económicas (CIIU)" })).toBeVisible();

    await page.goto("/dashboard/ventas?seccion=pedidos");
    await expect(page).toHaveURL(/\/dashboard\/asistente\/leidos\?tipo=pedidos$/);

    await page.goto("/dashboard/ventas?seccion=anteriores");
    await expect(page).toHaveURL(/\/dashboard\/datos-anteriores$/);
  });

  test("lo que salió de sus pestañas sigue a un clic", async ({ page }) => {
    // Retenciones: entrada propia, ya no pestaña del Libro.
    await page.goto("/dashboard/retenciones");
    await expect(page.getByRole("heading", { name: "Tarifas de la ley" })).toBeVisible();
    await page.goto("/dashboard/contabilidad");
    await expect(page.getByRole("button", { name: "Retenciones", exact: true })).toHaveCount(0);

    // Lo leído por María: desde el atajo de Compras.
    await page.goto("/dashboard/compras");
    await expect(page.getByRole("button", { name: "Leídas", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Facturas leídas por María" }).click();
    await expect(page.getByRole("heading", { name: "Documentos leídos." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pedidos de clientes" })).toBeVisible();

    // Las ventas del sistema anterior, fuera de Ventas.
    await page.goto("/dashboard/ventas");
    await expect(page.getByRole("button", { name: "Ventas anteriores", exact: true })).toHaveCount(0);
    await page.goto("/dashboard/datos-anteriores");
    await expect(page.getByRole("heading", { name: "Datos anteriores." })).toBeVisible();
  });
});
