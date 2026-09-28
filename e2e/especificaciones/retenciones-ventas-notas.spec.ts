import { mirar } from "../fixtures/datos";
import { hoyCol, type EmpresaLista } from "../fixtures/empresa";
import {
  abrirAnulacionCompra,
  abrirAnulacionFactura,
  abrirAsiento,
  abrirConsola,
  abrirDetalleFactura,
  anularCompra,
  anularFactura,
  anularNotaCompra,
  anularNotaCreditoVenta,
  apiEmpresa,
  asegurarCuenta,
  autorretencionesDe,
  cerrarAutorretencionDePrueba,
  cerrarYAdjuntarVideo,
  cifras350,
  filaDeCuenta,
  grabarContexto,
  crearCliente,
  crearProducto,
  emitirFactura,
  entrarComoEmpresa,
  idCompra,
  idFactura,
  leer350,
  lineaDeCuenta,
  llenarYEmitirFactura,
  NORMA_PRUEBA_AUTO,
  notaCreditoCompra,
  notaCreditoVenta,
  pesos,
  prepararEmpresaMotor,
  registrarCompra,
  verReporte,
} from "../fixtures/motor-ventas";
import { expect, test } from "../fixtures/consola";

/**
 * Motor de retenciones en QA — ventas, notas, anulaciones y reportes
 * (guion `docs/planes/prueba-qa-motor-retenciones.md`, §6, §7 y §8).
 *
 * Cada prueba arma su propia empresa desechable «e2e …». La única tabla global
 * que se toca es la autorretención especial del CIIU de la empresa de prueba
 * (4530), que se carga por la consola con una norma marcada «PRUEBA e2e» y se
 * cierra al terminar (afterAll).
 */

const CIIU = "4530";
const TARIFA_AUTO = 0.8;

/** Deja lo observado en el informe y en la salida de la corrida. */
function anotar(a: { type: string; description: string }) {
  test.info().annotations.push(a);
  console.log(`[${a.type}] ${a.description}`);
}

