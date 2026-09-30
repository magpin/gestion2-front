import type { APIRequestContext, Page } from "@playwright/test";

import { API, mirar, nitDePrueba } from "../fixtures/datos";
import { hoyCol, prepararEmpresa } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { Consola, esperarAviso, expect, test } from "../fixtures/consola";

/**
 * El motor de retenciones en una empresa nueva, contra QA (guion
 * `docs/planes/prueba-qa-motor-retenciones.md`, §1 «Empresa nueva» y
 * «Empresa que ya existía»; paso 5 del resumen).
 *
 * La cuenta se crea por la consola (API); la empresa se crea y se configura
 * **por la pantalla**, a mano, como lo haría el dueño. «Empezar con IA» no se
 * prueba acá.
 *
 * Si la app hace otra cosa, la prueba falla diciendo qué vio: no se ajusta.
 */

const PASOS = ["Empresa", "Sedes", "Situación legal", "Impuestos", "Plan de cuentas", "Resoluciones"];

const PREGUNTAS_DIAN = [
  "¿Tu empresa cobra IVA en lo que vende?",
  "¿Está en el Régimen Simple de Tributación?",
  "¿La DIAN la calificó como gran contribuyente?",
  "¿Es agente de retención en la fuente?",
  "¿Es autorretenedora?",
];

const CUENTAS_RETENCION = ["2365", "2368", "236575", "135515", "135517"];

/**
 * La 2367 (IVA retenido) no va por defecto: la empresa de la prueba no es
 * agente de IVA ni gran contribuyente. Se crea sola (236705) el día que una
 * compra trae ReteIVA sin cuenta, p. ej. un servicio del exterior (bug #17).
 */
const CUENTAS_QUE_NO = ["2367"];

/** El pie del asistente: «Omitir» o «Continuar», según el paso esté listo. */
const pie = (page: Page) => page.locator("footer");

/** Contesta Sí/No en un grupo segmentado y espera a que quede marcado. */
async function contestar(page: Page, grupo: string | RegExp, valor: "Sí" | "No") {
  const g = page.getByRole("group", { name: grupo });
  const boton = g.getByRole("button", { name: valor, exact: true });
  await expect(boton).toBeEnabled({ timeout: 20_000 });
  if ((await boton.getAttribute("aria-pressed")) === "true") return;
  await boton.click();
  await expect(boton, `la respuesta «${valor}» a «${String(grupo)}» tiene que quedar marcada`).toHaveAttribute(
    "aria-pressed",
    "true",
    { timeout: 20_000 },
  );
}

async function elegirMunicipio(page: Page, campo: string, buscar: string, codigo: string) {
  await page.locator(`#${campo}`).click();
  await page.getByLabel("Buscar municipio").fill(buscar);
  const opcion = page.getByRole("dialog").getByRole("button").filter({ hasText: codigo });
  await expect(opcion.first()).toBeVisible({ timeout: 20_000 });
  await opcion.first().click();
}

