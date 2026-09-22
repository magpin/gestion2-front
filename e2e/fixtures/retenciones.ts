import { expect, type APIRequestContext } from "@playwright/test";

import { API } from "./datos";
import type { EmpresaLista } from "./empresa";

/**
 * Lo que hace falta para poder retener: la UVT del año, un concepto con su
 * tarifa y —la parte que la gente olvida— estar inscrito como agente de
 * retención ante la DIAN.
 *
 * Las tarifas y las bases mínimas las fija la DIAN cada año: el sistema no las
 * inventa, las pide. Por eso una empresa nueva no tiene ninguna.
 */
export async function prepararRetenciones(
  api: APIRequestContext,
  e: EmpresaLista,
  opciones: { agenteRetenedor: boolean },
): Promise<{ concepto: string; tarifa: number }> {
  const cabeceras = { Authorization: `Bearer ${e.token}` };
  const anio = new Date().getFullYear();

  const pedir = async (ruta: string, datos: unknown) => {
    const r = await api.post(`${API}${ruta}`, { headers: cabeceras, data: datos });
    expect(r.ok(), `POST ${ruta}: ${await r.text()}`).toBeTruthy();
    return r.json() as unknown;
  };

  // La UVT del año: las bases mínimas se expresan en UVT, no en pesos.
  await pedir("/retenciones/uvt", { anio, valor: 49_799 });

  // La cuenta donde se acumula lo retenido, que es una deuda con la DIAN.
  const plan = (await api
    .get(`${API}/plan-cuentas`, { headers: cabeceras })
    .then((r) => r.json())) as
    | { id: string; codigo: string }[]
    | { datos: { id: string; codigo: string }[] };
  const cuentas = Array.isArray(plan) ? plan : plan.datos;
  let cuenta = cuentas
    .filter((c) => c.codigo.startsWith("2365"))
    .sort((a, b) => b.codigo.length - a.codigo.length)[0];
  if (cuenta === undefined || cuenta.codigo === "2365") {
    cuenta = (await pedir("/plan-cuentas", {
      codigo: "236540",
      nombre: "Compras",
    })) as { id: string; codigo: string };
  }

  const tarifa = 2.5;
  // El código tiene que ser uno de los seis que acepta la base al guardar la
  // compra (HONORARIOS, COMISIONES, SERVICIOS, ARRENDAMIENTOS, COMPRAS,
  // OTROS). El catálogo admite cualquiera, y la diferencia solo se ve al
  // guardar, con un error que no lo dice.
  await pedir("/retenciones/conceptos", {
    anio,
    tipo: "RENTA",
    codigo: "COMPRAS",
    nombre: "Compras generales",
    tarifa,
    cuentaId: cuenta.id,
    baseMinimaUvt: 0,
  });

  if (opciones.agenteRetenedor) {
    await pedir("/empresa-legal/regimenes", {
      tipoRegimen: "AGENTE_RETENEDOR_RENTA",
      codigoResponsabilidadDian: "O-15",
      fechaInicio: "2020-01-01",
    });
  }

  return { concepto: "Compras generales", tarifa };
}
