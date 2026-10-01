import { Consola } from "../fixtures/consola";
import { nitDePrueba } from "../fixtures/datos";
import { expect, test } from "../fixtures/consola";

/**
 * Lo primero que ve un cliente nuevo.
 *
 * Una cuenta recién vendida no tiene empresa, y sin empresa no hay nada que
 * hacer: el sistema la lleva a crearla y de ahí a configurarla. Es el único
 * recorrido que todos los clientes hacen, y hasta ahora solo se ejercitaba
 * por la API.
 *
 * El camino con IA no se prueba acá, por decisión del dueño: se prueba el de
 * a mano, que es el que tiene que funcionar aunque la IA no esté.
 */
test.describe("Asistente de configuración", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("una cuenta nueva crea su empresa y la configura paso a paso", async ({
    page,
    request,
  }) => {
    // Una cuenta sin empresa: es como queda una recién vendida.
    const consola = await Consola.entrar(request);
    const cuenta = await consola.crearCuenta(`e2e Panadería ${Date.now()}`, "EMPRESARIAL");

    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(cuenta.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(cuenta.password);
    await page.getByRole("button", { name: "Ingresar" }).click();

    // Sin empresa no hay a dónde entrar: el sistema lleva a crearla.
    await expect(page).toHaveURL(/\/(empresa|configuracion)/);
    if (!page.url().includes("/configuracion")) {
      await page.getByRole("link", { name: /Nueva empresa|Crear empresa/ }).click();
    }
    await expect(page).toHaveURL(/\/configuracion\/empresa-nueva/);
    // Primero se elige cómo: con IA o a mano. La prueba va a mano.
    await page.getByRole("button", { name: /Configurar a mano/ }).click();

    // ── La empresa ──
    const { nit, dv } = nitDePrueba();
    const razonSocial = `e2e Panadería ${Date.now()} S.A.S.`;
    await page.getByLabel("Razón social").fill(razonSocial);
    await page.getByLabel("NIT", { exact: true }).fill(nit);
    // El DV no se teclea: es una función del NIT, y la base lo recalcula.
    await expect(page.getByLabel("DV")).toHaveValue(dv);

    await page.getByRole("button", { name: "Crear y seguir" }).click();

    // Crear la empresa deja listo el paso 1 y sigue con el 2, sin pasar por
    // el tablero: faltan cinco pasos y el asistente los lleva en orden.
    await expect(page).toHaveURL(/\/configuracion\/(?!empresa-nueva)/);
    await expect(page.getByText("1 de 6 listos")).toBeVisible();

    // Lo ya creado se puede revisar, pero el NIT y el tipo de persona no son
    // campos: se muestran con un candado, porque otro NIT es otra empresa.
    await page.goto("/configuracion/empresa");
    await expect(page.getByLabel("Razón social")).toHaveValue(razonSocial);
    await expect(page.getByText(/El NIT y el tipo de persona no cambian/)).toBeVisible();

    // ── El paso que falta primero: la sede ──
    await page.goto("/configuracion/sedes");
    await page.getByLabel("Código").fill("001");
    await page.getByLabel("Nombre").fill("Principal");
    await page.getByLabel("Dirección").fill("Cra. 43A #18-95");

    // El municipio no se teclea libre: define la tarifa de ICA y viaja en la
    // factura, así que sale del catálogo.
    await page.getByLabel("Municipio", { exact: true }).click();
    await page.getByLabel("Buscar municipio").fill("Medellín");
    const municipio = page.getByRole("dialog").getByRole("button", { name: /Medellín/ });
    await expect(municipio.first()).toBeVisible();
    await municipio.first().click();

    // La primera sede es la principal sin que nadie lo decida.
    const principal = page.getByRole("checkbox", { name: "Es la sede principal" });
    await expect(principal).toBeChecked();
    await expect(principal).toBeDisabled();

    await page.getByRole("button", { name: "Agregar sede" }).click();
    await expect(page.getByText("Sede registrada").first()).toBeVisible();

    // Con la sede hecha, el asistente va por dos de seis.
    await expect(page.getByText("2 de 6 listos")).toBeVisible();
  });
});