test.describe("Motor de retenciones · ventas y notas", () => {
  // Recorridos largos contra QA: varias pantallas y reportes por prueba.
  test.describe.configure({ timeout: 300_000 });
  // Se entra como el cliente; la consola abre su propio contexto.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.afterAll(async ({ request }) => {
    // Obligatorio: la autorretención de prueba no queda abierta en QA.
    const r = await cerrarAutorretencionDePrueba(request, CIIU, TARIFA_AUTO);
    console.log(`[limpieza] autorretención CIIU ${CIIU}: ${r}`);
  });

  test("@paso9 §6 consola: se carga la tarifa de autorretención especial del CIIU", async ({ browser, request }) => {
    // Solo usa la consola: su video es el de la prueba («video», lo clasifica el reportero).
    const consola = await abrirConsola(browser, "video-consola");
    try {
      const hoy = hoyCol();
      const antes = await autorretencionesDe(request, CIIU);
      const cubreHoy = antes.find(
        (a) => a.vigenciaDesde <= hoy && (a.vigenciaHasta === null || a.vigenciaHasta >= hoy),
      );
      if (cubreHoy === undefined) {
        await consola.getByRole("button", { name: "Cargar una tarifa" }).click();
        const dialogo = consola.getByRole("dialog");
        await expect(dialogo.getByText("Cargar una tarifa de autorretención especial")).toBeVisible();
        await dialogo.getByLabel("CIIU").fill(CIIU);
        await dialogo.getByLabel("Tarifa (%)").fill("0,8");
        await expect(dialogo.getByLabel("Desde")).toHaveValue(hoy);
        await dialogo.getByLabel("Norma").fill(NORMA_PRUEBA_AUTO);
        await dialogo.getByLabel("Validó (contador)").fill("Prueba e2e");
        await expect(dialogo.getByLabel("Validó el")).toHaveValue(hoy);
        await mirar(consola, [dialogo.getByLabel("CIIU"), dialogo.getByLabel("Tarifa (%)"), dialogo.getByLabel("Norma")], 5);
        await dialogo.getByRole("button", { name: "Cargar", exact: true }).click();
        await expect(dialogo).toBeHidden();
      } else {
        anotar({
          type: "nota",
          description: `El CIIU ${CIIU} ya tenía tarifa para hoy (${cubreHoy.vigenciaDesde}→${cubreHoy.vigenciaHasta ?? "abierta"}, ${cubreHoy.norma}); una vigencia no se reescribe, así que no se volvió a cargar.`,
        });
      }

      // Queda en la tabla de la consola, con su norma.
      const fila = consola.getByRole("row").filter({ hasText: CIIU }).filter({ hasText: `${hoy} →` }).first();
      await expect(fila).toContainText("0,8");
      await expect(fila).toContainText(hoy);
      await expect(fila).toContainText("PRUEBA e2e");
      await mirar(consola, fila, 5);
    } finally {
      // Aunque falle: el video de la consola queda adjunto.
      await cerrarYAdjuntarVideo(consola, "video");
    }
  });

  test("@paso9 §6 autorretenedora especial: sin la 236575 frena; con ella retiene $8.000 (135515 / 236575)", async ({
    page,
    request,
  }) => {
    const e = await prepararEmpresaMotor(request, "Autorretenedora", { autorretenedorEspecial: true });
    const producto = await crearProducto(request, e, "Kit de frenos", 250_000);
    await entrarComoEmpresa(page, e);

    // 1. Sin la 236575: no deja guardar y dice qué cuenta falta.
    await llenarYEmitirFactura(page, "José Vargas", producto, 4);
    const freno = page.locator(".swal2-popup");
    await expect(freno).toBeVisible({ timeout: 20_000 });
    await expect(freno).toContainText("236575");
    const mensaje = (await freno.innerText()).replace(/\s+/g, " ");
    anotar({ type: "mensaje sin 236575", description: mensaje });
    // El guion pide que diga cuál falta. La empresa ya tiene la 135515: si el
    // mensaje nombra las dos con «o», no dice cuál.
    expect(mensaje, "el freno tiene que decir cuál cuenta falta (solo falta la 236575; la 135515 existe)").not.toMatch(
      /236575[^.]*\bo la 135515/,
    );
    await mirar(page, freno, 5);
    await page.getByRole("button", { name: "Entendido" }).click();

    // 2. El contador crea la 236575 y se enlaza sola: ahora sí.
    await asegurarCuenta(request, e, "236575", "Autorretenciones");
    await emitirFactura(page, "José Vargas", producto, 4);

    const detalle = await abrirDetalleFactura(page, "José Vargas");
    await expect(detalle).toContainText("1.000.000");
    await expect(detalle.locator("p").filter({ hasText: /^Retenciones ·/ })).toContainText(/Autorretención especial.*0,8 %.*\$8\.000/);
    await mirar(page, detalle.locator("p").filter({ hasText: /^Retenciones ·/ }), 4);
    await page.keyboard.press("Escape");

    // 3. El asiento: débito 135515 y crédito 236575 por $8.000.
    const asiento = await abrirAsiento(page, "Factura de venta");
    expect(await lineaDeCuenta(asiento, "135515")).toEqual({ debito: "$ 8.000", credito: "" });
    expect(await lineaDeCuenta(asiento, "236575")).toEqual({ debito: "", credito: "$ 8.000" });
    await mirar(page, [filaDeCuenta(asiento, "135515"), filaDeCuenta(asiento, "236575")], 5);
    await page.keyboard.press("Escape");

    // 4. El 350 del mes la lleva y cuadra con el libro.
    const f350 = await leer350(page);
    expect(pesos(f350.renta)).toBe(8_000);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    await mirar(page, cifras350(page), 5);
  });

  test("@paso9 §6 agente que le vende a un cliente del SIMPLE se autorretiene 2,5 % = $25.000; cliente agente sin retención registrada → aviso $25.000 y $28.500", async ({
    page,
    request,
  }) => {
    const e = await prepararEmpresaMotor(request, "Agente ventas", { agenteRenta: true, con236575: true });
    const producto = await crearProducto(request, e, "Kit de frenos", 250_000);
    const simple = await crearCliente(request, e, "Tienda Simple SAS", { regimenSimple: true });
    const agente = await crearCliente(request, e, "Gran Cliente Agente SA", {
      esGranContribuyente: true,
      esAgenteRetenedor: true,
    });
    await entrarComoEmpresa(page, e);

    // Cliente del SIMPLE: la empresa se autorretiene lo que él no retiene.
    await emitirFactura(page, simple.nombre, producto, 4);
    let detalle = await abrirDetalleFactura(page, simple.nombre);
    await expect(detalle.locator("p").filter({ hasText: /^Retenciones ·/ })).toContainText(/2,5 %.*\$25\.000/);
    await mirar(page, detalle.locator("p").filter({ hasText: /^Retenciones ·/ }), 4);
    await page.keyboard.press("Escape");
    const asiento = await abrirAsiento(page, "Factura de venta");
    expect(await lineaDeCuenta(asiento, "135515")).toEqual({ debito: "$ 25.000", credito: "" });
    expect(await lineaDeCuenta(asiento, "236575")).toEqual({ debito: "", credito: "$ 25.000" });
    await mirar(page, [filaDeCuenta(asiento, "135515"), filaDeCuenta(asiento, "236575")], 4);
    await page.keyboard.press("Escape");

    // Cliente agente (gran contribuyente) que no registró lo que retuvo.
    await emitirFactura(page, agente.nombre, producto, 4);
    detalle = await abrirDetalleFactura(page, agente.nombre);
    const avisoRet = detalle.locator("p").filter({ hasText: /^Retenciones ·/ });
    await expect(avisoRet).toContainText(/de renta registraste \$0 y por norma corresponden \$25\.000/);
    await expect(avisoRet).toContainText(/de IVA registraste \$0 y por norma corresponden \$28\.500/);
    await mirar(page, avisoRet, 6);
  });

  test("@paso10 §7 venta: nota crédito del 25 % reversa proporcional; otra del 100 % no pasa de lo que quedaba", async ({
    page,
    request,
  }) => {
    const e = await prepararEmpresaMotor(request, "Notas venta", { autorretenedorEspecial: true, con236575: true });
    const producto = await crearProducto(request, e, "Kit de frenos", 250_000);
    await entrarComoEmpresa(page, e);
    await emitirFactura(page, "José Vargas", producto, 4);
    expect(pesos((await leer350(page)).renta)).toBe(8_000);
    await mirar(page, cifras350(page), 3);

    // 25 %: vuelve 1 de 4 → reversa $2.000 (236575 débito, 135515 crédito).
    await notaCreditoVenta(page, "José Vargas", "Devolución de una unidad (prueba e2e)", {
      producto: producto.nombre,
      cantidad: 1,
    });
    let asiento = await abrirAsiento(page, "Devolución de una unidad");
    expect(await lineaDeCuenta(asiento, "236575")).toEqual({ debito: "$ 2.000", credito: "" });
    expect(await lineaDeCuenta(asiento, "135515")).toEqual({ debito: "", credito: "$ 2.000" });
    await mirar(page, [filaDeCuenta(asiento, "236575"), filaDeCuenta(asiento, "135515")], 5);
    await page.keyboard.press("Escape");
    let f350 = await leer350(page);
    expect(pesos(f350.renta)).toBe(6_000);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    await mirar(page, cifras350(page), 3);

    // Otra nota por la factura completa: solo reversa los $6.000 que quedaban.
    await notaCreditoVenta(page, "José Vargas", "Devolución del resto (prueba e2e)");
    asiento = await abrirAsiento(page, "Devolución del resto");
    expect(await lineaDeCuenta(asiento, "236575")).toEqual({ debito: "$ 6.000", credito: "" });
    expect(await lineaDeCuenta(asiento, "135515")).toEqual({ debito: "", credito: "$ 6.000" });
    await mirar(page, [filaDeCuenta(asiento, "236575"), filaDeCuenta(asiento, "135515")], 5);
    await page.keyboard.press("Escape");
    f350 = await leer350(page);
    expect(pesos(f350.renta)).toBe(0);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    await mirar(page, cifras350(page), 4);
  });

  test("@paso10 §7 compra: $25.000 → NC 40 % $15.000 → anular NC $25.000 → anular compra $0 → anular otra vez no mueve nada", async ({
    page,
    request,
  }) => {
    const e = await prepararEmpresaMotor(request, "Notas compra", { agenteRenta: true });
    await entrarComoEmpresa(page, e);
    const compra = `FP-${Date.now().toString().slice(-6)}`;
    const nota = `NC-${Date.now().toString().slice(-5)}`;

    await registrarCompra(page, e, { numero: compra, cantidad: 10, costo: 100_000, retenido: 25_000 });
    expect(pesos((await leer350(page)).renta)).toBe(25_000);
    await mirar(page, cifras350(page), 3);

    await notaCreditoCompra(page, e, compra, { numero: nota, cantidad: 4 });
    let f350 = await leer350(page);
    expect(pesos(f350.renta), "tras la nota del 40 %").toBe(15_000);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    await mirar(page, cifras350(page), 4);

    await anularNotaCompra(page, "Notas crédito", nota);
    f350 = await leer350(page);
    expect(pesos(f350.renta), "tras anular la nota").toBe(25_000);
    await mirar(page, cifras350(page), 4);

    await anularCompra(page, compra);
    f350 = await leer350(page);
    expect(pesos(f350.renta), "tras anular la compra").toBe(0);
    await mirar(page, cifras350(page), 4);

    // La pantalla ya no ofrece «Anular» sobre una compra anulada; se intenta
    // por la API, que es lo único que queda, y no debe mover nada.
    const fila = page.getByRole("row").filter({ hasText: compra }).first();
    await page.goto("/dashboard/compras");
    await expect(fila).toContainText(/Anulada/i);
    await mirar(page, fila, 4);
    await expect(fila.getByRole("button", { name: "Más acciones" })).toHaveCount(0);
    const id = await idCompra(request, e, compra);
    const otra = await apiEmpresa(request, e)("post", `/compras/${id}/anular`, { motivo: "Otra vez (prueba e2e)" }, { permitirError: true });
    anotar({ type: "anular otra vez", description: `${otra.status} ${otra.texto.slice(0, 200)}` });
    f350 = await leer350(page);
    expect(pesos(f350.renta), "anular otra vez no mueve nada").toBe(0);
    await mirar(page, cifras350(page), 4);
  });

  test("@paso10 §7 nota débito de compra: $1.000.000 de servicios retiene 4 % = $40.000; anularla → cero", async ({
    page,
    request,
  }) => {
    const e = await prepararEmpresaMotor(request, "Nota debito", { agenteRenta: true });
    await asegurarCuenta(request, e, "236525", "Servicios");
    await asegurarCuenta(request, e, "514510", "Construcciones y edificaciones");
    await entrarComoEmpresa(page, e);
    const compra = `FP-${Date.now().toString().slice(-6)}`;
    const nd = `ND-${Date.now().toString().slice(-5)}`;

    // Una compra chica, por debajo de la base: no retiene nada.
    await registrarCompra(page, e, { numero: compra, cantidad: 1, costo: 100_000 });
    expect(pesos((await leer350(page)).renta)).toBe(0);
    await mirar(page, cifras350(page), 3);

    await page.goto("/dashboard/compras");
    const fila = page.getByRole("row").filter({ hasText: compra }).first();
    await fila.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Nota débito" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("N.° nota del proveedor").fill(nd);
    await dialogo.getByLabel("Motivo *").fill("Mantenimiento no incluido en la factura (prueba e2e)");
    await dialogo.getByRole("button", { name: "Gasto", exact: true }).click();
    await dialogo.getByRole("button", { name: /Seleccione una cuenta auxiliar/ }).click();
    await page.getByLabel("Buscar cuenta").fill("514510");
    await page.getByRole("button", { name: /514510/ }).first().click();
    await dialogo.getByLabel("Detalle de la línea 1").fill("Mantenimiento de la bodega");
    await dialogo.getByLabel("Cantidad de la línea 1").fill("1");
    await dialogo.getByLabel("Costo unitario de la línea 1").fill("1000000");

    // El mismo bloque de retención que la compra: servicios generales, 4 %.
    // Lo dedujo por las palabras del renglón («La deduje»): una persona lo
    // confirma antes de registrar. No es IA.
    const si = dialogo.getByRole("button", { name: /Sí, es servicios generales/i });
    await expect(si).toBeVisible({ timeout: 20_000 });
    await si.click();
    await expect(dialogo.getByText(/Se retiene/)).toContainText("40.000");
    await mirar(page, dialogo.getByText(/Se retiene/), 4);
    await dialogo.getByRole("button", { name: "Registrar nota débito" }).click();
    await expect(dialogo).toBeHidden({ timeout: 20_000 });

    let f350 = await leer350(page);
    expect(pesos(f350.renta), "la nota débito retiene").toBe(40_000);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    await mirar(page, cifras350(page), 4);

    await anularNotaCompra(page, "Notas débito", nd);
    f350 = await leer350(page);
    expect(pesos(f350.renta), "anulada la nota débito").toBe(0);
    await mirar(page, cifras350(page), 4);
  });

  test("@paso10 No se anula una compra con su nota crédito viva: primero la nota, después la compra → $0 y cuadra", async ({
    page,
    request,
  }) => {
    const e = await prepararEmpresaMotor(request, "Anular compra con nota", { agenteRenta: true });
    await entrarComoEmpresa(page, e);
    const compra = `FP-${Date.now().toString().slice(-6)}`;
    const nota = `NC-${Date.now().toString().slice(-5)}`;
    await registrarCompra(page, e, { numero: compra, cantidad: 10, costo: 100_000, retenido: 25_000 });
    await notaCreditoCompra(page, e, compra, { numero: nota, cantidad: 4 });
    let f350 = await leer350(page);
    expect(pesos(f350.renta), "tras la nota del 40 %").toBe(15_000);
    await mirar(page, cifras350(page), 3);

    // 1. La pantalla no deja: en vez del motivo, dice qué nota anular primero.
    const mensaje = `Esta compra tiene la nota crédito ${nota} viva: anulala primero.`;
    const alerta = await abrirAnulacionCompra(page, compra);
    const aviso = alerta.getByRole("alert");
    await expect(aviso).toHaveText(mensaje);
    await expect(alerta.getByLabel("Motivo de la anulación")).toHaveCount(0);
    const boton = alerta.getByRole("button", { name: "Anular compra" });
    await expect(boton).toBeDisabled();
    await mirar(page, [aviso, boton], 6);
    await alerta.getByRole("button", { name: "Cancelar" }).click();
    await expect(alerta).toBeHidden();

    // 2. Por la API tampoco: 409 con el mismo porqué.
    const id = await idCompra(request, e, compra);
    const r = await apiEmpresa(request, e)(
      "post",
      `/compras/${id}/anular`,
      { motivo: "Saltándose la pantalla (prueba e2e)" },
      { permitirError: true },
    );
    expect(r.status, r.texto).toBe(409);
    expect(r.texto).toContain(mensaje);
    f350 = await leer350(page);
    expect(pesos(f350.renta), "el rechazo no movió nada").toBe(15_000);
    await mirar(page, cifras350(page), 3);

    // 3. El orden correcto: la nota, después la compra.
    await anularNotaCompra(page, "Notas crédito", nota);
    f350 = await leer350(page);
    expect(pesos(f350.renta), "tras anular la nota").toBe(25_000);
    await mirar(page, cifras350(page), 3);

    await anularCompra(page, compra);
    f350 = await leer350(page);
    expect(pesos(f350.renta), "compra y nota anuladas: no queda retención viva").toBe(0);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    await mirar(page, cifras350(page), 5);
  });

  test("@paso10 No se anula una factura con su nota crédito viva: primero la nota, después la factura → $0 y cuadra", async ({
    page,
    request,
  }) => {
    const e = await prepararEmpresaMotor(request, "Anular factura con nota", {
      autorretenedorEspecial: true,
      con236575: true,
    });
    const producto = await crearProducto(request, e, "Kit de frenos", 250_000);
    await entrarComoEmpresa(page, e);
    await emitirFactura(page, "José Vargas", producto, 4);
    await notaCreditoVenta(page, "José Vargas", "Devolución de una unidad (prueba e2e)", {
      producto: producto.nombre,
      cantidad: 1,
    });
    let f350 = await leer350(page);
    expect(pesos(f350.renta), "tras la nota del 25 %").toBe(6_000);
    await mirar(page, cifras350(page), 3);

    // 1. La pantalla no deja: en vez del motivo, dice qué nota anular primero.
    const mensaje = /^Esta factura tiene la nota crédito \S+ viva: anulala primero\.$/;
    const alerta = await abrirAnulacionFactura(page, "José Vargas");
    const aviso = alerta.getByRole("alert");
    await expect(aviso).toHaveText(mensaje);
    await expect(alerta.getByLabel("Motivo de la anulación")).toHaveCount(0);
    const boton = alerta.getByRole("button", { name: "Anular factura" });
    await expect(boton).toBeDisabled();
    const textoAviso = (await aviso.innerText()).trim();
    await mirar(page, [aviso, boton], 6);
    await alerta.getByRole("button", { name: "Cancelar" }).click();
    await expect(alerta).toBeHidden();

    // 2. Por la API tampoco: 409 con el mismo porqué que la pantalla.
    const id = await idFactura(request, e, "José Vargas");
    const r = await apiEmpresa(request, e)(
      "post",
      `/facturas/${id}/anular`,
      { motivo: "Saltándose la pantalla (prueba e2e)" },
      { permitirError: true },
    );
    expect(r.status, r.texto).toBe(409);
    expect(r.texto).toContain(textoAviso);
    f350 = await leer350(page);
    expect(pesos(f350.renta), "el rechazo no movió nada").toBe(6_000);
    await mirar(page, cifras350(page), 3);

    // 3. El orden correcto: la nota, después la factura.
    await anularNotaCreditoVenta(page, "NC", "Anulación de prueba e2e");
    f350 = await leer350(page);
    expect(pesos(f350.renta), "tras anular la nota").toBe(8_000);
    await mirar(page, cifras350(page), 3);

    await anularFactura(page, "José Vargas", "Anulación de prueba e2e");
    f350 = await leer350(page);
    expect(pesos(f350.renta), "factura y nota anuladas: no queda autorretención viva").toBe(0);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    await mirar(page, cifras350(page), 5);
  });

  test("@paso11 §8 reportes: 350 cuadra, ReteICA, certificados, Excel/PDF y certificado desde la ficha; sin rol no se ven", async ({
    page,
    request,
    browser,
  }) => {
    const e: EmpresaLista = await prepararEmpresaMotor(request, "Reportes", { agenteRenta: true });
    // Agente de ICA en Medellín (su sede), para que el reporte de ReteICA tenga
    // municipio y tercero. La ley de ICA de Medellín es la que ya está en QA.
    await apiEmpresa(request, e)("put", "/empresa-impuestos/ica/05001", {
      esAgenteRetenedor: true,
      esAutorretenedor: false,
      tarifaProvisionalPorMil: 4.14,
    });
    await asegurarCuenta(request, e, "236801", "Impuesto de industria y comercio retenido");
    await entrarComoEmpresa(page, e);
    const compra = `FP-${Date.now().toString().slice(-6)}`;
    await registrarCompra(page, e, { numero: compra, cantidad: 10, costo: 100_000 });

    // Formulario 350: la cifra, el cuadre en cero y las descargas.
    const f350 = await leer350(page);
    expect(pesos(f350.renta)).toBe(25_000);
    expect(f350.cuadra, `cuadre: ${f350.cuadreValor}`).toBe(true);
    expect(f350.texto).toContain("Cuadre con el libro");
    await mirar(page, cifras350(page), 4);
    for (const [boton, extension] of [
      ["Excel", /\.xlsx$/],
      ["Descargar PDF", /\.pdf$/],
    ] as const) {
      const descarga = page.waitForEvent("download", { timeout: 60_000 });
      await page.getByRole("button", { name: boton }).click();
      const d = await descarga;
      expect(d.suggestedFilename()).toMatch(extension);
      expect((await d.failure()) ?? null).toBeNull();
    }

    // ReteICA por municipio: por municipio y por tercero.
    await verReporte(page, /ReteICA por municipio/);
    const ica = page.frameLocator("iframe").first();
    await expect(ica.getByText(/Medell[ií]n/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(ica.getByText(/Distribuidora del Valle/).first()).toBeVisible();
    await mirar(page, [ica.getByText(/Medell[ií]n/i).first(), ica.getByText(/Distribuidora del Valle/).first()], 5);

    // Certificados: un certificado por tercero, con lo retenido al proveedor.
    await verReporte(page, /Certificados de retención/);
    const cert = page.frameLocator("iframe").first();
    await expect(cert.getByText(/Distribuidora del Valle/).first()).toBeVisible({ timeout: 30_000 });
    await expect(cert.locator("body")).toContainText("25.000");
    const descarga = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: "Descargar PDF" }).click();
    expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);
    await mirar(page, cert.getByText(/25.000/).first(), 5);

    // Desde la ficha del proveedor: su certificado en PDF.
    await page.goto("/dashboard/terceros");
    await page.getByLabel("Buscar tercero").fill("Distribuidora");
    await page.getByRole("button", { name: "Editar" }).first().click();
    const ficha = page.getByRole("dialog");
    await expect(ficha.getByText("Datos tributarios")).toBeVisible();
    await ficha.getByLabel("Período del certificado").selectOption({ label: `Año ${hoyCol().slice(0, 4)}, hasta hoy` });
    const pdf = page.waitForEvent("download", { timeout: 60_000 });
    await ficha.getByRole("button", { name: "PDF", exact: true }).click();
    expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
    await mirar(page, ficha.getByLabel("Período del certificado"), 3);

    // Un usuario con rol VENTAS no ve los reportes de retención.
    const clave = `Clave-e2e-${Date.now()}`;
    const correo = `e2e-ventas-${Date.now()}@prueba.co`;
    await apiEmpresa(request, e)("post", "/usuarios", {
      email: correo,
      nombreCompleto: "Vendedor de prueba",
      password: clave,
      accesos: [{ empresaId: e.empresaId, rol: "VENTAS" }],
    });
    const otro = await browser.newContext({
      locale: "es-CO",
      timezoneId: "America/Bogota",
      ...grabarContexto("video-vendedor"),
    });
    const vendedor = await otro.newPage();
    try {
      await entrarComoEmpresa(vendedor, { ...e, acceso: { email: correo, password: clave } });
      await vendedor.goto("/dashboard/reportes");
      await expect(vendedor.getByRole("heading", { name: "Reportes" })).toBeVisible();
      await expect(vendedor.getByRole("button", { name: /Ventas del mes por cliente/ })).toBeVisible();
      for (const nombre of [/Formulario 350/, /ReteICA por municipio/, /Certificados de retención/]) {
        await expect(vendedor.getByRole("button", { name: nombre })).toHaveCount(0);
      }
      await mirar(vendedor, vendedor.getByRole("button", { name: /Ventas del mes por cliente/ }), 5);
    } finally {
      // El video del vendedor va con otro nombre: el reportero ya clasifica el de `page`.
      await cerrarYAdjuntarVideo(vendedor, "video-vendedor");
    }
  });
});
