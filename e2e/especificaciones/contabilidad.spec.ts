import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { facturar } from "../fixtures/venta";
import { expect, test } from "../fixtures/consola";

/**
 * El libro: lo que la operación deja escrito sin que nadie lo digite.
 *
 * Nadie registra a mano el asiento de una factura. La prueba factura por la
 * pantalla de ventas y después va a mirar el libro: si el asiento no está, o
 * si el balance no cuadra, la contabilidad está mintiendo.
 */
test.describe("Libro y balance", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
    await facturar(page, e);
    await page.goto("/dashboard/contabilidad");
    await page.getByRole("button", { name: "Libros", exact: true }).click();
  });

  test("la factura deja su asiento en el diario, con las dos partidas", async ({ page }) => {
    // El diario es lo primero que se ve: no hay que elegir nada.
    const diario = page.getByRole("button", { name: /Diario/ });
    await expect(diario).toHaveAttribute("aria-pressed", "true");

    // La venta: lo que el cliente debe, contra el ingreso y el IVA.
    await expect(page.getByText("Clientes nacionales").first()).toBeVisible();
    await expect(page.getByText("357.000").first()).toBeVisible();

    // Y el costo: la mercancía sale del inventario en el mismo momento.
    await expect(page.getByText("Costo de mercancías vendidas").first()).toBeVisible();
  });

  test("el balance de prueba del período cuadra", async ({ page }) => {
    await page.getByRole("button", { name: /Balance de prueba/ }).click();

    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();

    // Lo que le da el nombre al balance de prueba: débitos igual a créditos.
    // Cuando no cuadra, la propia pantalla lo grita; acá no debe gritarlo.
    await expect(page.getByText("Totales")).toBeVisible();
    await expect(page.getByText(/no cuadran/)).toHaveCount(0);

    const totales = page.getByRole("row").filter({ hasText: "Totales" });
    const celdas = await totales.getByRole("cell").allInnerTexts();
    const [debitos, creditos] = celdas.slice(1, 3);
    expect(debitos).toBe(creditos);
  });

  test("el mayor de una cuenta muestra su movimiento y su saldo", async ({ page }) => {
    await page.getByRole("button", { name: /Mayor/ }).click();

    // El botón se llama "Cuenta" y no "Seleccione una cuenta auxiliar": el
    // `<label>` que lo envuelve le gana al texto de adentro, así que un lector
    // de pantalla nunca dice qué cuenta quedó elegida.
    await page.getByRole("button", { name: "Cuenta", exact: true }).click();
    await page.getByLabel("Buscar cuenta").fill("4135");
    // Hay que esperar a que la lista quede filtrada: mientras busca se
    // desmonta, y el clic sobre el resultado viejo se pierde sin avisar.
    const resultado = page.getByRole("dialog").getByRole("button", {
      name: /413505/,
    });
    await expect(resultado).toHaveCount(1);
    await resultado.click();
    await expect(page.getByRole("button", { name: "Cuenta", exact: true })).toContainText(
      "413505",
    );

    // Dos unidades a $150.000: el ingreso del período, sin el IVA.
    await expect(page.getByText("300.000").first()).toBeVisible();
  });
});
