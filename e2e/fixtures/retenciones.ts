import { expect, type APIRequestContext } from "@playwright/test";

import { API } from "./datos";
import type { EmpresaLista } from "./empresa";

/**
 * Lo que hace falta para poder retener: la cuenta donde va lo retenido y —la
 * parte que la gente olvida— estar inscrito como agente de retención ante la
 * DIAN.
 *
 * La UVT, las tarifas y las bases mínimas son de la ley y ya vienen cargadas
 * (0074). El concepto tampoco se crea: al existir la cuenta 236540 la base lo
 * enlaza solo (0076).
 */
export async function prepararRetenciones(
  api: APIRequestContext,
  e: EmpresaLista,
  opciones: { agenteRetenedor: boolean },
): Promise<{ concepto: string; tarifa: number }> {
  const cabeceras = { Authorization: `Bearer ${e.token}` };

  const pedir = async (ruta: string, datos: unknown) => {
    const r = await api.post(`${API}${ruta}`, { headers: cabeceras, data: datos });
    expect(r.ok(), `POST ${ruta}: ${await r.text()}`).toBeTruthy();
    return r.json() as unknown;
  };

  // La cuenta donde se acumula lo retenido, que es una deuda con la DIAN.
  const plan = (await api
    .get(`${API}/plan-cuentas`, { headers: cabeceras })
    .then((r) => r.json())) as
    | { id: string; codigo: string }[]
    | { datos: { id: string; codigo: string }[] };
  const cuentas = Array.isArray(plan) ? plan : plan.datos;
  if (!cuentas.some((c) => c.codigo === "236540")) {
    await pedir("/plan-cuentas", { codigo: "236540", nombre: "Compras" });
  }

  if (opciones.agenteRetenedor) {
    await pedir("/empresa-legal/regimenes", {
      tipoRegimen: "AGENTE_RETENEDOR_RENTA",
      codigoResponsabilidadDian: "O-15",
      fechaInicio: "2020-01-01",
    });
  }

  // Compras generales, declarante, desde el 1 jul 2026: 2,5 % desde 10 UVT.
  return { concepto: "Compras generales", tarifa: 2.5 };
}
