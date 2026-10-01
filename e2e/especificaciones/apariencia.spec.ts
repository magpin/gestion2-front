import { expect, test } from "../fixtures/consola";

/**
 * Cómo se ve la consola en modo oscuro y en un celular.
 *
 * No compara imágenes: una captura que cambia con cada ajuste de diseño se
 * vuelve una prueba que nadie mira. Verifica lo que sí se puede afirmar —que
 * nada se salga de la pantalla, que el texto se lea contra su fondo, que en
 * celular el riel se vuelva menú— y deja una captura de cada pantalla en
 * `e2e/.capturas/` para revisarla con los ojos.
 *
 * El tema se pone como lo pone una persona: dejando la preferencia guardada
 * antes de cargar, que es lo que lee el guion del `<head>`. Así se prueba
 * también que no haya destello blanco al entrar.
 */
const PANTALLAS = [
  { nombre: "inicio", ruta: "/plataforma", titulo: "Inicio" },
  { nombre: "cuentas", ruta: "/plataforma/cuentas", titulo: "Cuentas" },
  { nombre: "planes", ruta: "/plataforma/planes", titulo: "Planes" },
  { nombre: "sistema", ruta: "/plataforma/sistema", titulo: "Sistema" },
  { nombre: "bitacora", ruta: "/plataforma/bitacora", titulo: "Bitácora" },
  { nombre: "administradores", ruta: "/plataforma/administradores", titulo: "Administradores" },
];

/** Lo que se sale de la pantalla a lo ancho: en celular es el defecto típico. */
async function anchoQueSeSale(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** El color de fondo de la página, ya resuelto por el navegador. */
async function fondo(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test.describe("Modo oscuro", () => {
  test.use({ colorScheme: "dark" });

  // La preferencia de quien ya eligió oscuro: va en cookies, que es lo que
  // lee el servidor para armar el HTML.
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "tema", value: "oscuro", url: "http://localhost:3000" },
      { name: "tema-efectivo", value: "dark", url: "http://localhost:3000" },
    ]);
  });

  for (const p of PANTALLAS) {
    test(`${p.titulo} se ve en oscuro`, async ({ page }) => {
      await page.goto(p.ruta);
      await expect(page.getByRole("heading", { name: p.titulo, level: 1 })).toBeVisible();

      // Fondo oscuro de verdad: `neutral-900`, no el claro con letras blancas.
      expect(await fondo(page)).toBe("rgb(23, 23, 23)");
      expect(await anchoQueSeSale(page)).toBeLessThanOrEqual(0);

      await page.screenshot({ path: `e2e/.capturas/oscuro-${p.nombre}.png`, fullPage: true });
    });
  }

  test("el interruptor cambia el tema y la preferencia sobrevive al recargar", async ({
    page,
  }) => {
    // Esta prueba arranca en claro para poder encenderlo desde el botón. Sin
    // cookie el tema sigue al sistema, y este bloque simula un sistema oscuro:
    // acá el sistema está en claro.
    await page.emulateMedia({ colorScheme: "light" });
    await page.context().clearCookies({ name: "tema" });
    await page.context().clearCookies({ name: "tema-efectivo" });
    await page.goto("/plataforma");
    expect(await fondo(page)).toBe("rgb(245, 245, 245)");

    await page.getByRole("button", { name: /^Tema:/ }).click();
    await page.getByRole("menuitem", { name: "Oscuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await fondo(page)).toBe("rgb(23, 23, 23)");

    // Al recargar sigue oscuro, y sin pasar por claro: lo pone el guion del
    // <head>, antes de pintar.
    await page.reload();
    expect(await fondo(page)).toBe("rgb(23, 23, 23)");
    await expect(page.getByRole("button", { name: "Tema: oscuro" })).toBeVisible();

    // Y se puede volver.
    await page.getByRole("button", { name: /^Tema:/ }).click();
    await page.getByRole("menuitem", { name: "Claro" }).click();
    expect(await fondo(page)).toBe("rgb(245, 245, 245)");
  });

  test("el detalle de una cuenta y sus diálogos en oscuro", async ({ page, consola }) => {
    const { id } = await consola.crearCuenta(`e2e Oscuro ${Date.now()}`);
    await page.goto(`/plataforma/cuentas/${id}`);
    await expect(page.getByLabel("Estado: Activa")).toBeVisible();
    await page.screenshot({ path: "e2e/.capturas/oscuro-cuenta.png", fullPage: true });

    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: "e2e/.capturas/oscuro-dialogo.png" });
    expect(await anchoQueSeSale(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("Celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("el riel se vuelve menú y se puede navegar", async ({ page }) => {
    await page.goto("/plataforma");
    await expect(page.getByRole("heading", { name: "Inicio", level: 1 })).toBeVisible();

    // A 390 px el riel no ocupa la pantalla: queda detrás del botón de menú.
    await expect(page.getByRole("navigation", { name: /consola/i })).toBeHidden();
    await page.screenshot({ path: "e2e/.capturas/celular-inicio.png", fullPage: true });

    await page.getByRole("button", { name: "Abrir el menú" }).click();
    await expect(page.getByRole("link", { name: "Cuentas" })).toBeVisible();
    await page.screenshot({ path: "e2e/.capturas/celular-menu.png" });

    await page.getByRole("link", { name: "Cuentas" }).click();
    await expect(page.getByRole("heading", { name: "Cuentas", level: 1 })).toBeVisible();
    expect(await anchoQueSeSale(page)).toBeLessThanOrEqual(0);
    // En celular la tabla se vuelve tarjetas: cada cuenta es un enlace.
    await expect(page.getByRole("table")).toBeHidden();
    await page.screenshot({ path: "e2e/.capturas/celular-cuentas.png", fullPage: true });
  });

  for (const p of PANTALLAS) {
    test(`${p.titulo} cabe en la pantalla`, async ({ page }) => {
      await page.goto(p.ruta);
      await expect(page.getByRole("heading", { name: p.titulo, level: 1 })).toBeVisible();
      expect(await anchoQueSeSale(page)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `e2e/.capturas/celular-${p.nombre}.png`, fullPage: true });
    });
  }

  test("el detalle de una cuenta en celular", async ({ page, consola }) => {
    const { id } = await consola.crearCuenta(`e2e Celular ${Date.now()}`);
    await page.goto(`/plataforma/cuentas/${id}`);
    await expect(page.getByLabel("Estado: Activa")).toBeVisible();
    expect(await anchoQueSeSale(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: "e2e/.capturas/celular-cuenta.png", fullPage: true });

    await page.getByRole("tab", { name: /Suscripción/ }).click();
    // Algo propio de esa pestaña: «Próximo cobro» también sale en el Resumen.
    await expect(page.getByRole("heading", { name: "Cargos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar un pago" })).toBeVisible();
    expect(await anchoQueSeSale(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: "e2e/.capturas/celular-suscripcion.png", fullPage: true });
  });
});
