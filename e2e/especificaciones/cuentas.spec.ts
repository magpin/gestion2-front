import { expect, test } from "../fixtures/consola";
import { correoDePrueba, nitDePrueba } from "../fixtures/datos";

/**
 * El alta de un cliente y lo que se le hace después: empresas, usuarios,
 * plan, cupos y estado. Es el camino por el que pasa cada cliente nuevo.
 */
test.describe("Cuentas", () => {
  test("dar de alta un cliente deja la contraseña a la vista una sola vez", async ({ page }) => {
    const email = correoDePrueba("alta");
    const nombre = `e2e Ferretería ${Date.now()}`;

    await page.goto("/plataforma/cuentas/nueva");

    await page.getByLabel("Nombre del cliente").fill(nombre);
    await page.getByRole("button", { name: "Siguiente" }).click();

    await page.getByLabel("Nombre completo").fill("Laura Gómez");
    await page.getByLabel("Correo").fill(email);
    await page.getByRole("button", { name: "Siguiente" }).click();

    await page.getByRole("radio", { name: /Profesional/ }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();

    // El último paso muestra lo que se va a crear antes de crearlo.
    await expect(page.getByText(nombre)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "Crear la cuenta" }).click();

    await expect(page.getByRole("heading", { name: "Cuenta creada" })).toBeVisible();
    // Tres grupos de cuatro, para dictarla por teléfono.
    await expect(page.getByText(/^[^\W_]{4}-[^\W_]{4}-[^\W_]{4}$/)).toBeVisible();
    await expect(page.getByText(/no se vuelve a mostrar/i)).toBeVisible();

    await page.getByRole("link", { name: "Ir a la cuenta" }).click();
    await expect(page.getByRole("heading", { name: nombre, level: 1 })).toBeVisible();
    await expect(page.getByLabel("Estado: Activa")).toBeVisible();
  });

  test("la cuenta nueva aparece en el listado y en la búsqueda global", async ({ page, consola }) => {
    const nombre = `e2e Distribuidora ${Date.now()}`;
    await consola.crearCuenta(nombre);

    await page.goto("/plataforma/cuentas");
    await page.getByLabel("Buscar cuenta por nombre").fill(nombre);
    await expect(page.getByRole("link", { name: nombre })).toBeVisible();

    // Ctrl K encuentra lo mismo desde cualquier pantalla.
    await page.goto("/plataforma/planes");
    await page.keyboard.press("Control+k");
    await page.getByRole("textbox", { name: "Buscar" }).fill(nombre);
    await page.getByRole("option", { name: new RegExp(nombre) }).click();
    await expect(page.getByRole("heading", { name: nombre, level: 1 })).toBeVisible();
  });

  test("agregar una empresa y un usuario, y restablecerle la contraseña", async ({
    page,
    consola,
  }) => {
    const { id, nombre } = await consola.crearCuenta(`e2e Panadería ${Date.now()}`);
    const { nit } = nitDePrueba();
    const correo = correoDePrueba("usuario");

    await page.goto(`/plataforma/cuentas/${id}?pestana=empresas`);
    await page.getByRole("button", { name: "Agregar empresa" }).click();
    await page.getByLabel("Razón social").fill("e2e Panadería La Espiga S.A.S.");
    await page.getByLabel("NIT").fill(nit);
    // El dígito de verificación no se pregunta: sale del NIT.
    await expect(page.getByText(/Dígito de verificación: \d/)).toBeVisible();
    await page.getByRole("button", { name: "Crear la empresa" }).click();
    await expect(page.getByText("e2e Panadería La Espiga S.A.S.")).toBeVisible();
    // Nace sin configurar: es el estado en el que la recibe su director.
    await expect(page.getByText("A medias")).toBeVisible();

    await page.getByRole("tab", { name: /Usuarios/ }).click();
    await page.getByRole("button", { name: "Agregar usuario" }).click();
    await page.getByLabel("Nombre completo").fill("Pedro Ruiz");
    await page.getByLabel("Correo").fill(correo);
    await page.getByRole("button", { name: "Crear el usuario" }).click();

    await expect(page.getByRole("heading", { name: "Contraseña nueva" })).toBeVisible();
    await page.getByRole("button", { name: "Listo" }).click();
    await expect(page.getByText(correo)).toBeVisible();

    await page
      .getByRole("row", { name: new RegExp(correo) })
      .getByRole("button", { name: "Restablecer contraseña" })
      .click();
    await expect(page.getByRole("heading", { name: "Contraseña nueva" })).toBeVisible();
    await expect(page.getByText(/^[^\W_]{4}-[^\W_]{4}-[^\W_]{4}$/)).toBeVisible();
    await page.getByRole("button", { name: "Listo" }).click();

    // Todo lo que se hizo quedó anotado.
    const d = await consola.cuenta(id);
    expect(d.bitacora.map((b) => b.accion)).toEqual(
      expect.arrayContaining(["CREAR_EMPRESA", "CREAR_USUARIO", "RESTABLECER_PASSWORD"]),
    );
    expect(nombre).toBe(d.cuenta.nombre);
  });

  test("bajar de plan avisa cuando la cuenta ya usa más de lo que el plan permite", async ({
    page,
    consola,
  }) => {
    const { id } = await consola.crearCuenta(`e2e Contadores ${Date.now()}`, "EMPRESARIAL");
    await consola.crearEmpresa(id, "e2e Contadores Uno S.A.S.");
    await consola.crearEmpresa(id, "e2e Contadores Dos S.A.S.");

    await page.goto(`/plataforma/cuentas/${id}`);
    await page.getByRole("button", { name: "Cambiar plan" }).click();
    await page.getByLabel("Plan nuevo").selectOption("BASICO");

    // La comparación dice qué cambia, y el aviso qué no cabe.
    await expect(page.getByText(/La cuenta usa más de lo que permite Básico/)).toBeVisible();
    await page.getByRole("button", { name: "Cambiar a Básico" }).click();

    await expect(page.getByLabel("Plan: Básico")).toBeVisible();
    expect((await consola.cuenta(id)).cuenta.plan).toBe("BASICO");
  });

  test("suspender pide el nombre escrito, y reactivar devuelve la cuenta", async ({
    page,
    consola,
  }) => {
    const { id, nombre } = await consola.crearCuenta(`e2e Textiles ${Date.now()}`);

    await page.goto(`/plataforma/cuentas/${id}`);
    await page.getByRole("button", { name: "Cambiar estado" }).click();

    const suspender = page.getByRole("button", { name: "Suspender la cuenta" });
    await expect(suspender).toBeDisabled();
    await expect(page.getByText(/pero no emitir documentos/)).toBeVisible();

    await page.getByLabel(/escriba el nombre de la cuenta/i).fill("otra cosa");
    await expect(suspender).toBeDisabled();
    await page.getByLabel(/escriba el nombre de la cuenta/i).fill(nombre);
    await expect(page.getByText("Coincide con el nombre de la cuenta.")).toBeVisible();
    await suspender.click();

    await expect(page.getByLabel("Estado: Suspendida")).toBeVisible();
    expect((await consola.cuenta(id)).cuenta.estado).toBe("SUSPENDIDO");

    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await page.getByLabel("Estado nuevo").selectOption("ACTIVO");
    await page.getByRole("button", { name: /Pasar a activa/i }).click();
    await expect(page.getByLabel("Estado: Activa")).toBeVisible();
  });
});
