import type { Page } from "@playwright/test";

import { API } from "../fixtures/datos";
import { prepararEmpresa, type EmpresaLista } from "../fixtures/empresa";
import { entrarAlProducto } from "../fixtures/producto";
import { facturar } from "../fixtures/venta";
import { expect, test } from "../fixtures/consola";

/**
 * Revisión visual contra el diseño (pantallas complementarias): saca cada
 * pantalla como está en el ambiente, en claro y en oscuro, con el número de
 * su captura en el zip. No afirma nada del diseño: deja las capturas en
 * `e2e/.capturas/diseno/` para ponerlas al lado de las del zip.
 *
 * No corre con la suite: `E2E_DISENO=1 npx playwright test ... diseno.spec.ts`.
 */

const PANTALLAS: Array<{
  n: string;
  ruta: string;
  pestana?: string;
  /** Lo que se hace después de llegar: abrir un diálogo, elegir una opción. */
  luego?: (page: Page) => Promise<void>;
  movil?: boolean;
}> = [
  { n: "01-02-inicio", ruta: "/dashboard" },
  { n: "03-impuestos-calendario", ruta: "/dashboard/impuestos", pestana: "Calendario" },
  { n: "04-impuestos-retencion-350", ruta: "/dashboard/impuestos", pestana: "Retención (350)" },
  { n: "45-impuestos-iva-300", ruta: "/dashboard/impuestos", pestana: "IVA (300)" },
  { n: "46-impuestos-renta-110", ruta: "/dashboard/impuestos", pestana: "Renta (110)" },
  { n: "47-impuestos-ica", ruta: "/dashboard/impuestos", pestana: "ICA y ReteICA" },
  { n: "09-compras-nueva-compra", ruta: "/dashboard/compras/nueva" },
  {
    n: "10-compras-documento-soporte",
    ruta: "/dashboard/compras/nueva",
    luego: (p) => p.getByRole("radio", { name: /Documento soporte/ }).click(),
  },
  { n: "13-ventas-nueva-factura", ruta: "/dashboard/ventas/nueva" },
  { n: "15-configurar-impuestos", ruta: "/configuracion/impuestos" },
  { n: "17-cobros-recibos", ruta: "/dashboard/cobros", pestana: "Recibos de caja" },
  { n: "18-cobros-ingresos-sin-factura", ruta: "/dashboard/cobros", pestana: "Ingresos sin factura" },
  { n: "19-cobros-anticipos", ruta: "/dashboard/anticipos", pestana: "Anticipos" },
  { n: "20-cobros-saldos-a-favor", ruta: "/dashboard/cobros", pestana: "Saldos a favor" },
  { n: "58-pagos-por-pagar", ruta: "/dashboard/pagos", pestana: "Por pagar" },
  { n: "25-pagos-comprobantes", ruta: "/dashboard/pagos", pestana: "Comprobantes" },
  { n: "26-pagos-programados", ruta: "/dashboard/pagos", pestana: "Programados" },
  { n: "27-pagos-sin-factura", ruta: "/dashboard/pagos", pestana: "Sin factura" },
  { n: "28-pagos-anticipos", ruta: "/dashboard/pagos", pestana: "Anticipos" },
  { n: "33-caja", ruta: "/dashboard/caja-bancos", pestana: "Caja" },
  { n: "34-bancos", ruta: "/dashboard/caja-bancos", pestana: "Bancos" },
  { n: "35-movimientos", ruta: "/dashboard/caja-bancos", pestana: "Movimientos" },
  {
    n: "36-nuevo-traslado",
    ruta: "/dashboard/caja-bancos",
    pestana: "Traslados",
    luego: (p) => p.getByRole("button", { name: /Nuevo traslado/ }).first().click(),
  },
  { n: "41-balance", ruta: "/dashboard/estados-financieros", pestana: "Balance general" },
  { n: "42-flujo", ruta: "/dashboard/estados-financieros", pestana: "Flujo de caja" },
  { n: "52-comprobante-manual", ruta: "/dashboard/contabilidad/comprobante" },
  { n: "57-conceptos", ruta: "/dashboard/conceptos" },
  {
    n: "53-nuevo-concepto",
    ruta: "/dashboard/conceptos",
    luego: (p) => p.getByRole("button", { name: /Nuevo concepto/ }).click(),
  },
  { n: "66-movil-inicio", ruta: "/dashboard", movil: true },
  { n: "67-movil-por-pagar", ruta: "/dashboard/pagos", movil: true },
  {
    n: "68-movil-registrar-gasto",
    ruta: "/dashboard/gastos",
    movil: true,
    luego: (p) => p.getByRole("button", { name: "Registrar gasto" }).first().click(),
  },
];

test.describe("Revisión visual contra el diseño", () => {
  test.skip(!process.env.E2E_DISENO, "Solo con E2E_DISENO=1");
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(15 * 60_000);

  let e: EmpresaLista;

  test.beforeEach(async ({ request, page }) => {
    e = await prepararEmpresa(request, `e2e Distribuidora ${Date.now()}`);
    // Con datos, no vacía: una factura a crédito. Y el rol CONTADOR para el
    // comprobante manual.
    const sesion = (await request.post(`${API}/auth/login`, { data: e.acceso }).then((r) => r.json())) as {
      token: string;
    };
    const auth = { Authorization: `Bearer ${sesion.token}` };
    const usuarios = (await request.get(`${API}/usuarios`, { headers: auth }).then((r) => r.json())) as Array<{
      id: string;
      email: string;
    }>;
    const yo = usuarios.find((u) => u.email === e.acceso.email)!;
    await request.post(`${API}/usuarios/${yo.id}/roles`, {
      headers: auth,
      data: { empresaId: e.empresaId, rol: "CONTADOR" },
    });
    await entrarAlProducto(page, e);
    await facturar(page, e);
  });

  for (const tema of ["claro", "oscuro"] as const) {
    test(`todas las pantallas en ${tema}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema === "claro" ? "light" : "dark" });
      for (const p of PANTALLAS) {
        await test.step(p.n, async () => {
          await page.setViewportSize(p.movil ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
          await page.goto(p.ruta);
          await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
          if (p.pestana) await page.getByRole("button", { name: p.pestana, exact: true }).first().click();
          if (p.luego) await p.luego(page);
          await page.waitForLoadState("networkidle").catch(() => undefined);
          await page.waitForTimeout(400);
          await page.screenshot({ path: `e2e/.capturas/diseno/${p.n}-${tema}.png`, fullPage: !p.luego });
        });
      }
    });
  }
});
