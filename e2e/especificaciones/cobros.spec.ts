import { expect, test } from "../fixtures/consola";

/** El día de hoy en Colombia, como lo espera el backend. */
const hoy = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/**
 * Lo que el cliente paga: el cargo del período, el pago que se registra a
 * mano y lo que queda debiendo. Es plata, así que lo que muestra la pantalla
 * tiene que ser exactamente lo que dice el backend.
 */
test.describe("Suscripción", () => {
  test("registrar un pago baja el saldo y queda en el historial", async ({ page, consola }) => {
    const { id } = await consola.crearCuenta(`e2e Transportes ${Date.now()}`);
    const antes = await consola.suscripcion(id);
    // Una cuenta nueva se cobra desde hoy: ya tiene su primer cargo.
    expect(antes.precio).not.toBeNull();
    expect(antes.estado.saldo).toBe(antes.precio);

    await page.goto(`/plataforma/cuentas/${id}?pestana=suscripcion`);
    await expect(page.getByText("Al día")).toBeVisible();

    await page.getByRole("button", { name: "Registrar un pago" }).click();
    // Propone lo que la cuenta debe.
    await expect(page.getByLabel("Monto")).toHaveValue(String(antes.precio));
    await page.getByLabel("Medio").selectOption("PSE");
    await page.getByLabel("Referencia").fill("e2e-123");
    await page.getByRole("button", { name: /Registrar \$/ }).click();

    await expect(page.getByRole("cell", { name: /PSE/ })).toBeVisible();
    // La tabla del escritorio: en celular la misma fila es una lista.
    await expect(page.getByRole("table").getByText("Pagado")).toBeVisible();

    const despues = await consola.suscripcion(id);
    expect(despues.estado.saldo).toBe(0);
  });

  test("un pago parcial deja el resto pendiente, y la pantalla lo dice", async ({
    page,
    consola,
  }) => {
    const { id } = await consola.crearCuenta(`e2e Droguería ${Date.now()}`);
    const { precio } = await consola.suscripcion(id);
    const mitad = Math.round((precio ?? 0) / 2);

    await consola.registrarPago(id, mitad, hoy());

    await page.goto(`/plataforma/cuentas/${id}?pestana=suscripcion`);
    await expect(page.getByRole("table").getByText("Parcial")).toBeVisible();

    const despues = await consola.suscripcion(id);
    expect(despues.estado.saldo).toBe((precio ?? 0) - mitad);
  });

  test("el precio pactado manda sobre el del plan", async ({ page, consola }) => {
    const { id } = await consola.crearCuenta(`e2e Clínica ${Date.now()}`);

    await page.goto(`/plataforma/cuentas/${id}?pestana=suscripcion`);
    await page.getByRole("button", { name: "Cambiar", exact: true }).click();
    await page.getByLabel("Precio pactado").fill("300000");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Precio pactado para esta cuenta.")).toBeVisible();
    await expect(page.getByText("$ 300.000")).toBeVisible();
    expect((await consola.suscripcion(id)).precio).toBe(300_000);
  });
});
