import { API } from "../fixtures/datos";
import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { expect, test } from "../fixtures/consola";

/**
 * Crear la cuenta auxiliar desde el formulario que la pide, y mantener el plan
 * (docs/planes/plan-ventas-y-cuentas-auxiliares.md, Fase 5).
 */
test.describe("Cuentas auxiliares desde los formularios", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  test("la cuenta bancaria nueva crea su cuenta contable sin salir del formulario", async ({ page }) => {
    await page.goto("/dashboard/caja-bancos");
    await page.getByRole("button", { name: "Bancos", exact: true }).click();
    await page.getByRole("button", { name: "Agregar cuenta" }).first().click();

    const dialogo = page.getByRole("dialog", { name: "Nueva cuenta bancaria" });
    await dialogo.getByLabel("Banco *").fill("Bancolombia");
    await dialogo.getByLabel("Número de cuenta *").fill("123-456-1234");

    await dialogo.getByRole("button", { name: /Seleccione una cuenta auxiliar/ }).click();
    await page.getByRole("button", { name: "Crear cuenta auxiliar" }).click();

    // Propone el nombre con el banco y los últimos cuatro, y el código bajo 111005.
    const crear = page.getByRole("dialog", { name: "Crear cuenta auxiliar" });
    await expect(crear.getByLabel("Nombre")).toHaveValue("Bancos - Bancolombia ···1234");
    await expect(crear.getByLabel("Código de la cuenta nueva")).toContainText(/^111005\d{2}$/);
    await crear.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(crear).toBeHidden();

    // Quedó elegida: se guarda la cuenta bancaria sin tocar nada más.
    await expect(dialogo).toContainText("Bancos - Bancolombia ···1234");
    await dialogo.getByRole("button", { name: "Guardar cuenta bancaria" }).click();
    await expect(dialogo).toBeHidden();
  });

  test("una cuenta desactivada se vuelve a activar desde el plan", async ({ page, request }) => {
    const auth = { Authorization: `Bearer ${e.token}` };
    const creada = (await request
      .post(`${API}/plan-cuentas/auxiliar`, { headers: auth, data: { madre: "530505", nombre: "Gastos bancarios e2e" } })
      .then((r) => r.json())) as { id: string; codigo: string };
    const r = await request.post(`${API}/plan-cuentas/${creada.id}/desactivar`, { headers: auth });
    expect(r.ok(), await r.text()).toBeTruthy();

    // Se llega filtrado, como desde el aviso «Ir al plan de cuentas».
    await page.goto(`/dashboard/plan-cuentas?q=${creada.codigo}&inactivas=1`);
    await expect(page.getByText("Gastos bancarios e2e")).toHaveClass(/line-through/);
    await page.getByRole("button", { name: "Activar" }).click();
    await expect(page.getByText("Gastos bancarios e2e")).not.toHaveClass(/line-through/);
  });
});
