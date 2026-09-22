import { expect, type APIRequestContext } from "@playwright/test";

import { API } from "./datos";
import type { EmpresaLista } from "./empresa";

/**
 * Una caja donde recibir la plata.
 *
 * Una empresa nueva no tiene ninguna: hasta que alguien la crea, no hay dónde
 * meter lo que se cobra ni de dónde sacar lo que se paga. Y una caja no es
 * solo un nombre —lleva su cuenta contable del 1105 y su sede—, porque cada
 * movimiento suyo termina en el libro.
 */
export async function prepararCaja(
  api: APIRequestContext,
  e: EmpresaLista,
): Promise<{ id: string; nombre: string }> {
  const cabeceras = { Authorization: `Bearer ${e.token}` };

  const pedir = async (metodo: "get" | "post", ruta: string, datos?: unknown) => {
    const r = await api[metodo](`${API}${ruta}`, {
      headers: cabeceras,
      ...(datos === undefined ? {} : { data: datos }),
    });
    expect(r.ok(), `${metodo.toUpperCase()} ${ruta}: ${await r.text()}`).toBeTruthy();
    return r.json() as unknown;
  };

  // La cuenta: el plan sugerido trae el grupo 1105, no una auxiliar.
  const plan = (await pedir("get", "/plan-cuentas")) as
    | { id: string; codigo: string }[]
    | { datos: { id: string; codigo: string }[] };
  const cuentas = Array.isArray(plan) ? plan : plan.datos;
  let cuenta = cuentas
    .filter((c) => c.codigo.startsWith("1105") && c.codigo.length > 4)
    .sort((a, b) => a.codigo.length - b.codigo.length)[0];
  if (cuenta === undefined) {
    cuenta = (await pedir("post", "/plan-cuentas", {
      codigo: "110505",
      nombre: "Caja general",
    })) as { id: string; codigo: string };
  }

  const sedes = (await pedir("get", "/empresas/actual/sedes")) as
    | { id: string }[]
    | { datos: { id: string }[] };
  const sede = (Array.isArray(sedes) ? sedes : sedes.datos)[0];

  const caja = (await pedir("post", "/cajas", {
    nombre: "Caja principal",
    tipo: "PRINCIPAL",
    sedeId: sede.id,
    cuentaId: cuenta.id,
  })) as { id: string; nombre: string };

  return { id: caja.id, nombre: caja.nombre ?? "Caja principal" };
}

/** El saldo de la caja según su libro: es el número que manda. */
export async function saldoCaja(
  api: APIRequestContext,
  e: EmpresaLista,
  cajaId: string,
): Promise<number> {
  const r = await api.get(`${API}/cajas/${cajaId}`, {
    headers: { Authorization: `Bearer ${e.token}` },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  const caja = (await r.json()) as { saldo?: string | number };
  return Number(caja.saldo ?? 0);
}
