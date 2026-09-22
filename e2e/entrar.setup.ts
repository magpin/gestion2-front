import { expect, test as setup } from "@playwright/test";

import { ADMIN } from "./fixtures/datos";

const SESION = "./e2e/.sesion/admin.json";

/**
 * Entra a la consola una sola vez y guarda la sesión para las demás pruebas.
 *
 * Se entra **por la pantalla**, no metiendo el token a mano: el login es la
 * primera cosa que tiene que funcionar, y si se rompe conviene que se rompa
 * acá, con un mensaje claro, y no en cada prueba.
 */
setup("el superadministrador entra por el login de siempre", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Correo electrónico").fill(ADMIN.email);
  // Exacto: al lado del campo está el botón «Ver contraseña».
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  // La consola, no el área de trabajo de un cliente.
  await expect(page).toHaveURL(/\/plataforma$/);
  await expect(page.getByRole("navigation", { name: /consola de administración/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inicio", level: 1 })).toBeVisible();

  await page.context().storageState({ path: SESION });
});
