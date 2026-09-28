import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";

import { API, nitDePrueba } from "./datos";
import { prepararEmpresa, type EmpresaLista } from "./empresa";

/**
 * Lo que necesitan las pruebas del motor de retenciones en compras, armado
 * **por la API**: la empresa como agente, sus sedes e ICA, las cuentas y los
 * proveedores con su perfil tributario. Lo que se prueba —el cálculo que ve
 * la persona, registrar, el asiento— va por la pantalla.
 *
 * Dos empresas desechables («e2e …»), y se reusan entre corridas durante unas
 * horas para no llenar QA de empresas: cada prueba crea sus propios
 * proveedores, así que lo aprendido y los acumulados de una no tocan a otra.
 */
export type Variante =
  /** Agente de renta y de IVA; no retiene ICA (sede en Medellín, no agente). */
  | "RENTA_IVA"
  /** Agente de renta y de ICA en Medellín, Bogotá y Apartadó; no de IVA. */
  | "RENTA_ICA";

export const MEDELLIN = "05001";
export const BOGOTA = "11001";
export const APARTADO = "05045";

/** Desde cuándo rige el perfil de los proveedores de prueba. */
const PERFIL_DESDE = "2026-01-01";

const HORAS_CACHE = 8;

const archivoCache = (v: Variante) =>
  join(tmpdir(), `contable-e2e-motor-compras-${v}.json`);

interface Cache {
  api: string;
  creada: number;
  empresa: Omit<EmpresaLista, "token">;
}

/** El token con la empresa elegida, entrando como su administrador. */
async function tokenDe(api: APIRequestContext, e: Omit<EmpresaLista, "token">): Promise<string | null> {
  const login = await api.post(`${API}/auth/login`, { data: e.acceso });
  if (!login.ok()) return null;
  const { token } = (await login.json()) as { token: string };
  const elegir = await api.post(`${API}/auth/empresa`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { empresaId: e.empresaId },
  });
  if (!elegir.ok()) return null;
  return ((await elegir.json()) as { token: string }).token;
}

const enMemoria = new Map<Variante, EmpresaLista>();

/**
 * La empresa de la variante: la de la corrida anterior si sigue viva, o una
 * nueva.
 */
export async function empresaMotor(api: APIRequestContext, v: Variante): Promise<EmpresaLista> {
  const ya = enMemoria.get(v);
  if (ya) return ya;

  const archivo = archivoCache(v);
  // La corrida grabada (E2E_GRABAR=1) es la que vale: empresas recién hechas.
  // Una de la corrida anterior puede traer cuentas que ya se crearon en otra
  // corrida (la 236550 del caso 10) y tapar un error.
  if (process.env.E2E_GRABAR !== "1" && existsSync(archivo)) {
    const c = JSON.parse(readFileSync(archivo, "utf8")) as Cache;
    if (c.api === API && Date.now() - c.creada < HORAS_CACHE * 3_600_000) {
      const token = await tokenDe(api, c.empresa);
      if (token !== null) {
        const e = { ...c.empresa, token };
        enMemoria.set(v, e);
        return e;
      }
    }
  }

  const nombre = `e2e Motor compras ${v === "RENTA_IVA" ? "renta-IVA" : "renta-ICA"} ${Date.now()}`;
  const e = await prepararEmpresa(api, nombre);
  console.log(`  [motor-compras] empresa nueva en ${API}: ${nombre}`);
  await configurar(api, e, v);

  const { token: _t, ...sinToken } = e;
  writeFileSync(archivo, JSON.stringify({ api: API, creada: Date.now(), empresa: sinToken } satisfies Cache));
  enMemoria.set(v, e);
  return e;
}

