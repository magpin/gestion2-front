import { mirar } from "../fixtures/datos";
import { hoyCol } from "../fixtures/empresa";
import {
  abrirAsiento,
  abrirConsola,
  anularCompra,
  apiAdmin,
  apiEmpresa,
  correrDias,
  entrarComoEmpresa,
  idCompra,
  leer350,
  pesos,
  prepararEmpresaMotor,
  registrarCompra,
} from "../fixtures/motor-ventas";
import { expect, test } from "../fixtures/consola";

/**
 * Motor de retenciones en QA — recálculo por cambio de norma (guion §9).
 *
 * **Toca la ley global de QA**: carga una vigencia de prueba de «Compras
 * generales · declarante» al 3,5 % desde la fecha de la compra y, en cuanto
 * termina de recalcular, carga otra que devuelve la tarifa real (2,5 % desde
 * 10 UVT, con la misma norma). La restitución va también en `finally`.
 *
 * Una vigencia no se reescribe ni se borra: queda en la historia un día de
 * prueba al 3,5 % (la fecha de la compra, un día **pasado**) y desde el día
 * siguiente la tarifa real otra vez. Por eso la fecha se elige en el pasado y
 * la prueba solo puede correr una vez por fecha: si ya no hay un día libre,
 * se salta y lo dice.
 *
 * Los recálculos van por la API **con el id de la empresa de prueba**: el
 * botón de la consola recalcula todas las empresas activas de QA (incluida
 * COMPUTINTAS), y eso no se toca. Lo que la consola muestra de cada corrida sí
 * se verifica en pantalla.
 */

interface TarifaLey {
  tipoPersona: string | null;
  declarante: boolean | null;
  baseUvt: number | string;
  tarifa: number | string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  norma: string;
  validadoPor: string;
  validadoEn: string;
}

const CONCEPTO = "COMPRAS_GENERALES";
const NORMA_PRUEBA = "PRUEBA e2e QA — vigencia de prueba 3,5 % para el recálculo (guion §9); no es ley";

/** Las vigencias de «Compras generales», fila declarante / las dos personas. */
async function filaLey(pedir: Awaited<ReturnType<typeof apiAdmin>>): Promise<TarifaLey[]> {
  const { cuerpo } = await pedir<{ conceptos: { codigo: string; tarifas: TarifaLey[] }[] }>(
    "get",
    "/plataforma/retenciones",
  );
  const c = cuerpo.conceptos.find((x) => x.codigo === CONCEPTO);
  expect(c, "existe el concepto de compras generales").toBeDefined();
  return c!.tarifas.filter((t) => t.tipoPersona === null && t.declarante === true);
}

const vigenteEn = (filas: TarifaLey[], fecha: string) =>
  filas.find((t) => t.vigenciaDesde <= fecha && (t.vigenciaHasta === null || t.vigenciaHasta >= fecha));

/** El domingo más reciente antes de hoy y después de `despuesDe`, o el día siguiente a `despuesDe`. */
function fechaDePrueba(despuesDe: string, hoy: string): string | null {
  if (process.env.E2E_RECALCULO_FECHA) return process.env.E2E_RECALCULO_FECHA;
  for (let d = correrDias(hoy, -1); d > despuesDe; d = correrDias(d, -1)) {
    if (new Date(`${d}T12:00:00Z`).getUTCDay() === 0) return d;
  }
  const siguiente = correrDias(despuesDe, 1);
  return siguiente < hoy ? siguiente : null;
}

