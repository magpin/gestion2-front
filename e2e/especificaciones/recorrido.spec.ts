import type { Page } from "@playwright/test";

import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { expect, test } from "../fixtures/consola";

/**
 * El recorrido de todo el sistema: cada pantalla del área de trabajo y cada
 * una de sus pestañas, como la abriría el dueño de una empresa recién creada.
 *
 * No prueba reglas —esas viven en jest y vitest, y los recorridos de negocio
 * en las otras especificaciones—: prueba que nada se rompa al abrirlo. En cada
 * parada mira tres cosas:
 *   · que la pantalla cargó (su título),
 *   · que no hay un aviso de error en la página,
 *   · que el servidor no respondió con un 5xx a nada de lo que pidió.
 */

const PANTALLAS: Array<{ ruta: string; titulo: RegExp; pestanas?: string[] }> = [
  { ruta: "/dashboard", titulo: /^Inicio/ },
  { ruta: "/dashboard/asistente", titulo: /María/ },
  { ruta: "/dashboard/ventas", titulo: /^Ventas/, pestanas: ["Cotizaciones", "Facturas", "Notas crédito", "Notas débito"] },
  { ruta: "/dashboard/ventas/nueva", titulo: /Nueva factura de venta/ },
  {
    ruta: "/dashboard/cobros",
    titulo: /^Cobros/,
    pestanas: ["Por cobrar", "Recibos de caja", "Ingresos sin factura", "Anticipos", "Saldos a favor"],
  },
  { ruta: "/dashboard/compras", titulo: /^Compras/, pestanas: ["Facturas", "Notas crédito", "Notas débito"] },
  { ruta: "/dashboard/compras/nueva", titulo: /Nueva compra/ },
  { ruta: "/dashboard/gastos", titulo: /^Gastos/, pestanas: ["Del mes", "Recurrentes"] },
  {
    ruta: "/dashboard/pagos",
    titulo: /^Pagos/,
    pestanas: ["Por pagar", "Comprobantes", "Programados", "Sin factura", "Anticipos"],
  },
  { ruta: "/dashboard/caja-bancos", titulo: /Caja y bancos/, pestanas: ["Caja", "Bancos", "Movimientos", "Traslados"] },
  { ruta: "/dashboard/control", titulo: /Control/ },
  { ruta: "/dashboard/inventario", titulo: /Inventario/ },
  { ruta: "/dashboard/contabilidad", titulo: /Contabilidad/, pestanas: ["Asientos", "Períodos", "Libros", "Revisión"] },
  { ruta: "/dashboard/contabilidad/comprobante", titulo: /Comprobante manual/ },
  { ruta: "/dashboard/conceptos", titulo: /^Conceptos/ },
  {
    ruta: "/dashboard/impuestos",
    titulo: /^Impuestos/,
    pestanas: ["Calendario", "Retención (350)", "IVA (300)", "Renta (110)", "ICA y ReteICA", "Tarifas y terceros"],
  },
  { ruta: "/dashboard/plan-cuentas", titulo: /Plan de cuentas/ },
  { ruta: "/dashboard/terceros", titulo: /Terceros/ },
  {
    ruta: "/dashboard/estados-financieros",
    titulo: /Estados financieros/,
    pestanas: ["Balance general", "Estado de resultados", "Flujo de caja"],
  },
  { ruta: "/dashboard/reportes", titulo: /Reportes/ },
];

/** Lo que el servidor respondió con 5xx mientras la página estuvo abierta. */
function vigilarServidor(page: Page): string[] {
  const fallas: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && r.url().includes("/api/")) fallas.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return fallas;
}

/** La pantalla está sana: sin aviso de error ni «no se pudo». */
async function sinErrores(page: Page, donde: string) {
  // Que termine de pedir lo suyo antes de mirar.
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const alertas = page.getByRole("alert").filter({ hasText: /No se pudo|Error|error/ });
  expect(await alertas.count(), `${donde}: ${await alertas.allInnerTexts()}`).toBe(0);
  // El aviso de falla global (el que tapa la pantalla).
  await expect(page.getByRole("dialog").filter({ hasText: /Recargá la pantalla/ }), donde).toHaveCount(0);
}

test.describe("Recorrido de todo el sistema", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(8 * 60_000);

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request);
    await entrarAlProducto(page, e);
  });

  test("cada pantalla y cada pestaña abre sin errores", async ({ page }) => {
    const fallas = vigilarServidor(page);

    for (const p of PANTALLAS) {
      await test.step(p.ruta, async () => {
        await page.goto(p.ruta);
        await expect(page.getByRole("heading", { level: 1, name: p.titulo }), p.ruta).toBeVisible();
        await sinErrores(page, p.ruta);

        for (const nombre of p.pestanas ?? []) {
          await page.getByRole("button", { name: nombre, exact: true }).first().click();
          await sinErrores(page, `${p.ruta} › ${nombre}`);
        }
      });
    }

    expect(fallas, "respuestas 5xx del servidor").toEqual([]);
  });

  test("un concepto nuevo guarda sus sugerencias y aparece en la lista", async ({ page }) => {
    const fallas = vigilarServidor(page);
    const nombre = `Mantenimiento e2e ${Date.now().toString().slice(-5)}`;

    await page.goto("/dashboard/conceptos");
    await page.getByRole("button", { name: /Nuevo concepto/ }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Nombre").fill(nombre);
    await dialogo.getByLabel("Grupo").fill("Mantenimiento");
    await dialogo.getByRole("button", { name: /Seleccione una cuenta auxiliar/ }).click();
    await page.getByLabel("Buscar cuenta").fill("51");
    await page.getByRole("button", { name: /^51\d{4}/ }).first().click();
    await dialogo.getByLabel("IVA de la compra").selectOption("DESCONTABLE");
    await dialogo.getByText("Se le practica ReteICA").click();
    await expect(dialogo.getByText("Así se registra una compra con este concepto")).toBeVisible();
    await dialogo.getByRole("button", { name: "Crear concepto" }).click();
    await expect(dialogo).toBeHidden();

    await page.getByPlaceholder(/Buscar/).first().fill(nombre);
    await expect(page.getByText(nombre)).toBeVisible();
    await expect(page.getByText(/1 de \d+ conceptos/)).toBeVisible();
    expect(fallas).toEqual([]);
  });

  test("el plazo del proveedor propone el vence de la compra", async ({ page }) => {
    await page.goto("/dashboard/terceros");
    await page.getByRole("row", { name: /Distribuidora del Valle/ }).getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Te da plazo de").fill("45");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/dashboard/compras/nueva");
    await page.getByRole("button", { name: /Seleccione un proveedor/ }).click();
    await page.getByLabel("Buscar proveedor").fill("Distribuidora");
    await page.getByRole("button", { name: /Distribuidora del Valle/ }).first().click();
    await page.getByRole("radio", { name: "Crédito" }).click();
    await expect(page.getByText(/te da 45 días/)).toBeVisible();
  });
});