async function configurar(api: APIRequestContext, e: EmpresaLista, v: Variante) {
  const pedir = llamador(api, e);

  // Agente de retención de renta (casilla 53, código 07): sin esto no retiene nada.
  await pedir("post", "/empresa-legal/regimenes", {
    tipoRegimen: "AGENTE_RETENEDOR_RENTA",
    fechaInicio: "2020-01-01",
  });

  if (v === "RENTA_IVA") {
    // Agente de retención de IVA (código 09).
    await pedir("post", "/empresa-legal/regimenes", {
      tipoRegimen: "AGENTE_RETENEDOR_IVA",
      fechaInicio: "2020-01-01",
    });
  } else {
    // Sedes en Bogotá y en Apartadó, y agente de ICA en los tres municipios.
    await pedir("post", "/empresas/actual/sedes", {
      codigo: "002",
      nombre: "Bogotá",
      direccion: "Cra. 7 #71-21",
      municipioCodigo: BOGOTA,
      esPrincipal: false,
    });
    await pedir("post", "/empresas/actual/sedes", {
      codigo: "003",
      nombre: "Urabá",
      direccion: "Calle 100 #98-10",
      municipioCodigo: APARTADO,
      esPrincipal: false,
    });
    for (const m of [MEDELLIN, BOGOTA, APARTADO]) {
      await pedir("put", `/empresa-impuestos/ica/${m}`, {
        esAgenteRetenedor: true,
        esAutorretenedor: false,
        tarifaProvisionalPorMil: 4.14,
      });
    }
    await pedir("post", "/empresa-impuestos/confirmar");
  }

  // Las cuentas de retención que la sugerencia ahora propone y el plan no
  // tiene: es lo que haría el asistente al contestar «Impuestos».
  const plan = await codigosDelPlan(api, e);
  const sugerencia = (await pedir("get", "/plan-cuentas/sugerencia")) as
    | { codigo: string }[]
    | { cuentas: { codigo: string }[] };
  const faltan = (Array.isArray(sugerencia) ? sugerencia : sugerencia.cuentas)
    .map((c) => c.codigo)
    .filter((c) => !plan.has(c));
  if (faltan.length > 0) {
    await pedir("post", "/plan-cuentas/aplicar-sugerencia", { codigos: faltan });
  }

  // Cuentas de gasto para los servicios.
  const conGastos = await codigosDelPlan(api, e);
  for (const [codigo, nombre] of [
    ["513505", "Aseo y vigilancia"],
    ["513595", "Otros servicios"],
    ["511025", "Asesoría contable"],
  ]) {
    if (!conGastos.has(codigo)) await pedir("post", "/plan-cuentas", { codigo, nombre });
  }
}

function llamador(api: APIRequestContext, e: EmpresaLista) {
  return async (metodo: "get" | "post" | "put", ruta: string, datos?: unknown): Promise<unknown> => {
    const r = await api[metodo](`${API}${ruta}`, {
      headers: { Authorization: `Bearer ${e.token}` },
      ...(datos === undefined ? {} : { data: datos }),
    });
    expect(r.ok(), `${metodo.toUpperCase()} ${ruta}: ${await r.text()}`).toBeTruthy();
    const texto = await r.text();
    return texto === "" ? null : (JSON.parse(texto) as unknown);
  };
}

async function codigosDelPlan(api: APIRequestContext, e: EmpresaLista): Promise<Set<string>> {
  const r = await api.get(`${API}/plan-cuentas`, { headers: { Authorization: `Bearer ${e.token}` } });
  const plan = (await r.json()) as { codigo: string }[] | { datos: { codigo: string }[] };
  return new Set((Array.isArray(plan) ? plan : plan.datos).map((c) => c.codigo));
}

// ---------------------------------------------------------------------------
// Proveedores
// ---------------------------------------------------------------------------

export interface Proveedor {
  id: string;
  nombre: string;
}

export interface NuevoProveedor {
  tipoPersona: "NATURAL" | "JURIDICA";
  /** Por defecto NIT (jurídica) o CC (natural). */
  tipoDocumento?: "NIT" | "CC" | "NIT_EXTRANJERO";
  /** Jurídica: la razón social. Natural: «Nombre Apellido». */
  nombre: string;
  municipio?: string;
  regimen?: "ORDINARIO" | "SIMPLE";
  declarante?: boolean;
  responsableIva?: boolean;
  granContribuyente?: boolean;
  ciiu?: string;
  contratoDosOMasTrabajadores?: boolean;
}

/**
 * Un proveedor con su perfil tributario desde el 1 de enero: así la compra de
 * hoy se calcula con un perfil que ya regía, no con el automático del alta.
 */