test.describe("Motor de retenciones · recálculo por cambio de norma", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ timeout: 420_000 });

  test("@paso12 §9 compra 2,5 % → recalcular igual = 0 → vigencia 3,5 % → $40.000 → ajuste CD → $140.000 → anular anula el ajuste", async ({
    page,
    request,
    browser,
  }) => {
    const admin = await apiAdmin(request);
    const hoy = hoyCol();

    // La ley como está: la fila que se va a tocar tiene que ser la real.
    const antes = await filaLey(admin);
    const real = antes.find((t) => t.vigenciaHasta === null);
    expect(real, "hay una vigencia abierta de compras generales (declarante)").toBeDefined();
    expect(Number(real!.tarifa)).toBe(0.025);
    expect(Number(real!.baseUvt)).toBe(10);
    const ultimoInicio = antes.map((t) => t.vigenciaDesde).sort().at(-1)!;
    const fecha = fechaDePrueba(ultimoInicio, hoy);
    test.skip(
      fecha === null || fecha.slice(0, 7) !== hoy.slice(0, 7),
      `No queda un día pasado de este mes después del ${ultimoInicio} para la vigencia de prueba: la ley no se reescribe.`,
    );
    const dia = fecha!;
    const diaSiguiente = correrDias(dia, 1);
    console.log(`[recálculo] fecha de la compra y de la vigencia de prueba: ${dia}; restitución desde ${diaSiguiente}`);

    const e = await prepararEmpresaMotor(request, "Recalculo", { agenteRenta: true });
    const pedir = apiEmpresa(request, e);
    await entrarComoEmpresa(page, e);

    // 1. Compra de bienes por el motor: 2,5 % sobre $4.000.000 = $100.000.
    const compra = `FP-${Date.now().toString().slice(-6)}`;
    await registrarCompra(page, e, { numero: compra, cantidad: 1, costo: 4_000_000, fecha: dia, retenido: 100_000 });
    expect(pesos((await leer350(page)).renta)).toBe(100_000);
    const compraId = await idCompra(request, e, compra);
    const { cuerpo: compraAntes } = await pedir<{ asiento_id: string }>("get", `/compras/${compraId}`);
    const { cuerpo: asientoAntes } = await pedir<{ lineas: unknown[]; total_debito: string }>(
      "get",
      `/asientos/${compraAntes.asiento_id}`,
    );

    const recalcular = async (motivo: string) => {
      const { cuerpo } = await admin<{ id: string; documentos: number; diferencias: number; conError: number }>(
        "post",
        "/plataforma/retenciones/recalcular",
        { desde: dia, hasta: dia, empresaId: e.empresaId, motivo },
      );
      console.log(`[recálculo] ${motivo}: ${JSON.stringify(cuerpo).slice(0, 300)}`);
      return cuerpo;
    };

    // 2. Recalcular con la ley igual: cero diferencias.
    const igual = await recalcular("Prueba e2e — ley igual (guion §9)");
    expect(igual.conError).toBe(0);
    expect(igual.documentos).toBeGreaterThanOrEqual(1);
    expect(igual.diferencias, "con la ley igual no cambia nada").toBe(0);

    const consola = await abrirConsola(browser);
    const filaCorrida = (motivo: string) =>
      consola.getByRole("row").filter({ hasText: motivo }).filter({ hasText: e.razonSocial }).first();
    await expect(filaCorrida("ley igual")).toBeVisible();
    await filaCorrida("ley igual").getByRole("button", { name: "Ver" }).click();
    await expect(consola.getByText("Ninguna compra cambió con la norma nueva.")).toBeVisible();
    await mirar(consola);

    // 3. Vigencia de prueba al 3,5 % desde la fecha de la compra, por la consola.
    let restituida = false;
    const restituir = async () => {
      if (restituida) return;
      const ahora = await filaLey(admin);
      const abierta = ahora.find((t) => t.vigenciaHasta === null);
      if (abierta && Number(abierta.tarifa) === 0.025 && abierta.norma === real!.norma) {
        restituida = true;
        return;
      }
      await admin("post", "/plataforma/retenciones/tarifas", {
        conceptoCodigo: CONCEPTO,
        declarante: true,
        baseUvt: Number(real!.baseUvt),
        tarifaPorcentaje: 2.5,
        vigenciaDesde: diaSiguiente,
        norma: real!.norma,
        observacion: `Restituye la tarifa real tras la vigencia de prueba e2e del ${dia}.`,
        validadoPor: real!.validadoPor,
        validadoEn: real!.validadoEn,
      });
      restituida = true;
    };

    try {
      await consola.getByRole("button", { name: "Nueva vigencia" }).click();
      const modal = consola.getByRole("dialog");
      await expect(modal.getByText("Nueva vigencia de tarifa")).toBeVisible();
      await modal.getByLabel("Concepto").selectOption({ label: "Compras generales" });
      await modal.getByLabel("Tipo de persona").selectOption({ label: "Las dos" });
      await modal.getByLabel("Declarante de renta").selectOption({ label: "Declarante" });
      await modal.getByLabel("Tarifa (%)").fill("3.5");
      await modal.getByLabel("Base mínima (UVT)").fill("10");
      await modal.getByLabel("Rige desde").fill(dia);
      await modal.getByLabel("Norma").fill(NORMA_PRUEBA);
      await modal.getByLabel("Validó (contador)").fill("Prueba e2e");
      await mirar(consola, 2);
      if (process.env.E2E_RECALCULO_REAL !== "1") {
        // Ensayo: sin E2E_RECALCULO_REAL=1 no se toca la ley global.
        await modal.getByRole("button", { name: "Cancelar" }).click();
        restituida = true;
        console.log("[recálculo] ensayo: no se cargó la vigencia de prueba (falta E2E_RECALCULO_REAL=1)");
        return;
      }
      await modal.getByRole("button", { name: "Cargar vigencia" }).click();
      await expect(modal).toBeHidden();

      // 4. Recalcular: $40.000 de diferencia. Otra vez: no se duplica.
      const nueva = await recalcular("Prueba e2e — vigencia 3,5 % (guion §9)");
      expect(nueva.diferencias).toBe(1);
      const otra = await recalcular("Prueba e2e — vigencia 3,5 % otra vez (guion §9)");
      expect(otra.diferencias).toBe(1);

      // 5. Devolver la ley real en cuanto se recalculó, por la consola.
      await consola.reload();
      await consola.getByRole("button", { name: "Nueva vigencia" }).click();
      await expect(modal.getByText("Nueva vigencia de tarifa")).toBeVisible();
      await modal.getByLabel("Concepto").selectOption({ label: "Compras generales" });
      await modal.getByLabel("Tipo de persona").selectOption({ label: "Las dos" });
      await modal.getByLabel("Declarante de renta").selectOption({ label: "Declarante" });
      await modal.getByLabel("Tarifa (%)").fill("2.5");
      await modal.getByLabel("Base mínima (UVT)").fill(String(Number(real!.baseUvt)));
      await modal.getByLabel("Rige desde").fill(diaSiguiente);
      await modal.getByLabel("Norma").fill(real!.norma);
      await modal
        .getByLabel("Observación (opcional)")
        .fill(`Restituye la tarifa real tras la vigencia de prueba e2e del ${dia}.`);
      await modal.getByLabel("Validó (contador)").fill(real!.validadoPor);
      await modal.getByLabel("Validó el").fill(real!.validadoEn);
      await modal.getByRole("button", { name: "Cargar vigencia" }).click();
      await expect(modal).toBeHidden();
      restituida = true;

      // Lo que la consola muestra de la corrida: la diferencia de $40.000.
      await consola.reload();
      await filaCorrida("3,5 % otra vez").getByRole("button", { name: "Ver" }).click();
      await expect(consola.getByRole("row").filter({ hasText: compra }).first()).toContainText("40.000");
      await mirar(consola);
    } finally {
      await restituir();
      // Verificar que quedó: hoy y en adelante, la tarifa real con su norma.
      const despues = await filaLey(admin);
      const abierta = despues.find((t) => t.vigenciaHasta === null);
      console.log(
        `[limpieza] compras generales (declarante): ${despues
          .filter((t) => t.vigenciaDesde >= dia)
          .map((t) => `${t.vigenciaDesde}→${t.vigenciaHasta ?? "abierta"} ${Number(t.tarifa) * 100}% ${t.baseUvt} UVT «${t.norma}»`)
          .join(" | ")}`,
      );
      expect(abierta, "queda una vigencia abierta").toBeDefined();
      expect(Number(abierta!.tarifa)).toBe(0.025);
      expect(Number(abierta!.baseUvt)).toBe(Number(real!.baseUvt));
      expect(abierta!.norma).toBe(real!.norma);
      expect(Number(vigenteEn(despues, hoy)?.tarifa)).toBe(0.025);
    }
    await consola.context().close();

    // 6. En la empresa: Libro → Retenciones → Diferencias por cambio de norma.
    await page.goto("/dashboard/contabilidad");
    await page.getByRole("button", { name: "Retenciones", exact: true }).click();
    const bloque = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Diferencias por cambio de norma" }),
    });
    await expect(bloque).toBeVisible();
    await expect(bloque).toContainText("1 por revisar.");
    const pendiente = bloque.getByRole("listitem").filter({ hasText: "Pendiente" }).first();
    await expect(pendiente).toContainText(/\+\$\s?40\.000/);
    await pendiente.getByRole("button", { name: "Ver ajuste" }).click();
    await expect(pendiente.getByRole("row").filter({ hasText: "2365" }).first()).toContainText("40.000");
    await mirar(page);
    await pendiente.getByRole("button", { name: "Registrar ajuste" }).click();
    await expect(page.locator(".swal2-container")).toContainText(/Ajuste registrado: CD/);
    await expect(bloque).toContainText("Nada pendiente.");
    await expect(bloque.getByRole("listitem").filter({ hasText: "Ajustada" }).first()).toContainText(/CD/);
    await mirar(page);

    // Aprobar el mismo ajuste otra vez: rechazado.
    const { cuerpo: difs } = await pedir<{ id: string; estado: string }[]>("get", "/retenciones/diferencias");
    const ajustada = difs.find((d) => d.estado === "AJUSTADA");
    expect(ajustada).toBeDefined();
    const dos = await pedir("post", `/retenciones/diferencias/${ajustada!.id}/ajuste`, {}, { permitirError: true });
    console.log(`[recálculo] aprobar dos veces: ${dos.status} ${dos.texto.slice(0, 150)}`);
    expect(dos.ok, "aprobar dos veces se rechaza").toBe(false);
    expect(dos.status).toBe(409);

    // Lo vivo: $140.000. El asiento original de la compra no cambió.
    expect(pesos((await leer350(page)).renta)).toBe(140_000);
    const { cuerpo: asientoDespues } = await pedir<{ lineas: unknown[]; total_debito: string }>(
      "get",
      `/asientos/${compraAntes.asiento_id}`,
    );
    expect(asientoDespues.lineas).toEqual(asientoAntes.lineas);
    expect(asientoDespues.total_debito).toBe(asientoAntes.total_debito);
    const ajusteCd = await abrirAsiento(page, "por cambio de norma");
    await expect(ajusteCd).toContainText("CD");
    await expect(ajusteCd.getByRole("row").filter({ hasText: "2365" }).first()).toContainText("40.000");
    await mirar(page);
    await page.keyboard.press("Escape");

    // 7. Anular la compra: el diálogo nombra el ajuste CD y lo anula también.
    await anularCompra(page, compra, async (alerta) => {
      await expect(alerta).toContainText(/También se anula el ajuste de su retención por cambio de norma: CD/);
      await mirar(page);
    });
    expect(pesos((await leer350(page)).renta), "anulada la compra con su ajuste").toBe(0);
    const anulado = await abrirAsiento(page, "por cambio de norma", true);
    await expect(anulado).toContainText("Anulado");
    await mirar(page);
  });
});
