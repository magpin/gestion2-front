import type { Page } from "@playwright/test";

import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { expect, test } from "../fixtures/consola";

/**
 * Las dos listas de las que cuelga todo lo demás: el plan de cuentas y los
 * terceros.
 *
 * No son pantallas de configuración que se llenan una vez: una cuenta nueva
 * aparece a mitad de un año y un cliente nuevo se crea mientras se le factura.
 */
test.describe("Plan de cuentas y terceros", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  /** Abre el formulario de tercero y lo deja como persona jurídica con NIT. */
  async function nuevoTerceroJuridico(page: Page, nit: string, razonSocial: string) {
    await page.goto("/dashboard/terceros");
    await page.getByRole("button", { name: "Nuevo tercero" }).first().click();

    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Jurídica" }).click();
    await dialogo.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /NIT/ }).first().click();

    await page.getByLabel("Número").fill(nit);
    await page.getByLabel("Razón social").fill(razonSocial);
    return dialogo;
  }

  test("el auxiliar cuelga de su cuenta y el sistema le pone el código", async ({ page }) => {
    await page.goto("/dashboard/plan-cuentas");
    await page.getByLabel("Buscar cuenta", { exact: true }).fill("1105");

    // "Auxiliar" abre la línea para crearlo bajo esa cuenta.
    await page.getByRole("button", { name: "Auxiliar" }).first().click();

    // El código no se digita: lo calcula el sistema para que no queden huecos
    // ni repetidos entre los auxiliares de una misma madre.
    const codigo = page.getByLabel("Código del auxiliar");
    await expect(codigo).toHaveValue(/^1105\d{2,}$/);
    await expect(codigo).toHaveAttribute("readonly", "");

    await page.getByLabel("Nombre del auxiliar").fill("Caja menor recepción");
    await page.getByRole("button", { name: "Crear", exact: true }).click();

    await expect(page.getByText("Caja menor recepción")).toBeVisible();
  });

  test("un cliente con NIT: el dígito de verificación lo pone el sistema", async ({ page }) => {
    const dialogo = await nuevoTerceroJuridico(page, "900373115", "Ferretería La Esquina S.A.S.");

    // El DV no se digita ni se puede corregir: sale del número.
    const dv = page.getByLabel("DV");
    await expect(dv).toHaveValue("3");
    await expect(dv).toHaveAttribute("readonly", "");

    await dialogo.getByRole("button", { name: "Registrar tercero" }).click();
    await expect(dialogo).toBeHidden();

    await expect(page.getByText("Ferretería La Esquina S.A.S.")).toBeVisible();
    await expect(page.getByText("900373115-3")).toBeVisible();
  });

  test("un tercero tiene que ser cliente o proveedor: algo tiene que ser", async ({ page }) => {
    const dialogo = await nuevoTerceroJuridico(page, "901234567", "Nadie en particular S.A.S.");

    // Viene marcado como cliente; al desmarcarlo no le queda ningún rol.
    await dialogo.getByRole("button", { name: /Cliente/ }).click();
    await dialogo.getByRole("button", { name: "Registrar tercero" }).click();

    // No se guarda, y el formulario lo dice sin ir al servidor.
    await expect(page.getByText("Tiene que ser cliente, proveedor o empleado (o varios)")).toBeVisible();
    await expect(dialogo).toBeVisible();
  });
});