export async function crearProveedor(
  api: APIRequestContext,
  e: EmpresaLista,
  p: NuevoProveedor,
): Promise<Proveedor> {
  const pedir = llamador(api, e);
  const sufijo = String(Date.now()).slice(-5);
  const nombre = `${p.nombre} ${sufijo}`;
  const tipoDocumento = p.tipoDocumento ?? (p.tipoPersona === "JURIDICA" ? "NIT" : "CC");

  const documento =
    tipoDocumento === "NIT"
      ? (() => {
          const { nit, dv } = nitDePrueba();
          return { numeroDocumento: nit, dv };
        })()
      : tipoDocumento === "CC"
        ? { numeroDocumento: String(10_000_000 + Math.floor(Math.random() * 89_999_999)) }
        : { numeroDocumento: `ES-B${Math.floor(Math.random() * 99_999_999)}` };

  const [primerNombre, ...apellidos] = nombre.split(" ");
  const t = (await pedir("post", "/terceros", {
    tipoPersona: p.tipoPersona,
    tipoDocumento,
    ...documento,
    ...(p.tipoPersona === "JURIDICA"
      ? { razonSocial: nombre }
      : { primerNombre, primerApellido: apellidos.join(" ") }),
    ...(p.municipio ? { municipioCodigo: p.municipio } : {}),
    esProveedor: true,
    responsableIva: p.responsableIva ?? false,
    regimenSimple: p.regimen === "SIMPLE",
    esGranContribuyente: p.granContribuyente ?? false,
  })) as { id: string; nombre?: string };

  await pedir("post", `/retenciones/terceros/${t.id}/perfil`, {
    regimenRenta: p.regimen ?? "ORDINARIO",
    declaranteRenta: p.declarante ?? true,
    esResponsableIva: p.responsableIva ?? false,
    esGranContribuyente: p.granContribuyente ?? false,
    esAutorretenedorRenta: false,
    ...(p.ciiu ? { ciiuPrincipal: p.ciiu } : {}),
    ...(p.tipoPersona === "NATURAL"
      ? { contratoDosOMasTrabajadores: p.contratoDosOMasTrabajadores ?? false }
      : {}),
    vigenciaDesde: PERFIL_DESDE,
  });

  return { id: t.id, nombre: t.nombre ?? nombre };
}

// ---------------------------------------------------------------------------
// La pantalla de compras
// ---------------------------------------------------------------------------

/** «$ 50.000», con el espacio que ponga el navegador, y sin confundirlo con «$ 50.000.000». */
export const pesos = (n: number): RegExp =>
  new RegExp(`\\$\\s*${n.toLocaleString("es-CO").replace(/\./g, "\\.")}(?![\\d]|\\.\\d)`);