/** Token con la empresa elegida, para leer lo que la pantalla no muestra fácil. */
async function tokenDeEmpresa(
  api: APIRequestContext,
  acceso: { email: string; password: string },
  razonSocial: string,
): Promise<string> {
  const r = await api.post(`${API}/auth/login`, {
    data: { email: acceso.email, password: acceso.password },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  const s = (await r.json()) as { token: string; empresas: { id: string; razonSocial?: string }[] };
  const empresa = s.empresas.find((e) => e.razonSocial === razonSocial) ?? s.empresas[0];
  expect(empresa, "el administrador tiene que ver la empresa que acaba de crear").toBeDefined();
  const e = await api.post(`${API}/auth/empresa`, {
    headers: { Authorization: `Bearer ${s.token}` },
    data: { empresaId: empresa.id },
  });
  expect(e.ok(), await e.text()).toBeTruthy();
  return ((await e.json()) as { token: string }).token;
}

test.describe("Motor de retenciones: empresa nueva", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // -------------------------------------------------------------------------
  // Empresa nueva, a mano, los seis pasos por la pantalla
  // -------------------------------------------------------------------------

  test("@paso5 1. Empresa nueva a mano: seis pasos, Impuestos en lenguaje simple y cuentas de retención creadas solas", async ({
    page,
    request,
  }) => {
    test.setTimeout(300_000);
    const sello = Date.now();
    const consola = await Consola.entrar(request);
    const cuenta = await consola.crearCuenta(`e2e Empresa nueva ${sello}`, "EMPRESARIAL");
    const razonSocial = `e2e Empresa nueva ${sello}`;

    await test.step("Entrar sin empresas lleva a «Bienvenido · Configuración inicial»", async () => {
      await page.goto("/login");
      await page.getByLabel("Correo electrónico").fill(cuenta.email);
      await page.getByLabel("Contraseña", { exact: true }).fill(cuenta.password);
      await page.getByRole("button", { name: "Ingresar" }).click();
      await expect(page).toHaveURL(/\/configuracion\/empresa-nueva/, { timeout: 20_000 });
      await expect(page.getByText("Bienvenido · Configuración inicial")).toBeVisible();
      await expect(page.getByText(/Son seis pasos/)).toBeVisible();
      await mirar(page, 2);
    });

    await test.step("Configurar a mano → datos de la empresa → Crear y seguir", async () => {
      await page.getByRole("button", { name: /Configurar a mano/ }).click();
      await expect(page.getByText("A mano · Paso 01 · Empresa")).toBeVisible();

      // El riel ya muestra los seis pasos, con Impuestos en el cuarto lugar.
      const riel = page.getByRole("list", { name: "Pasos de la configuración" }).getByRole("listitem");
      await expect(riel, "el asistente tiene que tener 6 pasos").toHaveCount(6);
      for (const [i, nombre] of PASOS.entries()) {
        await expect(riel.nth(i)).toContainText(nombre);
      }

      await page.locator("#tipoPersona").click();
      await page.getByRole("option", { name: "Jurídica" }).click();
      await page.getByLabel("Razón social").fill(razonSocial);
      const { nit, dv } = nitDePrueba();
      await page.getByLabel("NIT", { exact: true }).fill(nit);
      await expect(page.getByLabel("DV"), "el DV se calcula solo").toHaveValue(dv);
      await page.getByRole("button", { name: /Comercio/ }).click();
      await page.locator("#formaAsociativa").click();
      const sas = page.getByRole("option", { name: /simplificada/i });
      if ((await sas.count()) > 0) await sas.first().click();
      else await page.getByRole("option").first().click();
      await page.locator("#grupoNiif").click();
      await page.getByRole("option", { name: "Grupo 2 · NIIF para pymes" }).click();
      await page.getByLabel("Inicio de operaciones").fill("2026-01-01");
      await mirar(page, 2);
      await page.getByRole("button", { name: /^Crear y seguir$/ }).click();

      await expect(page, "al crearla sigue con el paso 2, Sedes").toHaveURL(/\/configuracion\/sedes/, {
        timeout: 30_000,
      });
      await expect(page.getByText("Paso 2 de 6")).toBeVisible();
      const riel2 = page.getByRole("list", { name: "Pasos de la configuración" }).getByRole("listitem");
      await expect(riel2).toHaveCount(6);
      for (const [i, nombre] of PASOS.entries()) {
        await expect(riel2.nth(i)).toContainText(nombre);
      }
    });

    await test.step("Sedes: la principal en Medellín", async () => {
      await page.getByLabel("Nombre", { exact: true }).fill("Principal");
      await page.getByLabel("Dirección").fill("Cra. 43A #18-95");
      await elegirMunicipio(page, "municipioCodigo", "medellin", "05001");
      await page.getByRole("button", { name: "Agregar sede" }).click();
      await esperarAviso(page, /Sede registrada/);
      await expect(pie(page).getByRole("button", { name: "Continuar" })).toBeVisible();
      await pie(page).getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(/\/configuracion\/situacion_legal/);
    });

    await test.step("Situación legal: representante y actividad", async () => {
      await page.getByLabel("Nombre completo").fill("Luisa Peña Gómez");
      await page.getByLabel("Documento", { exact: true }).fill("43118077");
      await page.getByLabel("Cargo").fill("Gerente general");
      await page.getByRole("button", { name: "Registrar", exact: true }).click();
      await esperarAviso(page, /Representante registrado/);

      await page.locator("#ciiu").click();
      await page.getByLabel("Buscar actividad económica").fill("4530");
      const ciiu = page.getByRole("dialog").getByRole("button").filter({ hasText: "4530" });
      await expect(ciiu.first()).toBeVisible({ timeout: 20_000 });
      await ciiu.first().click();
      await elegirMunicipio(page, "ciiuMunicipio", "medellin", "05001");
      await page.getByRole("button", { name: "Agregar", exact: true }).click();
      await esperarAviso(page, /Actividad registrada/);

      // No pregunta lo tributario: eso es del paso «Impuestos».
      await expect(page.getByText(/Régimen tributario|Responsabilidades del RUT/)).toHaveCount(0);
      await expect(pie(page).getByRole("button", { name: "Continuar" })).toBeVisible();
      await pie(page).getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(/\/configuracion\/impuestos/);
    });

    await test.step("Impuestos: Sí/No en lenguaje simple, ICA por municipio, «Todo correcto»", async () => {
      await expect(page.getByRole("heading", { name: "Impuestos", level: 1 })).toBeVisible();
      await expect(page.getByText("Paso 4 de 6")).toBeVisible();
      await expect(page.getByText("Tu empresa ante la DIAN")).toBeVisible();

      // Las preguntas, en palabras de persona; ni una sigla de la casilla 53.
      for (const p of PREGUNTAS_DIAN) {
        await expect(page.getByRole("group", { name: p })).toBeVisible();
      }
      // Lo que se deduce no se pregunta: el agente de IVA se dice, no se contesta.
      await expect(
        page.getByRole("group", { name: /retención de IVA|agente de IVA|numeral/i }),
        "no debe haber una pregunta para ser agente de IVA ni por el numeral",
      ).toHaveCount(0);
      await expect(page.getByText(/Agente de retención de IVA:/)).toBeVisible();

      await contestar(page, PREGUNTAS_DIAN[0], "Sí");
      // Los «No» quedan marcados apenas se tocan, sin esperar a «Todo
      // correcto» (bug #18); y después de confirmar se vuelven a mirar.
      await contestar(page, PREGUNTAS_DIAN[1], "No");
      await contestar(page, PREGUNTAS_DIAN[2], "No");
      await contestar(page, PREGUNTAS_DIAN[3], "Sí");
      await contestar(page, PREGUNTAS_DIAN[4], "No");

      // El ICA, una fila por municipio con sede: aquí solo Medellín.
      await expect(page.getByText("ICA en tus municipios")).toBeVisible();
      await expect(page.getByRole("group", { name: /Agente retenedor de ICA en/ })).toHaveCount(1);
      await contestar(page, "Agente retenedor de ICA en Medellín", "Sí");
      await contestar(page, "Autorretenedor de ICA en Medellín", "No");
      await page.getByLabel("Tarifa de ICA en Medellín, por mil").fill("4.14");
      await page.getByRole("button", { name: "Guardar tarifa" }).click();
      await esperarAviso(page, /ICA de Medellín guardado/);

      // «Lo que esto significa para vos».
      await expect(page.getByRole("heading", { name: "Lo que esto significa para vos" })).toBeVisible();
      await expect(page.getByText("Vas a retener", { exact: true })).toBeVisible();
      await expect(page.getByText("Te van a retener", { exact: true })).toBeVisible();
      await expect(page.getByText(/Retención en la fuente a tus proveedores/)).toBeVisible();
      await expect(page.getByText("ReteICA en Medellín.")).toBeVisible();
      await expect(page.getByText("ReteIVA, tus clientes que sean agentes de IVA.")).toBeVisible();
      await mirar(
        page,
        [
          ...PREGUNTAS_DIAN.map((p) => page.getByRole("group", { name: p })),
          page.getByText(/Agente de retención de IVA:/),
          page.getByRole("group", { name: "Agente retenedor de ICA en Medellín" }),
          page.getByRole("heading", { name: "Lo que esto significa para vos" }),
          page.getByText(/Retención en la fuente a tus proveedores/),
        ],
        16,
      );

      await page.getByRole("button", { name: "Todo correcto" }).click();
      await esperarAviso(page, /quedó confirmado/);
      await expect(page.getByText(/Lo confirmaste el/)).toBeVisible();
      // Confirmado, los «No» ya tienen que quedar marcados.
      for (const i of [1, 2, 4]) {
        await expect(
          page.getByRole("group", { name: PREGUNTAS_DIAN[i] }).getByRole("button", { name: "No", exact: true }),
          `tras «Todo correcto», «${PREGUNTAS_DIAN[i]}» tiene que quedar en No`,
        ).toHaveAttribute("aria-pressed", "true");
      }
      await mirar(
        page,
        [page.getByText(/Lo confirmaste el/), ...[1, 2, 4].map((i) => page.getByRole("group", { name: PREGUNTAS_DIAN[i] }))],
        6,
      );
      await expect(pie(page).getByRole("button", { name: "Continuar" })).toBeVisible();
      await pie(page).getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(/\/configuracion\/plan_cuentas/);
    });

    await test.step("Plan de cuentas: crear lo propuesto sin tocar nada", async () => {
      const crear = pie(page).getByRole("button", { name: /^Crear \d+ cuentas? y continuar/ });
      await expect(crear).toBeVisible({ timeout: 30_000 });
      await mirar(page, crear, 3);
      await crear.click();
      await expect(page).toHaveURL(/\/configuracion\/resoluciones/, { timeout: 60_000 });
    });

    await test.step("Resoluciones: una de factura de venta vigente", async () => {
      const anio = Number(hoyCol().slice(0, 4));
      await page.getByLabel("Número de resolución").fill("18764000001234");
      await page.getByLabel("Prefijo").fill("FE");
      await page.getByLabel("Vigente desde").fill(`${anio}-01-15`);
      await page.getByLabel("Vigente hasta").fill(`${anio + 1}-12-31`);
      await page.getByLabel("Fecha de la resolución").fill(`${anio}-01-15`);
      await page.getByRole("button", { name: "Registrar resolución" }).click();
      await esperarAviso(page, /Resolución registrada/);
      await expect(pie(page).getByRole("button", { name: "Continuar" })).toBeVisible();
      await pie(page).getByRole("button", { name: "Continuar" }).click();
      await expect(page).not.toHaveURL(/\/configuracion\/resoluciones/, { timeout: 20_000 });
    });

    const token = await tokenDeEmpresa(request, cuenta, razonSocial);

    await test.step("Los seis pasos quedaron listos", async () => {
      const r = await request.get(`${API}/empresas/actual/estado-configuracion`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(r.ok()).toBeTruthy();
      const estado = (await r.json()) as {
        completa: boolean;
        pasos: { clave: string; estado: string }[];
      };
      expect(estado.pasos.map((p) => p.clave)).toEqual([
        "EMPRESA",
        "SEDES",
        "SITUACION_LEGAL",
        "IMPUESTOS",
        "PLAN_CUENTAS",
        "RESOLUCIONES",
      ]);
      expect(
        estado.completa,
        `pasos sin terminar: ${estado.pasos.filter((p) => p.estado !== "LISTO").map((p) => p.clave).join(", ")}`,
      ).toBe(true);
    });

    await test.step("Plan de cuentas: existen 2365, 2368, 236575, 135515 y 135517; la 2367 no", async () => {
      // Por la API: la fuente de verdad.
      const r = await request.get(`${API}/plan-cuentas`, { headers: { Authorization: `Bearer ${token}` } });
      expect(r.ok()).toBeTruthy();
      const cuerpo = (await r.json()) as { codigo: string }[] | { datos: { codigo: string }[] };
      const codigos = (Array.isArray(cuerpo) ? cuerpo : cuerpo.datos).map((c) => c.codigo);
      // Las de cuatro dígitos (2365, 2367, 2368) son cuentas de grupo: el plan
      // de la empresa guarda sus auxiliares (236540, 236805…), no el grupo. Se
      // da por existente la familia si hay al menos una cuenta que empiece así.
      const existe = (c: string) => codigos.some((x) => (c.length === 4 ? x.startsWith(c) : x === c));
      const deRetencion = codigos.filter((c) => /^(2365|2367|2368|1355)/.test(c)).join(", ");
      const faltanApi = CUENTAS_RETENCION.filter((c) => !existe(c));
      expect(faltanApi, `GET /plan-cuentas no trae: ${faltanApi.join(", ")} (de retención hay ${deRetencion})`).toEqual(
        [],
      );
      // Ni agente de IVA ni gran contribuyente: la 2367 no se crea por defecto.
      const sobranApi = CUENTAS_QUE_NO.filter(existe);
      expect(
        sobranApi,
        `la empresa no es agente de IVA ni gran contribuyente: no debería tener ${sobranApi.join(", ")} (de retención hay ${deRetencion})`,
      ).toEqual([]);

      // Y por la pantalla del plan de cuentas, buscando cada una.
      await page.goto("/dashboard/plan-cuentas");
      await expect(page.getByRole("heading", { name: "Plan de cuentas", level: 1 })).toBeVisible();
      const buscar = page.getByRole("textbox", { name: "Buscar cuenta", exact: true });
      for (const codigo of CUENTAS_RETENCION) {
        await buscar.fill(codigo);
        const patron = codigo.length === 4 ? new RegExp(`^${codigo}\\d*$`) : new RegExp(`^${codigo}$`);
        await expect
          .soft(page.getByText(patron).first(), `la cuenta ${codigo} tiene que verse en la pantalla del plan`)
          .toBeVisible({ timeout: 5_000 });
        // En el video: el buscador con el código y la cuenta que encontró.
        await mirar(page, [buscar, page.getByText(patron).first()], 4);
      }
      await buscar.fill("");
      await mirar(page, 2);
    });
  });

  // -------------------------------------------------------------------------
  // Empresa que ya existía
  // -------------------------------------------------------------------------

  test("@paso5 2. Empresa que ya existía: no vuelve a pedir Impuestos; una sede sin ICA lo deja pendiente y el Inicio lo dice", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    const e = await prepararEmpresa(request, `e2e Empresa existente ${Date.now()}`);
    const cab = { Authorization: `Bearer ${e.token}` };

    await test.step("El Inicio no pide Impuestos", async () => {
      await entrarAlProducto(page, e);
      // Con la configuración completa, Inicio es el tablero de la plata cuando
      // está prendido (menú nuevo, D3); si no, la lista de pasos, toda lista.
      const configuracion = page.getByRole("heading", { name: "Configuración", level: 1 });
      const tablero = page.getByRole("heading", { name: /^Inicio/, level: 1 });
      await expect(configuracion.or(tablero)).toBeVisible();
      if (await configuracion.isVisible()) {
        const fila = page.getByRole("link").filter({ hasText: /^Impuestos/ });
        await expect(fila).toContainText("Listo");
        await expect(page.getByText("6 de 6")).toBeVisible();
        // Nada que continuar.
        await expect(page.getByRole("link", { name: /^Continuar/ })).toHaveCount(0);
        await mirar(page, [fila, page.getByText("6 de 6")], 4);
      } else {
        // El tablero solo sale con los seis pasos listos: no pide nada.
        await expect(page.getByRole("link", { name: /^Continuar/ })).toHaveCount(0);
      }

      // Entrar al paso muestra lo ya confirmado, no preguntas en blanco.
      await page.goto("/configuracion/impuestos");
      await expect(page.getByText(/Lo confirmaste el/)).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("group", { name: PREGUNTAS_DIAN[0] }).getByRole("button", { name: "Sí", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      // Lo ya confirmado: la fecha y cada respuesta, con tiempo para leerlas.
      await mirar(
        page,
        [page.getByText(/Lo confirmaste el/), ...PREGUNTAS_DIAN.map((p) => page.getByRole("group", { name: p }))],
        14,
      );
    });

    await test.step("Una sede nueva en Bogotá, sin ICA: Impuestos queda pendiente y se entra a completarlo", async () => {
      // Sin tocar la base: abrir una sede en otro municipio deja ese municipio sin ICA.
      const r = await request.post(`${API}/empresas/actual/sedes`, {
        headers: cab,
        data: {
          codigo: "002",
          nombre: "Bogotá",
          direccion: "Cl. 26 #68-35",
          municipioCodigo: "11001",
          esPrincipal: false,
        },
      });
      expect(r.ok(), await r.text()).toBeTruthy();

      // Con la configuración a medias no se opera (decisión del dueño,
      // 30-09): entrar al área de trabajo lleva directo al paso que falta.
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/configuracion\/impuestos$/);
      // El plan de cuentas ya estaba hecho: el ICA pendiente no lo bloquea
      // (bug #23).
      await expect(page.getByText(/Bloqueado · Requiere impuestos|Requiere impuestos/)).toHaveCount(0);
      await mirar(page, [page.getByRole("heading", { level: 1 })], 8);
    });
  });
});
