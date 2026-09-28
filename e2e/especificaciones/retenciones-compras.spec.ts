import { mirar } from "../fixtures/datos";
import { hoyCol } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { expect, esperarAviso, test } from "../fixtures/consola";
import {
  APARTADO,
  BOGOTA,
  MEDELLIN,
  abrirAsiento,
  aceptarDeducida,
  crearProveedor,
  editarTercero,
  elegirConcepto,
  empresaMotor,
  filaRetencion,
  irARetenciones,
  lineaAsiento,
  lineaGasto,
  lineaProducto,
  nuevaCompra,
  pesos,
  registrar,
  sumas,
} from "../fixtures/motor-compras";

/**
 * El motor de retenciones en las compras, contra QA (guion
 * `docs/planes/prueba-qa-motor-retenciones.md`, §1, §2, §4, §5 y §10).
 *
 * La empresa y los proveedores se arman por la API; lo que se mira —la
 * retención que propone la pantalla, registrar, el asiento, la explicación—
 * va por la pantalla, como lo haría el director de la empresa.
 *
 * Las cifras suponen proveedor declarante y la ley vigente a la fecha de la
 * compra (hoy). Si la app calcula otra cosa, la prueba falla diciendo qué vio.
 */
test.describe("Motor de retenciones en compras", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(90_000);

  // -------------------------------------------------------------------------
  // §1 — La ley, para consultar
  // -------------------------------------------------------------------------

  test("@paso4 1. Tarifas de la ley con historia, y tus cuentas", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    await entrarAlProducto(page, e);
    await irARetenciones(page);

    const compras = page.getByRole("row").filter({ hasText: /Compras generales/ }).first();
    const fecha = page.getByLabel("Ver lo que regía el");

    await fecha.fill("2026-06-15");
    await expect(compras, "al 15/06/2026 compras generales es 2,5 % desde 27 UVT").toContainText("2,5 %");
    await expect(compras).toContainText("desde 27 UVT");
    await mirar(page, compras, 3);

    await fecha.fill("2026-09-25");
    await expect(compras, "al 25/09/2026 compras generales es 2,5 % desde 10 UVT").toContainText("2,5 %");
    await expect(compras).toContainText("desde 10 UVT");
    await expect(compras).not.toContainText("desde 27 UVT");
    await mirar(page, compras, 3);

    // Solo de consulta: no hay dónde escribir una tarifa.
    await expect(page.getByRole("button", { name: /Nuevo concepto|Nueva tarifa/ })).toHaveCount(0);

    // Tus cuentas: cada concepto con su cuenta.
    await expect(page.getByRole("heading", { name: "Tus cuentas" })).toBeVisible();
    const cuentas = page.locator("section").filter({ has: page.getByRole("heading", { name: "Tus cuentas" }) });
    await expect(cuentas.getByRole("row").filter({ hasText: "Compras generales" })).toContainText("236540");
    await expect(cuentas.getByRole("row").filter({ hasText: "Retención de IVA en compras" })).toContainText(/2367\d*/);
    await mirar(
      page,
      [
        page.getByRole("heading", { name: "Tus cuentas" }),
        cuentas.getByRole("row").filter({ hasText: "Compras generales" }),
        cuentas.getByRole("row").filter({ hasText: "Retención de IVA en compras" }),
      ],
      6,
    );
  });

  // -------------------------------------------------------------------------
  // §2 y §4 — Renta y ReteIVA
  // -------------------------------------------------------------------------

  test("@paso6 2. Proveedor declarante responsable de IVA: renta $50.000 + ReteIVA $57.000, asiento y porqué", async ({
    page,
    request,
  }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const a = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Software Andino S.A.S.",
      municipio: BOGOTA,
      responsableIva: true,
      ciiu: "6201",
    });
    await entrarAlProducto(page, e);

    const { dialogo, numero } = await nuevaCompra(page, a);
    await lineaProducto(page, dialogo, e, 2_000_000);

    const renta = filaRetencion(dialogo, "Compras generales");
    const iva = filaRetencion(dialogo, "Retención de IVA en compras");
    await expect(dialogo.getByText("La vi clara")).toBeVisible();
    await expect(renta, "renta: 2,5 % sobre $2.000.000").toContainText("2,5 %");
    await expect(renta).toContainText(pesos(2_000_000));
    await expect(renta).toContainText(pesos(50_000));
    await expect(iva, "ReteIVA: 15 % del IVA de $380.000").toContainText("15 %");
    await expect(iva).toContainText(pesos(380_000));
    await expect(iva).toContainText(pesos(57_000));
    await expect(dialogo.getByText(/Se retiene/)).toContainText(pesos(107_000));

    // ¿Por qué? — norma, base y tarifa. Y ningún campo para escribir la tarifa.
    await renta.getByRole("button", { name: "¿Por qué?" }).click();
    await expect(renta.getByText(/Tarifa: 2,5 % — /)).toBeVisible();
    await expect(renta.getByText(/Base: \$\s*2\.000\.000/)).toBeVisible();
    await expect(renta.getByText(/Tu empresa es agente de retención: sí/)).toBeVisible();
    await expect(dialogo.getByRole("textbox", { name: /tarifa/i })).toHaveCount(0);
    await expect(dialogo.getByRole("spinbutton", { name: /tarifa/i })).toHaveCount(0);
    await mirar(page, [renta, iva, dialogo.getByText(/Se retiene/)], 7);

    await registrar(page, dialogo);

    // Neto a pagar: 2.380.000 − 50.000 − 57.000.
    const neto = 2_380_000 - 107_000;
    const fila = page.getByRole("row").filter({ hasText: numero });
    await expect(fila).toContainText(pesos(neto));
    await mirar(page, fila, 2);

    // Detalle de la compra → «¿Por qué esta retención?».
    await fila.getByRole("button", { name: "Ver" }).click();
    const detalle = page.getByRole("dialog");
    await detalle.getByRole("button", { name: "¿Por qué esta retención?" }).click();
    await expect(detalle.getByText("Compras generales").first()).toBeVisible();
    await expect(detalle.getByText(/Tarifa: 2,5 %/).first()).toBeVisible();
    await mirar(page, detalle.getByText(/Tarifa: 2,5 %/).first());

    // El asiento: 2205 por el neto, 2365 y 2367; cuadra; trazabilidad.
    const asiento = await abrirAsiento(page, numero);
    await expect(lineaAsiento(asiento, "2205"), "2205 por el neto").toContainText(pesos(neto));
    await expect(lineaAsiento(asiento, "2365"), "2365 por la renta").toContainText(pesos(50_000));
    await expect(lineaAsiento(asiento, "2367"), "2367 por el ReteIVA").toContainText(pesos(57_000));
    const s = await sumas(asiento);
    expect(s.debito, "el asiento cuadra").toBe(s.credito);
    await expect(asiento.getByText("Retención calculada")).toBeVisible();
    await mirar(
      page,
      [
        lineaAsiento(asiento, "2205"),
        lineaAsiento(asiento, "2365"),
        lineaAsiento(asiento, "2367"),
        asiento.getByRole("row").filter({ hasText: "Sumas iguales" }),
        asiento.getByText("Retención calculada").first(),
      ],
      10,
    );
  });

  test("@paso7 3. Proveedor del régimen simple: sin renta (art. 911), solo ReteIVA $57.000", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const b = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Papelería Simple S.A.S.",
      municipio: MEDELLIN,
      regimen: "SIMPLE",
      responsableIva: true,
    });
    await entrarAlProducto(page, e);

    const { dialogo, numero } = await nuevaCompra(page, b);
    await lineaProducto(page, dialogo, e, 2_000_000);

    await expect(dialogo.getByText(/régimen simple \(art\. 911 ET\)/)).toBeVisible();
    await expect(filaRetencion(dialogo, "Compras generales")).toHaveCount(0);
    // Lo que ve la persona: la fila del ReteIVA con su valor.
    await expect(
      filaRetencion(dialogo, "Retención de IVA en compras"),
      "la pantalla tiene que mostrar la fila del ReteIVA de $57.000",
    ).toContainText(pesos(57_000));
    await mirar(
      page,
      [
        dialogo.getByText(/régimen simple \(art\. 911 ET\)/),
        filaRetencion(dialogo, "Retención de IVA en compras"),
        dialogo.getByText(/Se retiene/),
      ],
      6,
    );

    await registrar(page, dialogo);
    // Lo que se registró: 2.380.000 − 57.000.
    await expect(page.getByRole("row").filter({ hasText: numero }), "neto registrado sin renta y con ReteIVA").toContainText(
      pesos(2_380_000 - 57_000),
    );
    await mirar(page, page.getByRole("row").filter({ hasText: numero }), 2);
  });

  test("@paso7 4. Pagada con tarjeta: ni renta ni ReteIVA", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const a = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Ferretería Tarjeta S.A.S.",
      municipio: MEDELLIN,
      responsableIva: true,
    });
    await entrarAlProducto(page, e);

    const { dialogo, numero } = await nuevaCompra(page, a);
    await lineaProducto(page, dialogo, e, 2_000_000);
    await expect(filaRetencion(dialogo, "Compras generales")).toBeVisible();

    await dialogo.getByLabel("La pagué con tarjeta débito o crédito").check();
    await expect(dialogo.getByText(/No retengo renta: la compra se pagó con tarjeta/)).toBeVisible();
    await expect(dialogo.getByText(/No retengo IVA: la compra se pagó con tarjeta/)).toBeVisible();
    await expect(filaRetencion(dialogo, /Compras generales|Retención de IVA/)).toHaveCount(0);
    await expect(dialogo.getByText(/Se retiene/)).toHaveCount(0);
    await mirar(
      page,
      [
        dialogo.getByText(/No retengo renta: la compra se pagó con tarjeta/),
        dialogo.getByText(/No retengo IVA: la compra se pagó con tarjeta/),
      ],
      5,
    );

    await registrar(page, dialogo);
    await expect(page.getByRole("row").filter({ hasText: numero })).toContainText(pesos(2_380_000));
    await mirar(page, page.getByRole("row").filter({ hasText: numero }), 2);
  });

  test("@paso7 5. Base por debajo de 10 UVT: no retiene y dice por qué", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const a = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Tornillos Menores S.A.S.",
      municipio: MEDELLIN,
      responsableIva: true,
    });
    await entrarAlProducto(page, e);

    const { dialogo } = await nuevaCompra(page, a);
    await lineaProducto(page, dialogo, e, 300_000);

    await expect(dialogo.getByText(/No retengo compras generales: la base \(\$\s*300\.000\) no llega a 10 UVT/)).toBeVisible();
    await expect(filaRetencion(dialogo, "Compras generales")).toHaveCount(0);
    await expect(dialogo.getByText(/Se retiene/)).toHaveCount(0);
    await mirar(page, dialogo.getByText(/No retengo compras generales: la base/), 5);
  });

  test("@paso7 6. Empresa que no es agente de IVA: no calcula ReteIVA", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_ICA");
    const a = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Software Sin ReteIVA S.A.S.",
      municipio: MEDELLIN,
      responsableIva: true,
    });
    await entrarAlProducto(page, e);

    const { dialogo } = await nuevaCompra(page, a);
    await lineaProducto(page, dialogo, e, 2_000_000);

    const renta = filaRetencion(dialogo, "Compras generales");
    // Abierta: si la cifra no cuadra, el error muestra la norma y la tarifa usadas.
    await renta.getByRole("button", { name: "¿Por qué?" }).click();
    await expect(renta, "declarante: 2,5 % sobre $2.000.000 = $50.000").toContainText(pesos(50_000));
    await expect(filaRetencion(dialogo, /Retención de IVA/)).toHaveCount(0);
    // La lista entera de retenciones (solo la renta) y el total: no hay ReteIVA.
    await mirar(page, [renta.locator("xpath=.."), dialogo.getByText(/Se retiene/)], 6);
  });

  test("@paso7 7. Cambiar el concepto: aparece en «Lo que aprendí» y «Quitar» lo borra", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const p = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Montajes Aprendidos S.A.S.",
      municipio: MEDELLIN,
      responsableIva: true,
    });
    await entrarAlProducto(page, e);

    const { dialogo } = await nuevaCompra(page, p);
    await lineaProducto(page, dialogo, e, 2_000_000);
    await expect(dialogo.getByText("La vi clara")).toBeVisible();

    await dialogo.getByRole("button", { name: "No es esto" }).click();
    await elegirConcepto(page, dialogo, "Servicios generales");
    await expect(filaRetencion(dialogo, "Servicios generales")).toBeVisible();
    // El renglón dice que el concepto lo eligió la persona, no «La vi clara».
    await expect(dialogo.getByText("Lo dijiste vos"), "tras «No es esto» el chip tiene que decir «Lo dijiste vos»").toBeVisible();
    await expect(dialogo.getByText("La vi clara")).toHaveCount(0);
    await mirar(page, [dialogo.getByText("Lo dijiste vos"), filaRetencion(dialogo, "Servicios generales")], 4);
    await registrar(page, dialogo);

    await irARetenciones(page);
    const aprendido = page.locator("section").filter({ has: page.getByRole("heading", { name: "Lo que aprendí" }) });
    const fila = aprendido.getByRole("row").filter({ hasText: p.nombre });
    await expect(fila).toContainText("Servicios generales");
    await expect(fila).toContainText("Lo cambiaste");
    await mirar(page, [aprendido.getByRole("heading", { name: "Lo que aprendí" }), fila], 5);

    await fila.getByRole("button", { name: "Quitar" }).click();
    await esperarAviso(page, /la próxima vez lo vuelvo a deducir/);
    await expect(fila).toHaveCount(0);
    await mirar(page, aprendido, 2);
  });

  // -------------------------------------------------------------------------
  // §5 — ReteICA
  // -------------------------------------------------------------------------

  test("@paso7 8a. ReteICA en Bogotá: servicio de CIIU 6201 a 9,66 por mil; gran contribuyente no", async ({
    page,
    request,
  }) => {
    const e = await empresaMotor(request, "RENTA_ICA");
    const a = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Desarrollos Capital S.A.S.",
      municipio: BOGOTA,
      responsableIva: true,
      ciiu: "6201",
    });
    const gc = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Gran Software Nacional S.A.",
      municipio: BOGOTA,
      responsableIva: true,
      granContribuyente: true,
      ciiu: "6201",
    });
    await entrarAlProducto(page, e);

    // «ICA en tus municipios»: agente en los tres; Apartadó sin ley.
    await irARetenciones(page);
    const ica = page.locator("section").filter({ has: page.getByRole("heading", { name: "ICA en tus municipios" }) });
    await expect(ica.getByRole("listitem")).toHaveCount(3);
    await expect(ica.getByRole("listitem").filter({ hasText: /Bogot/ })).toContainText("Sos agente de retención de ICA aquí.");
    await expect(ica.getByRole("listitem").filter({ hasText: /Apartad/ })).toContainText(/Todavía no tengo la ley de ICA/);
    await mirar(
      page,
      [
        ica.getByRole("heading", { name: "ICA en tus municipios" }),
        ica.getByRole("listitem").filter({ hasText: /Bogot/ }),
        ica.getByRole("listitem").filter({ hasText: /Apartad/ }),
      ],
      6,
    );

    for (const [proveedor, retiene] of [
      [a, true],
      [gc, false],
    ] as const) {
      const { dialogo } = await nuevaCompra(page, proveedor);
      await lineaGasto(page, dialogo, "513595", "Servicio de soporte técnico", 2_000_000);
      await aceptarDeducida(dialogo);
      await dialogo.getByLabel(/Dónde se recibe/).selectOption(BOGOTA);
      if (retiene) {
        const fila = filaRetencion(dialogo, /ReteICA|industria y comercio/i);
        await expect(fila, "Bogotá: 9,66 por mil sobre $2.000.000 = $19.320").toContainText("9,66 por mil");
        await expect(fila).toContainText(pesos(19_320));
        await mirar(page, fila, 3);
        await registrar(page, dialogo);
      } else {
        await expect(filaRetencion(dialogo, "Servicios generales")).toBeVisible();
        await expect(filaRetencion(dialogo, /ReteICA|industria y comercio/i), "a un gran contribuyente no se le retiene ICA en Bogotá").toHaveCount(0);
        await expect(dialogo.getByText(/No retengo ICA en Bogot/)).toBeVisible();
        await mirar(page, [filaRetencion(dialogo, "Servicios generales"), dialogo.getByText(/No retengo ICA en Bogot/)], 5);
      }
    }
  });

  test("@paso7 8b. ReteICA en Medellín: 2 por mil, y el acumulado del bimestre", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_ICA");
    const c = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Suministros Antioquia S.A.S.",
      municipio: MEDELLIN,
    });
    const c2 = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Bodega del Poblado S.A.S.",
      municipio: MEDELLIN,
    });
    await entrarAlProducto(page, e);

    const ica = (d: import("@playwright/test").Locator) => filaRetencion(d, /ReteICA|industria y comercio/i);

    // C: $1.000.000 → 2 por mil = $2.000.
    let compra = await nuevaCompra(page, c);
    await lineaProducto(page, compra.dialogo, e, 1_000_000);
    await expect(ica(compra.dialogo), "Medellín: 2 por mil sobre $1.000.000").toContainText("2 por mil");
    await expect(ica(compra.dialogo)).toContainText(pesos(2_000));
    await mirar(page, ica(compra.dialogo), 3);
    await compra.dialogo.getByRole("button", { name: "Cancelar" }).click();

    // Otro proveedor: $700.000 no llega; la siguiente de $400.000 sí → $800.
    compra = await nuevaCompra(page, c2);
    await lineaProducto(page, compra.dialogo, e, 700_000);
    await expect(ica(compra.dialogo), "$700.000 no llega a la base de Medellín").toHaveCount(0);
    await expect(compra.dialogo.getByText(/No retengo ICA en Medell/)).toBeVisible();
    await mirar(page, compra.dialogo.getByText(/No retengo ICA en Medell/), 3);
    await registrar(page, compra.dialogo);

    compra = await nuevaCompra(page, c2);
    await lineaProducto(page, compra.dialogo, e, 400_000);
    await expect(ica(compra.dialogo), "con lo del bimestre ($1.100.000) pasa la base: 2 por mil sobre $400.000").toContainText(
      pesos(800),
    );
    await mirar(page, ica(compra.dialogo), 4);
  });

  test("@paso7 8c. Municipio sin ley de ICA (Apartadó): avisa y no calcula en cero", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_ICA");
    const p = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Bananeras del Urabá S.A.S.",
      municipio: APARTADO,
    });
    await entrarAlProducto(page, e);

    const { dialogo } = await nuevaCompra(page, p);
    await lineaGasto(page, dialogo, "513595", "Servicio de mantenimiento", 2_000_000);
    await aceptarDeducida(dialogo);
    await dialogo.getByLabel(/Dónde se recibe/).selectOption(APARTADO);

    await expect(dialogo.getByText(/No tengo los parámetros de ReteICA de Apartad/)).toBeVisible();
    await expect(filaRetencion(dialogo, /ReteICA|industria y comercio/i), "no debe aparecer una ReteICA (ni en cero)").toHaveCount(0);
    await expect(filaRetencion(dialogo, "Servicios generales")).toBeVisible();
    await mirar(
      page,
      [dialogo.getByText(/No tengo los parámetros de ReteICA de Apartad/), filaRetencion(dialogo, "Servicios generales")],
      5,
    );
  });

  // -------------------------------------------------------------------------
  // §10 — Perfil del tercero: art. 383, convenio, AIU, historia
  // -------------------------------------------------------------------------

  test("@paso7 9. Persona natural sin 2 o más trabajadores: honorarios por la tabla del art. 383 y pide aportes", async ({
    page,
    request,
  }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const d = await crearProveedor(request, e, {
      tipoPersona: "NATURAL",
      nombre: "Camila Restrepo",
      municipio: MEDELLIN,
      contratoDosOMasTrabajadores: false,
    });
    await entrarAlProducto(page, e);

    const { dialogo } = await nuevaCompra(page, d);
    await lineaGasto(page, dialogo, "511025", "Honorarios asesoría contable", 10_000_000);
    await aceptarDeducida(dialogo);

    await expect(dialogo.getByText(/tabla del art\. 383/).first()).toBeVisible();
    await expect(dialogo.getByLabel(/Aportes a salud y pensión del proveedor/)).toBeVisible();
    await mirar(
      page,
      [dialogo.getByText(/tabla del art\. 383/).first(), dialogo.getByLabel(/Aportes a salud y pensión del proveedor/)],
      5,
    );
  });

  test("@paso7 10. Proveedor del exterior con certificado de España: convenio a la vista, no se aplica solo; IVA asumido al 100 %", async ({
    page,
    request,
  }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const ext = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      tipoDocumento: "NIT_EXTRANJERO",
      nombre: "Consultores Ibéricos S.L.",
    });
    await entrarAlProducto(page, e);

    // El certificado de residencia, por la ficha.
    const ficha = await editarTercero(page, ext.nombre);
    await ficha.getByRole("button", { name: "Certificado" }).click();
    await ficha.getByLabel("País").selectOption({ label: "España" });
    await ficha.getByLabel("Cubre desde").fill("2026-01-01");
    await ficha.getByLabel("Hasta").fill("2026-12-31");
    await ficha.getByRole("button", { name: "Guardar", exact: true }).click();
    await esperarAviso(page, /Certificado de residencia guardado/);
    await expect(ficha.getByText(/España: del/)).toBeVisible();
    await mirar(page, ficha.getByText(/España: del/), 3);

    const { dialogo, numero } = await nuevaCompra(page, ext);
    await lineaGasto(page, dialogo, "511025", "Servicio de consultoría en procesos", 1_000_000);
    await elegirConcepto(
      page,
      dialogo,
      "Exterior: intereses, comisiones, honorarios, regalías, arrendamientos, servicios y software",
    );

    const renta = filaRetencion(dialogo, /^Exterior: intereses/);
    await expect(dialogo.getByText(/probó su residencia\s+en España/)).toBeVisible();
    const aplicar = dialogo.getByRole("button", { name: /Aplicar convenio: intereses/ });
    await expect(aplicar).toBeVisible();
    // No se aplica solo: sigue la tarifa del Estatuto (20 %).
    await expect(renta, "sin aplicar, la tarifa del art. 408: 20 %").toContainText("20 %");
    await expect(renta).toContainText(pesos(200_000));

    // Servicio del exterior: la empresa asume el IVA (19 %) y lo retiene al 100 %.
    const reteiva = filaRetencion(dialogo, "Retención de IVA en servicios del exterior");
    await expect(reteiva).toContainText("100 %");
    await expect(reteiva).toContainText(pesos(190_000));
    await expect(dialogo.getByText(/asumís \$\s*190\.000 de IVA del exterior/)).toBeVisible();
    await mirar(
      page,
      [aplicar, renta, reteiva, dialogo.getByText(/asumís \$\s*190\.000 de IVA del exterior/)],
      8,
    );

    await aplicar.click();
    await expect(dialogo.getByRole("button", { name: /Aplicado: intereses/ })).toBeVisible();
    await expect(renta, "con el convenio de España: 10 %").toContainText("10 %");
    await expect(renta).toContainText(pesos(100_000));
    await mirar(page, [dialogo.getByRole("button", { name: /Aplicado: intereses/ }), renta], 4);

    // Siendo agente, la cuenta de la retención del exterior (236550) se crea
    // sola al calcular: nadie la crea a mano y la pantalla no avisa que falte.
    await expect(
      renta.getByText(/No tenés la cuenta de esta retención/),
      "la retención del exterior tiene que tener su cuenta (236550) sin crearla a mano",
    ).toHaveCount(0);

    await registrar(page, dialogo);
    const asiento = await abrirAsiento(page, numero);
    const s = await sumas(asiento);
    expect(s.debito, "el asiento del exterior cuadra").toBe(s.credito);
    await expect(lineaAsiento(asiento, "236550"), "236550 por la renta del exterior").toContainText(pesos(100_000));
    // El IVA retenido del exterior: 2367 (la 236705 que se crea sola si no hay).
    await expect(lineaAsiento(asiento, "2367"), "2367 por el ReteIVA del exterior").toContainText(pesos(190_000));
    await mirar(
      page,
      [
        lineaAsiento(asiento, "236550"),
        lineaAsiento(asiento, "2367"),
        asiento.getByRole("row").filter({ hasText: "Sumas iguales" }),
      ],
      7,
    );
  });

  test("@paso7 11. AIU: aseo de $10.000.000 retiene sobre el AIU, nunca menos del 10 %", async ({ page, request }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const p = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Aseo Integral S.A.S.",
      municipio: MEDELLIN,
      responsableIva: true,
    });
    await entrarAlProducto(page, e);

    const { dialogo, numero } = await nuevaCompra(page, p);
    await lineaGasto(page, dialogo, "513505", "Servicio de aseo y limpieza de oficinas", 10_000_000);
    await aceptarDeducida(dialogo);

    const aiu = dialogo.getByLabel(/AIU de Renglón 1/);
    const renta = filaRetencion(dialogo, "Servicios de vigilancia y aseo");
    // El IVA también va sobre el AIU (art. 462-1 ET): 19 % del AIU, y el
    // ReteIVA es el 15 % de ese IVA (la empresa es agente de IVA).
    const reteiva = filaRetencion(dialogo, /Retención de IVA/);

    await aiu.fill("1200000");
    await expect(renta, "2 % × $1.200.000").toContainText(pesos(1_200_000));
    await expect(renta).toContainText(pesos(24_000));
    await expect(reteiva, "IVA sobre el AIU: 19 % × $1.200.000 = $228.000").toContainText(pesos(228_000));
    await expect(reteiva, "ReteIVA: 15 % × $228.000").toContainText(pesos(34_200));
    await expect(dialogo.getByText(/Se retiene/)).toContainText(pesos(24_000 + 34_200));
    await mirar(page, [aiu, renta, reteiva], 6);

    await aiu.fill("500000");
    await expect(renta, "AIU menor al 10 %: base $1.000.000 → $20.000").toContainText(pesos(1_000_000));
    await expect(renta).toContainText(pesos(20_000));
    await expect(reteiva, "IVA sobre el 10 %: 19 % × $1.000.000 = $190.000").toContainText(pesos(190_000));
    await expect(reteiva, "ReteIVA: 15 % × $190.000").toContainText(pesos(28_500));
    await expect(dialogo.getByText(/Se retiene/)).toContainText(pesos(20_000 + 28_500));
    await mirar(page, [aiu, renta, reteiva], 6);

    // Registrada, el IVA de la compra es el del AIU, no el 19 % de los $10.000.000.
    await registrar(page, dialogo);
    const fila = page.getByRole("row").filter({ hasText: numero });
    await expect(fila, "neto: 10.190.000 − 20.000 − 28.500").toContainText(pesos(10_190_000 - 48_500));
    await fila.getByRole("button", { name: "Ver" }).click();
    const detalle = page.getByRole("dialog");
    const ivaDetalle = detalle.getByText("IVA", { exact: true }).locator("..");
    const totalDetalle = detalle.getByText("Total factura", { exact: true }).locator("..");
    await expect(ivaDetalle, "IVA de la compra sobre el AIU").toContainText(pesos(190_000));
    await expect(totalDetalle).toContainText(pesos(10_190_000));
    await mirar(page, [ivaDetalle, totalDetalle], 4);
  });

  test("@paso3 12. Perfil del tercero: «Cambió algo» abre una versión nueva con fecha y queda la historia", async ({
    page,
    request,
  }) => {
    const e = await empresaMotor(request, "RENTA_IVA");
    const p = await crearProveedor(request, e, {
      tipoPersona: "JURIDICA",
      nombre: "Perfiles Cambiantes S.A.S.",
      municipio: MEDELLIN,
      responsableIva: true,
      ciiu: "6201",
    });
    await entrarAlProducto(page, e);

    const ficha = await editarTercero(page, p.nombre);
    const historia = ficha.getByRole("listitem").filter({ hasText: /Desde el|Del / });
    await expect(historia.filter({ hasText: /Desde el 1 de ene de 2026/ })).toContainText("CIIU 6201");

    await ficha.getByRole("button", { name: "Cambió algo" }).click();
    await ficha.getByLabel("Gran contribuyente").check();
    await ficha.getByLabel(/Actividad principal \(CIIU\)/).fill("6202");
    await ficha.getByRole("button", { name: /^Guardar desde el / }).click();
    await esperarAviso(page, /Datos tributarios guardados/);

    const dia = Number(hoyCol().slice(8, 10));
    const vigente = historia.filter({ hasText: new RegExp(`Desde el ${dia} de `) });
    await expect(vigente, "la versión nueva, desde hoy").toContainText("gran contribuyente");
    await expect(vigente).toContainText("CIIU 6202");
    await expect(vigente).toContainText("lo cargó");
    const anterior = historia.filter({ hasText: /Del 1 de ene de 2026 al / });
    await expect(anterior, "la anterior queda en la historia, cerrada ayer").toContainText("CIIU 6201");
    await expect(anterior).not.toContainText("gran contribuyente");
    await mirar(page, [vigente, anterior], 5);
  });
});