/** Abre «Nueva compra» con el proveedor y un número de factura propio. */
export async function nuevaCompra(page: Page, proveedor: Proveedor): Promise<{ dialogo: Locator; numero: string }> {
  await page.goto("/dashboard/compras");
  await page.getByRole("button", { name: "Nueva compra" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nueva compra" });
  await expect(dialogo).toBeVisible();

  await dialogo.getByRole("button", { name: /Seleccione un proveedor/ }).click();
  await page.getByLabel("Buscar proveedor").fill(proveedor.nombre);
  await page.getByRole("button", { name: new RegExp(escapar(proveedor.nombre)) }).first().click();

  const numero = `FP-${Date.now().toString().slice(-7)}`;
  await dialogo.getByLabel("N.° factura proveedor").fill(numero);
  return { dialogo, numero };
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** El renglón N como producto del inventario. */
export async function lineaProducto(
  page: Page,
  dialogo: Locator,
  e: EmpresaLista,
  costo: number,
  n = 1,
) {
  await dialogo.getByRole("button", { name: /Seleccione un producto/ }).first().click();
  await page.getByLabel("Buscar producto").fill(e.producto.codigo);
  await page.getByRole("button", { name: new RegExp(e.producto.nombre) }).first().click();
  await dialogo.getByLabel(`Cantidad de la línea ${n}`).fill("1");
  await dialogo.getByLabel(`Costo unitario de la línea ${n}`).fill(String(costo));
}

/** El renglón 1 como gasto: cuenta, detalle y valor. */
export async function lineaGasto(
  page: Page,
  dialogo: Locator,
  cuenta: string,
  detalle: string,
  costo: number,
) {
  await dialogo.getByRole("button", { name: "Gasto", exact: true }).first().click();
  await dialogo.getByRole("button", { name: /Seleccione una cuenta auxiliar/ }).click();
  await page.getByLabel("Buscar cuenta").fill(cuenta);
  await page.getByRole("button", { name: new RegExp(`^${cuenta}`) }).first().click();
  await dialogo.getByLabel("Detalle de la línea 1").fill(detalle);
  // Cambiar el renglón a «Gasto» no le pone cantidad: se escribe.
  await dialogo.getByLabel("Cantidad de la línea 1").fill("1");
  await dialogo.getByLabel("Costo unitario de la línea 1").fill(String(costo));
}

/** La fila de una retención propuesta: «Compras generales · 2,5 % sobre … $ 50.000». */
export const filaRetencion = (dialogo: Locator, nombre: string | RegExp): Locator =>
  dialogo
    .getByRole("listitem")
    .filter({ has: dialogo.page().getByRole("button", { name: "¿Por qué?" }) })
    .filter({ hasText: nombre });

/** Acepta «La deduje» del renglón 1 («Sí, es …»). */
export async function aceptarDeducida(dialogo: Locator) {
  await dialogo.getByRole("button", { name: /^Sí, es / }).first().click();
}

/** Elige el concepto del renglón en el selector «¿Qué concepto es?» / «Es otro…». */
export async function elegirConcepto(page: Page, dialogo: Locator, nombre: string, renglon = 1) {
  await dialogo.getByRole("combobox", { name: `Concepto de retención, Renglón ${renglon}` }).click();
  await page.getByRole("option", { name: nombre, exact: true }).click();
}

/** A crédito y «Registrar compra»; espera a que el modal se cierre. */
export async function registrar(page: Page, dialogo: Locator) {
  await dialogo.getByRole("radio", { name: "Crédito" }).click();
  const boton = dialogo.getByRole("button", { name: "Registrar compra" });
  await expect(boton, `no deja registrar: ${await dialogo.locator("footer, [data-slot=dialog-footer]").first().innerText().catch(() => "")}`).toBeEnabled();
  await boton.click();
  await expect(dialogo).toBeHidden({ timeout: 20_000 });
}

/** Abre el asiento de la compra en Libro → Asientos → Ver. */
export async function abrirAsiento(page: Page, numeroFactura: string): Promise<Locator> {
  await page.goto("/dashboard/contabilidad");
  await page.getByRole("button", { name: "Asientos", exact: true }).click();
  const fila = page.getByRole("row").filter({ hasText: numeroFactura });
  await fila.getByRole("button", { name: "Ver" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Sumas iguales")).toBeVisible();
  return dialogo;
}

/** La línea del asiento cuya cuenta empieza por ese código. */
export const lineaAsiento = (asiento: Locator, prefijo: string): Locator =>
  asiento.getByRole("row").filter({ hasText: new RegExp(`^\\s*${prefijo}\\d*`) });

/** Débito y crédito de «Sumas iguales». */
export async function sumas(asiento: Locator): Promise<{ debito: string; credito: string }> {
  const celdas = asiento.getByRole("row").filter({ hasText: "Sumas iguales" }).getByRole("cell");
  return { debito: (await celdas.nth(1).innerText()).trim(), credito: (await celdas.nth(2).innerText()).trim() };
}

/** Libro → pestaña Retenciones. */
export async function irARetenciones(page: Page) {
  await page.goto("/dashboard/contabilidad");
  await page.getByRole("button", { name: "Retenciones", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tarifas de la ley" })).toBeVisible();
}

/** Terceros → buscar → Editar; devuelve el modal «Editar tercero». */
export async function editarTercero(page: Page, nombre: string): Promise<Locator> {
  await page.goto("/dashboard/terceros");
  await page.getByLabel("Buscar tercero").fill(nombre);
  await page.getByRole("row").filter({ hasText: nombre }).getByRole("button", { name: "Editar" }).click();
  const dialogo = page.getByRole("dialog", { name: "Editar tercero" });
  await expect(dialogo.getByRole("heading", { name: "Datos tributarios" })).toBeVisible();
  return dialogo;
}
