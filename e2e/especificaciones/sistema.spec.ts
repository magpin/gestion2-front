import { expect, test } from "../fixtures/consola";

/**
 * Lo que la consola muestra de sí misma, y el interruptor de la IA: lo único
 * de acá que cambia lo que ve un cliente.
 */
test.describe("Sistema", () => {
  test("dice el estado de la API, la base y el proveedor de IA", async ({ page }) => {
    await page.goto("/plataforma/sistema");

    await expect(page.getByRole("heading", { name: "Sistema", level: 1 })).toBeVisible();
    await expect(page.getByText("Conectada")).toBeVisible();
    // El aislamiento entre clientes es lo que no puede estar mal nunca.
    await expect(page.getByText("El aislamiento entre clientes está activo.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Últimas 24 horas" })).toBeVisible();
  });

  test("pausar la IA de una cuenta y reanudarla", async ({ page, consola }) => {
    const { nombre } = await consola.crearCuenta(`e2e Veterinaria ${Date.now()}`);

    await page.goto("/plataforma/sistema");
    await expect(page.getByText("Ninguna pausa vigente. La IA funciona para todas las cuentas.")).toBeVisible();

    await page.getByRole("button", { name: "Pausar la IA" }).click();
    await page.getByPlaceholder("Nombre de la cuenta").fill(nombre);
    await page.getByRole("button", { name: nombre, exact: true }).click();
    await page.getByLabel("Motivo").fill("Prueba de punta a punta");
    await page.getByRole("button", { name: "Pausar", exact: true }).click();

    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(fila).toBeVisible();
    await fila.getByRole("button", { name: "Reanudar" }).click();

    await expect(page.getByText("Ninguna pausa vigente. La IA funciona para todas las cuentas.")).toBeVisible();
  });

  test("un anuncio se publica, se ve y se retira", async ({ page }) => {
    const titulo = `e2e Mantenimiento ${Date.now()}`;

    await page.goto("/plataforma/sistema");
    await page.getByRole("button", { name: "Nuevo anuncio" }).click();
    await page.getByLabel("Título").fill(titulo);
    await page.getByLabel("Texto").fill("Prueba de punta a punta. Se retira sola.");
    await page.getByRole("button", { name: "Publicar" }).click();

    const anuncio = page.getByRole("listitem").filter({ hasText: titulo });
    await expect(anuncio.getByText("Se está viendo")).toBeVisible();

    await anuncio.getByRole("button", { name: "Retirar" }).click();
    await expect(anuncio.getByText("Retirado")).toBeVisible();
  });

  test("el alta de administradores no es una pantalla", async ({ page }) => {
    await page.goto("/plataforma/administradores");

    await expect(page.getByRole("heading", { name: "Administradores", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /nuevo administrador/i })).toHaveCount(0);
    await expect(page.getByText("crear-super-admin.js", { exact: false })).toBeVisible();
    // Nadie puede desactivarse a sí mismo: en su propia fila no hay acciones.
    const yo = page.getByRole("row").filter({ hasText: "(usted)" });
    await expect(yo.getByRole("button")).toHaveCount(0);
  });
});
