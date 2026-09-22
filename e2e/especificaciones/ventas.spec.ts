import { agregarProductos, prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto, existencia } from "../fixtures/producto";
import { esperarFreno, facturar } from "../fixtures/venta";
import { expect, test } from "../fixtures/consola";

/**
 * Vender: cotizar, convertir la cotización en factura y que el inventario y
 * la contabilidad queden como deben.
 *
 * La empresa la deja lista la preparación, por la API. El navegador se usa
 * para lo único que solo él puede probar: que el formulario mande lo que la
 * pantalla muestra y que el recorrido completo se pueda hacer.
 */
test.describe("Ventas", () => {
  // Sin la sesión del superadministrador: acá se entra como el cliente.
  test.use({ storageState: { cookies: [], origins: [] } });

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  test("cotizar, convertir en factura y ver el inventario bajar", async ({ page }) => {
    expect(await existencia(page, e)).toBe(10);

    await page.goto("/dashboard/ventas");
    await expect(page.getByRole("heading", { name: /Ventas/ })).toBeVisible();

    // ── La cotización: no asienta ni mueve inventario ──
    await page.getByRole("button", { name: "Nueva cotización" }).click();
    // El cliente y el producto se eligen abriendo su selector y buscando.
    await page.getByRole("button", { name: /Seleccione un cliente/ }).click();
    await page.getByLabel("Buscar cliente").fill("José");
    await page.getByRole("button", { name: /José Vargas/ }).first().click();

    await page.getByRole("button", { name: /Seleccione un producto/ }).click();
    await page.getByLabel("Buscar producto").fill(e.producto.codigo);
    await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
    await page.getByLabel("Cantidad de la línea 1").fill("2");

    await page.getByRole("button", { name: "Crear cotización" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Cotizar no toca el kardex: eso lo hace la factura.
    expect(await existencia(page, e)).toBe(10);

    // ── Convertirla en factura ──
    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await page.getByRole("menuitem", { name: "Convertir a factura" }).click();
    // Una factura no se emite sin decir cómo se paga.
    await expect(page.getByRole("button", { name: "Emitir factura" })).toBeDisabled();
    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Emitir factura" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // La factura sí mueve el kardex: dos unidades menos.
    expect(await existencia(page, e)).toBe(8);

    // Y quedó numerada contra la resolución de la DIAN.
    await page.getByRole("button", { name: "Facturas" }).click();
    await expect(page.getByText(/FEs*1|FE-1/).first()).toBeVisible();
  });

  test("vender más de lo que hay avisa antes, y se puede cancelar", async ({ page }) => {
    await page.goto("/dashboard/ventas");
    await page.getByRole("button", { name: "Facturas", exact: true }).click();
    await page.getByRole("button", { name: "Nueva factura" }).click();

    await page.getByRole("button", { name: /Seleccione un cliente/ }).click();
    await page.getByLabel("Buscar cliente").fill("José");
    await page.getByRole("button", { name: /José Vargas/ }).first().click();

    await page.getByRole("button", { name: /Seleccione un producto/ }).click();
    await page.getByLabel("Buscar producto").fill(e.producto.codigo);
    await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
    // Hay 10.
    await page.getByLabel("Cantidad de la línea 1").fill("99");
    await page.getByRole("radio", { name: "Crédito" }).click();
    await page.getByRole("button", { name: "Emitir factura" }).click();

    // No lo prohíbe: avisa y deja decidir, porque a veces se factura lo que
    // está por llegar. Lo que falte queda en la lista de compras pendientes.
    const aviso = page.locator(".swal2-popup");
    await expect(aviso).toContainText("Solo hay 10 en existencia; no se puede sacar 99.");
    await expect(aviso).toContainText(/queda en negativo/);

    await page.getByRole("button", { name: "Cancelar" }).click();
    // Al cancelar no se emitió nada: el kardex sigue igual.
    expect(await existencia(page, e)).toBe(10);
  });

  test("una nota crédito devuelve la venta", async ({ page }) => {
    await facturar(page, e, 2);
    expect(await existencia(page, e)).toBe(8);

    await page.getByRole("button", { name: "Notas crédito" }).click();
    await page.getByRole("button", { name: "Nueva nota crédito" }).click();

    await page.getByRole("button", { name: /Seleccione una factura/ }).click();
    await page.getByLabel("Buscar factura").fill("José");
    await page.getByRole("button", { name: /FE/ }).first().click();

    await page.getByLabel("Motivo *").fill("Devolución por producto defectuoso");
    // Sin marcar «Devolver solo una parte» se devuelve la factura entera.
    await page.getByRole("button", { name: "Emitir nota crédito" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // La nota crédito reversa el asiento de la venta. La mercancía **no**
    // vuelve sola a la bodega: si volvió físicamente, se registra aparte.
    expect(await existencia(page, e)).toBe(8);
  });

  test("no deja facturar en un período cerrado", async ({ page, request }) => {
    const cabeceras = { Authorization: `Bearer ${e.token}` };
    const api = process.env.E2E_API ?? "http://localhost:3001/api/v1";
    const actual = (await request
      .get(`${api}/periodos/actual`, { headers: cabeceras })
      .then((r) => r.json())) as { id: string };
    await request.post(`${api}/periodos/${actual.id}/cerrar`, { headers: cabeceras });

    await facturar(page, e, 1).catch(() => undefined);
    await esperarFreno(page, /período.*cerrado/i);
    expect(await existencia(page, e)).toBe(10);
  });

  test("el buscador de productos se despliega hacia abajo, no al lado", async ({
    page,
    request,
  }) => {
    // Con un solo producto cabría en cualquier parte: el problema aparece con
    // la lista larga, que es como está una ferretería de verdad.
    await agregarProductos(request, e, 25);
    await page.goto("/dashboard/ventas");
    await page.getByRole("button", { name: "Nueva cotización" }).click();

    const campo = page.getByRole("button", { name: /Seleccione un producto/ });
    const antes = await campo.boundingBox();
    await campo.click();

    const lista = page.getByLabel("Buscar producto");
    await expect(lista).toBeVisible();
    const menu = await lista.boundingBox();

    // Debajo del campo y alineado con él: un desplegable se despliega hacia
    // abajo. Cuando no cabía, el posicionador lo tiraba al costado.
    expect(menu!.y).toBeGreaterThan(antes!.y);
    expect(Math.abs(menu!.x - antes!.x)).toBeLessThan(20);

    // Y cabe en la pantalla: lo que sobra lo resuelve el alto, con su propio
    // desplazamiento, no saliéndose.
    const alto = page.viewportSize()!.height;
    const popup = await page.locator("[data-slot=popover-content]").boundingBox();
    expect(popup!.y + popup!.height).toBeLessThanOrEqual(alto + 1);

    await page.screenshot({ path: "e2e/.capturas/ventas-selector-producto.png" });
  });
});
