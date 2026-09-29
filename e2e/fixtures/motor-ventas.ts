import { expect, test, type APIRequestContext, type Browser, type Locator, type Page } from "@playwright/test";

import { ADMIN, API, nitDePrueba } from "./datos";
import { hoyCol, prepararEmpresa, type EmpresaLista } from "./empresa";
import { entrarAlProducto } from "./producto";
import { prepararRetenciones } from "./retenciones";

/**
 * Lo que necesitan las pruebas del motor de retenciones del lado de la venta,
 * de las notas, de los reportes y del recálculo (guion de QA, §6 a §9).
 *
 * Por la API solo se arma lo que no es el objeto de la prueba: la empresa, sus
 * cuentas, sus responsabilidades del RUT, los terceros y los productos. Lo que
 * se prueba —emitir, anular, ver el reporte, cargar la ley en la consola— va
 * por la pantalla.
 *
 * Las tablas de la ley (tarifas, autorretención por CIIU) son **globales** en
 * QA: toda prueba que las cambie tiene que dejarlas como estaban.
 */

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

/** `YYYY-MM-DD` corrido `dias` días (en Colombia, a mediodía para no cruzar). */
export const correrDias = (fecha: string, dias: number): string => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// La API como el cliente de la empresa y como el superadministrador
// ---------------------------------------------------------------------------

export type Pedir = <T = unknown>(
  metodo: "get" | "post" | "put",
  ruta: string,
  datos?: unknown,
  opciones?: { permitirError?: boolean },
) => Promise<{ ok: boolean; status: number; cuerpo: T; texto: string }>;

function pedidor(api: APIRequestContext, token: string): Pedir {
  return async (metodo, ruta, datos, opciones) => {
    const r = await api[metodo](`${API}${ruta}`, {
      headers: { Authorization: `Bearer ${token}` },
      ...(datos === undefined ? {} : { data: datos }),
    });
    const texto = await r.text();
    if (!opciones?.permitirError) {
      expect(r.ok(), `${metodo.toUpperCase()} ${ruta}: ${texto}`).toBeTruthy();
    }
    let cuerpo: unknown = null;
    try {
      cuerpo = texto === "" ? null : JSON.parse(texto);
    } catch {
      cuerpo = texto;
    }
    return { ok: r.ok(), status: r.status(), cuerpo: cuerpo as never, texto };
  };
}

export const apiEmpresa = (api: APIRequestContext, e: EmpresaLista): Pedir =>
  pedidor(api, e.token);

export async function apiAdmin(api: APIRequestContext): Promise<Pedir> {
  const r = await api.post(`${API}/auth/login`, {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(r.ok(), "el superadministrador tiene que poder entrar").toBeTruthy();
  const { token } = (await r.json()) as { token: string };
  return pedidor(api, token);
}

// ---------------------------------------------------------------------------
// La empresa del motor
// ---------------------------------------------------------------------------

interface CuentaPlan {
  id: string;
  codigo: string;
  es_auxiliar?: boolean;
  esAuxiliar?: boolean;
}

async function planDe(pedir: Pedir): Promise<CuentaPlan[]> {
  const { cuerpo } = await pedir<CuentaPlan[] | { datos: CuentaPlan[] }>("get", "/plan-cuentas");
  return Array.isArray(cuerpo) ? cuerpo : cuerpo.datos;
}

/** Crea la cuenta si no está. Es lo que haría el contador en el plan de cuentas. */
export async function asegurarCuenta(
  api: APIRequestContext,
  e: EmpresaLista,
  codigo: string,
  nombre: string,
): Promise<void> {
  const pedir = apiEmpresa(api, e);
  const cuentas = await planDe(pedir);
  if (cuentas.some((c) => c.codigo === codigo)) return;
  await pedir("post", "/plan-cuentas", { codigo, nombre });
}

export async function tieneCuenta(
  api: APIRequestContext,
  e: EmpresaLista,
  codigo: string,
): Promise<boolean> {
  return (await planDe(apiEmpresa(api, e))).some((c) => c.codigo === codigo);
}

async function auxiliar(pedir: Pedir, prefijo: string): Promise<string> {
  const cuentas = await planDe(pedir);
  const suyas = cuentas.filter((c) => c.codigo.startsWith(prefijo));
  const aux = suyas.filter((c) => c.es_auxiliar ?? c.esAuxiliar ?? false);
  const elegida = (aux.length > 0 ? aux : suyas).sort((a, b) => b.codigo.length - a.codigo.length)[0];
  expect(elegida, `no hay una cuenta que empiece por ${prefijo}`).toBeDefined();
  return elegida.id;
}

export interface ProductoVenta {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
}

/** Un producto con su precio (sin IVA) y existencia para vender. */
export async function crearProducto(
  api: APIRequestContext,
  e: EmpresaLista,
  nombre: string,
  precio: number,
  existencia = 20,
): Promise<ProductoVenta> {
  const pedir = apiEmpresa(api, e);
  const codigo = `E2E-M${Date.now().toString().slice(-6)}`;
  const { cuerpo } = await pedir<{ id: string }>("post", "/productos", {
    codigo,
    nombre,
    unidadMedida: "UND",
    ivaTarifa: 19,
    precioVenta: precio,
    cuentaInventarioId: await auxiliar(pedir, "1435"),
    cuentaCostoVentaId: await auxiliar(pedir, "6135"),
    cuentaIngresoId: await auxiliar(pedir, "4135"),
  });
  await pedir("post", `/productos/${cuerpo.id}/movimientos/carga-inicial`, {
    fecha: hoyCol(),
    cantidad: existencia,
    costoUnitario: Math.round(precio / 4),
    motivo: "Existencia inicial para la prueba",
  });
  return { id: cuerpo.id, codigo, nombre, precio };
}

export interface ClienteMotor {
  id: string;
  nombre: string;
}

/** Un cliente persona jurídica, con sus calidades tributarias. */
export async function crearCliente(
  api: APIRequestContext,
  e: EmpresaLista,
  razonSocial: string,
  calidades: { regimenSimple?: boolean; esGranContribuyente?: boolean; esAgenteRetenedor?: boolean },
): Promise<ClienteMotor> {
  const pedir = apiEmpresa(api, e);
  const { nit, dv } = nitDePrueba();
  const { cuerpo } = await pedir<{ id: string }>("post", "/terceros", {
    tipoPersona: "JURIDICA",
    tipoDocumento: "NIT",
    numeroDocumento: nit,
    dv,
    razonSocial,
    municipioCodigo: "05001",
    esCliente: true,
    responsabilidadesDian: ["O-48"],
    responsableIva: true,
    ...calidades,
  });
  return { id: cuerpo.id, nombre: razonSocial };
}

/**
 * La empresa con lo que el motor necesita: agente de retención de renta (y
 * la 236540), y si se pide, autorretenedora especial (responsabilidad 59 del
 * RUT) y con la 236575.
 */
export async function prepararEmpresaMotor(
  api: APIRequestContext,
  nombre: string,
  opciones: {
    agenteRenta?: boolean;
    autorretenedorEspecial?: boolean;
    con236575?: boolean;
  } = {},
): Promise<EmpresaLista> {
  const e = await prepararEmpresa(api, `e2e ${nombre} ${Date.now()}`);
  const pedir = apiEmpresa(api, e);
  await prepararRetenciones(api, e, { agenteRetenedor: opciones.agenteRenta ?? false });
  if (opciones.autorretenedorEspecial) {
    await pedir("post", "/empresa-legal/responsabilidades-rut", {
      codigo: 59,
      fechaInicio: "2020-01-01",
    });
  }
  if (opciones.con236575) {
    await asegurarCuenta(api, e, "236575", "Autorretenciones");
  }
  // La 135515 viene en el plan base: si faltara, la prueba lo diría acá.
  expect(await tieneCuenta(api, e, "135515"), "el plan base trae la 135515").toBe(true);
  return e;
}

// ---------------------------------------------------------------------------
// La consola (superadministrador), en su propio contexto
// ---------------------------------------------------------------------------

/**
 * Un contexto propio (la consola, otro usuario) no lo graba Playwright: el
 * video de la prueba es solo el de `page`. En la corrida grabada
 * (`E2E_GRABAR=1`) se le pide video en la carpeta de resultados de la prueba.
 */
export const grabarContexto = (nombre: string): { recordVideo?: { dir: string } } =>
  process.env.E2E_GRABAR === "1" ? { recordVideo: { dir: test.info().outputPath(nombre) } } : {};

/**
 * Cierra el contexto de esa pestaña y adjunta su video a la prueba. El
 * reportero de videos toma el **primer** adjunto llamado «video»: si la prueba
 * ya tiene el de `page`, al secundario se le da otro nombre y queda solo en el
 * informe HTML.
 */
export async function cerrarYAdjuntarVideo(pagina: Page, nombre: string): Promise<void> {
  const video = pagina.video();
  await pagina.context().close();
  if (video === null) return;
  const ruta = await video.path();
  await test.info().attach(nombre, { path: ruta, contentType: "video/webm" });
}

/** Una pestaña con la sesión del superadministrador que dejó `entrar.setup`. */
export async function abrirConsola(browser: Browser, grabar?: string): Promise<Page> {
  const contexto = await browser.newContext({
    storageState: "./e2e/.sesion/admin.json",
    locale: "es-CO",
    timezoneId: "America/Bogota",
    ...(grabar ? grabarContexto(grabar) : {}),
  });
  const page = await contexto.newPage();
  await page.goto("/plataforma/retenciones");
  await expect(page.getByText("Autorretención especial por actividad")).toBeVisible();
  return page;
}

export interface Autorretencion {
  ciiu: string;
  tarifa: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  norma: string;
}

export async function autorretencionesDe(api: APIRequestContext, ciiu: string): Promise<Autorretencion[]> {
  const pedir = await apiAdmin(api);
  const { cuerpo } = await pedir<Autorretencion[]>("get", "/plataforma/retenciones/autorretencion");
  return cuerpo.filter((a) => a.ciiu === ciiu);
}

export const NORMA_PRUEBA_AUTO =
  "PRUEBA e2e QA — no es la ley real (guion motor de retenciones §6)";

/**
 * Deja la autorretención de prueba sin vigencia abierta. La ley no se borra ni
 * se edita (R-D7): lo único que la consola permite es una vigencia nueva, así
 * que se carga una que empieza mañana y **termina mañana**, con la misma tarifa
 * y la misma norma de prueba. Desde pasado mañana el CIIU vuelve a no tener
 * tarifa, como antes de la prueba.
 *
 * Idempotente: si ya se cerró, no hace nada.
 */
export async function cerrarAutorretencionDePrueba(
  api: APIRequestContext,
  ciiu: string,
  tarifaPorcentaje: number,
): Promise<string> {
  const hoy = hoyCol();
  const manana = correrDias(hoy, 1);
  const filas = await autorretencionesDe(api, ciiu);
  const abierta = filas.find((f) => f.vigenciaHasta === null);
  if (abierta === undefined) return "ya estaba cerrada";
  if (!abierta.norma.startsWith("PRUEBA e2e")) {
    throw new Error(`La vigencia abierta del CIIU ${ciiu} no es de prueba (${abierta.norma}): no la toco.`);
  }
  const pedir = await apiAdmin(api);
  await pedir("post", "/plataforma/retenciones/autorretencion", {
    ciiu,
    tarifaPorcentaje,
    vigenciaDesde: manana,
    vigenciaHasta: manana,
    norma: `${NORMA_PRUEBA_AUTO} · cierre`,
    validadoPor: "Prueba e2e",
    validadoEn: hoy,
  });
  const despues = await autorretencionesDe(api, ciiu);
  expect(despues.some((f) => f.vigenciaHasta === null), "no queda ninguna vigencia abierta").toBe(false);
  return `cerrada: ${despues.map((f) => `${f.vigenciaDesde}→${f.vigenciaHasta}`).join(", ")}`;
}

// ---------------------------------------------------------------------------
// Ventas por la pantalla
// ---------------------------------------------------------------------------

/**
 * Emite una factura a crédito por la pantalla. El precio sale de la lista del
 * producto. No espera a que cierre: quien llama decide si esperaba un freno.
 */
export async function llenarYEmitirFactura(
  page: Page,
  cliente: string,
  producto: ProductoVenta,
  cantidad: number,
): Promise<void> {
  await page.goto("/dashboard/ventas");
  await page.getByRole("button", { name: "Facturas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva factura" }).click();

  await page.getByRole("button", { name: /Seleccione un cliente/ }).click();
  await page.getByLabel("Buscar cliente").fill(cliente.slice(0, 12));
  await page.getByRole("button", { name: new RegExp(cliente) }).first().click();

  await page.getByRole("button", { name: /Seleccione un producto/ }).click();
  await page.getByLabel("Buscar producto").fill(producto.codigo);
  await page.getByRole("button", { name: new RegExp(producto.nombre) }).first().click();
  await page.getByLabel("Cantidad de la línea 1").fill(String(cantidad));

  await page.getByRole("radio", { name: "Crédito" }).click();
  await page.getByRole("button", { name: "Emitir factura" }).click();
}

export async function emitirFactura(
  page: Page,
  cliente: string,
  producto: ProductoVenta,
  cantidad: number,
): Promise<void> {
  await llenarYEmitirFactura(page, cliente, producto, cantidad);
  // Emitida: el diálogo se cierra, o la página vuelve a la lista (Fase 8).
  await expect(page.getByRole("button", { name: "Emitir factura" })).toBeHidden({ timeout: 20_000 });
}

/** La fila de una factura en la pestaña «Facturas». */
export async function filaFactura(page: Page, numero: string) {
  await page.goto("/dashboard/ventas");
  await page.getByRole("button", { name: "Facturas", exact: true }).click();
  return page.getByRole("row").filter({ hasText: numero }).first();
}

/** Abre el detalle de la factura y devuelve el diálogo. */
export async function abrirDetalleFactura(page: Page, numero: string) {
  const fila = await filaFactura(page, numero);
  await fila.getByRole("button", { name: "Ver" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  return dialogo;
}

/** Nota crédito de venta por la pantalla, desde el menú de la factura. */
export async function notaCreditoVenta(
  page: Page,
  numero: string,
  motivo: string,
  parcial?: { producto: string; cantidad: number },
): Promise<void> {
  const fila = await filaFactura(page, numero);
  await fila.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Nota crédito" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Nota crédito" })).toBeVisible();
  await dialogo.getByLabel("Motivo *").fill(motivo);
  if (parcial) {
    await dialogo.getByText("Devolver solo una parte").click();
    await dialogo.getByLabel(`Cuánto vuelve de ${parcial.producto}`).fill(String(parcial.cantidad));
  }
  await dialogo.getByRole("button", { name: "Emitir nota crédito" }).click();
  await expect(dialogo).toBeHidden({ timeout: 20_000 });
}

export async function anularFactura(page: Page, numero: string, motivo: string): Promise<void> {
  const fila = await filaFactura(page, numero);
  await fila.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Anular" }).click();
  const alerta = page.getByRole("alertdialog");
  await alerta.getByLabel("Motivo de la anulación").fill(motivo);
  await alerta.getByRole("button", { name: "Anular factura" }).click();
  await expect(alerta).toBeHidden({ timeout: 20_000 });
}

/**
 * Abre «Anular» de la factura y devuelve el diálogo, sin confirmar: para mirar
 * lo que dice antes (con notas vivas, el aviso en vez del motivo).
 */
export async function abrirAnulacionFactura(page: Page, numero: string) {
  const fila = await filaFactura(page, numero);
  await fila.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Anular" }).click();
  const alerta = page.getByRole("alertdialog");
  await expect(alerta).toBeVisible();
  return alerta;
}

/** El id de la factura de un cliente, por la API. */
export async function idFactura(api: APIRequestContext, e: EmpresaLista, cliente: string): Promise<string> {
  const { cuerpo } = await apiEmpresa(api, e)<{ datos: { id: string; tercero_nombre: string | null }[] }>(
    "get",
    "/facturas",
  );
  const f = cuerpo.datos.find((x) => (x.tercero_nombre ?? "").includes(cliente));
  expect(f, `la factura de ${cliente} existe`).toBeDefined();
  return f!.id;
}

export async function anularNotaCreditoVenta(page: Page, numero: string, motivo: string): Promise<void> {
  await page.goto("/dashboard/ventas");
  await page.getByRole("button", { name: "Notas crédito", exact: true }).click();
  const fila = page.getByRole("row").filter({ hasText: numero }).first();
  await fila.getByRole("button", { name: "Anular" }).click();
  const alerta = page.getByRole("alertdialog");
  await alerta.getByLabel("Motivo de la anulación").fill(motivo);
  await alerta.getByRole("button", { name: "Anular nota crédito" }).click();
  await expect(alerta).toBeHidden({ timeout: 20_000 });
}

// ---------------------------------------------------------------------------
// Compras por la pantalla
// ---------------------------------------------------------------------------

/** Registra una compra a crédito del producto de la empresa, a Distribuidora. */
export async function registrarCompra(
  page: Page,
  e: EmpresaLista,
  datos: { numero: string; cantidad: number; costo: number; fecha?: string; retenido?: number },
): Promise<void> {
  await page.goto("/dashboard/compras");
  await page.getByRole("button", { name: "Nueva compra" }).click();
  // El diálogo, o la página si la compra como página está prendida (Fase 7).
  const dialogo = page.getByRole("dialog").or(page.getByRole("region", { name: "Nueva compra" }));

  await page.getByRole("button", { name: /Seleccione un proveedor/ }).click();
  await page.getByLabel("Buscar proveedor").fill("Distribuidora");
  await page.getByRole("button", { name: /Distribuidora del Valle/ }).first().click();
  if (datos.fecha) await dialogo.getByLabel("Fecha", { exact: true }).fill(datos.fecha);
  await page.getByLabel("N.° factura proveedor").fill(datos.numero);

  await page.getByRole("button", { name: /Seleccione un producto/ }).click();
  await page.getByLabel("Buscar producto").fill(e.producto.codigo);
  await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
  await page.getByLabel("Cantidad de la línea 1").fill(String(datos.cantidad));
  await page.getByLabel("Costo unitario de la línea 1").fill(String(datos.costo));

  if (datos.retenido !== undefined) {
    await expect(dialogo.getByText(/Se retiene/)).toContainText(datos.retenido.toLocaleString("es-CO"));
  }
  await page.getByRole("radio", { name: "Crédito" }).click();
  await page.getByRole("button", { name: "Registrar compra" }).click();
  await expect(dialogo).toBeHidden({ timeout: 20_000 });
}

async function filaCompra(page: Page, numero: string) {
  await page.goto("/dashboard/compras");
  return page.getByRole("row").filter({ hasText: numero }).first();
}

/** Nota crédito del proveedor, devolviendo `cantidad` unidades del producto. */
export async function notaCreditoCompra(
  page: Page,
  e: EmpresaLista,
  compra: string,
  datos: { numero: string; cantidad: number },
): Promise<void> {
  const fila = await filaCompra(page, compra);
  await fila.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Nota crédito" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("N.° nota del proveedor").fill(datos.numero);
  await dialogo.getByLabel("Motivo *").fill("Devolución parcial de mercancía (prueba e2e)");
  await dialogo.getByText("Devolver solo una parte").click();
  await dialogo.getByLabel(`Cuánto vuelve de ${e.producto.nombre}`).fill(String(datos.cantidad));
  await dialogo.getByRole("button", { name: "Registrar nota crédito" }).click();
  await expect(dialogo).toBeHidden({ timeout: 20_000 });
}

export async function anularCompra(
  page: Page,
  compra: string,
  antesDeConfirmar?: (alerta: ReturnType<Page["getByRole"]>) => Promise<void>,
): Promise<void> {
  const fila = await filaCompra(page, compra);
  await fila.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Anular" }).click();
  const alerta = page.getByRole("alertdialog");
  await expect(alerta.getByText(`Anular ${compra}`)).toBeVisible();
  if (antesDeConfirmar) await antesDeConfirmar(alerta);
  await alerta.getByLabel("Motivo de la anulación").fill("Anulación de prueba e2e");
  await alerta.getByRole("button", { name: "Anular compra" }).click();
  await expect(alerta).toBeHidden({ timeout: 20_000 });
}

/**
 * Abre «Anular» de la compra y devuelve el diálogo, sin confirmar: para mirar
 * lo que dice antes (con notas vivas, el aviso en vez del motivo).
 */
export async function abrirAnulacionCompra(page: Page, compra: string) {
  const fila = await filaCompra(page, compra);
  await fila.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Anular" }).click();
  const alerta = page.getByRole("alertdialog");
  await expect(alerta.getByText(`Anular ${compra}`)).toBeVisible();
  return alerta;
}

/** Anula una nota de compra desde su pestaña («Notas crédito» o «Notas débito»). */
export async function anularNotaCompra(
  page: Page,
  pestana: "Notas crédito" | "Notas débito",
  numero: string,
): Promise<void> {
  await page.goto("/dashboard/compras");
  await page.getByRole("button", { name: pestana, exact: true }).click();
  const fila = page.getByRole("row").filter({ hasText: numero }).first();
  await fila.getByRole("button", { name: "Anular" }).click();
  const alerta = page.getByRole("alertdialog");
  await alerta.getByLabel("Motivo de la anulación").fill("Anulación de prueba e2e");
  await alerta.getByRole("button", { name: "Anular nota" }).click();
  await expect(alerta).toBeHidden({ timeout: 20_000 });
}

/** El id de una compra por su número de factura del proveedor. */
export async function idCompra(api: APIRequestContext, e: EmpresaLista, numero: string): Promise<string> {
  const { cuerpo } = await apiEmpresa(api, e)<{ datos: { id: string; numero_factura_proveedor: string }[] }>(
    "get",
    "/compras",
  );
  const c = cuerpo.datos.find((x) => x.numero_factura_proveedor === numero);
  expect(c, `la compra ${numero} existe`).toBeDefined();
  return c!.id;
}

// ---------------------------------------------------------------------------
// Libro y reportes por la pantalla
// ---------------------------------------------------------------------------

/**
 * Abre un asiento desde Libro → Asientos buscando por su glosa y devuelve su
 * diálogo. `verAnulados` para encontrar los anulados.
 */
export async function abrirAsiento(page: Page, glosa: string, verAnulados = false) {
  await page.goto("/dashboard/contabilidad");
  await page.getByRole("button", { name: "Asientos", exact: true }).click();
  await page.getByLabel("Buscar asiento").fill(glosa);
  if (verAnulados) await page.getByText("Ver anulados").click();
  const fila = page.getByRole("row").filter({ hasText: glosa }).first();
  await expect(fila).toBeVisible();
  await fila.getByRole("button", { name: "Ver" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  return dialogo;
}

/** Débito y crédito de la línea de una cuenta en el diálogo del asiento. */
export async function lineaDeCuenta(
  dialogo: ReturnType<Page["getByRole"]>,
  codigo: string,
): Promise<{ debito: string; credito: string }> {
  const fila = dialogo.getByRole("row").filter({ hasText: codigo }).first();
  await expect(fila, `el asiento tiene una línea de la ${codigo}`).toBeVisible();
  const celdas = fila.getByRole("cell");
  return {
    debito: (await celdas.nth(2).innerText()).replace(/\s+/g, " ").trim(),
    credito: (await celdas.nth(3).innerText()).replace(/\s+/g, " ").trim(),
  };
}

export interface Hoja350 {
  total: string;
  renta: string;
  iva: string;
  cuadra: boolean;
  cuadreValor: string;
  texto: string;
}

/** Elige un reporte en /dashboard/reportes, «Este mes», y lo abre en el visor. */
export async function verReporte(page: Page, nombre: RegExp): Promise<void> {
  await page.goto("/dashboard/reportes");
  await page.getByRole("button", { name: nombre }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("radio", { name: /Este mes/ }).click();
  await page.getByRole("button", { name: "Ver el reporte" }).click();
  await expect(page).toHaveURL(/\/reportes\//);
}

/** Lo que dice la hoja del 350 del mes: los totales y el cuadre con el libro. */
export async function leer350(page: Page): Promise<Hoja350> {
  await verReporte(page, /Formulario 350/);
  const hoja = page.frameLocator("iframe").first();
  const tarjetas = hoja.locator(".cifras .tarjeta");
  // Un mes sin ninguna retención no arma hoja: el visor dice que no hay datos.
  const sinDatos = page.getByText(/El reporte corrió bien/);
  await expect
    .poll(async () => (await sinDatos.count()) + (await tarjetas.count()), { timeout: 30_000 })
    .toBeGreaterThan(0);
  if ((await tarjetas.count()) === 0) {
    return { total: "$ 0", renta: "$ 0", iva: "$ 0", cuadra: true, cuadreValor: "sin datos", texto: "" };
  }
  const valor = async (rotulo: RegExp) =>
    (await tarjetas.filter({ has: hoja.locator(".rotulo", { hasText: rotulo }) }).first().locator(".valor").innerText()).trim();
  const cuadreRotulo = (await tarjetas.nth(3).locator(".rotulo").innerText()).trim();
  return {
    total: await valor(/Total a declarar/),
    renta: await valor(/^Renta$/),
    iva: await valor(/^IVA$/),
    cuadra: /^Cuadra con el libro/.test(cuadreRotulo),
    cuadreValor: (await tarjetas.nth(3).locator(".valor").innerText()).trim(),
    texto: (await hoja.locator("body").textContent()) ?? "",
  };
}

/** Las tarjetas del 350 en el visor (total, renta, IVA, cuadre): para mostrarlas en el video. */
export const cifras350 = (page: Page): Locator => page.frameLocator("iframe").first().locator(".cifras");

/** La fila de una cuenta en el diálogo del asiento: para mostrarla en el video. */
export const filaDeCuenta = (dialogo: Locator, codigo: string): Locator =>
  dialogo.getByRole("row").filter({ hasText: codigo }).first();

/** `$ 15.000` → 15000. */
export const pesos = (texto: string): number => Number(texto.replace(/[^\d-]/g, ""));

/** Entra al producto como el usuario de la empresa (atajo con nombre claro). */
export const entrarComoEmpresa = entrarAlProducto;
