/**
 * Bajo qué madres puede crear un auxiliar cada rol desde un formulario (D3).
 * Espejo de `madrePermitida` en `plan-cuentas.reglas.ts` del backend, que es
 * el que decide: esto solo evita ofrecer «+ Crear cuenta auxiliar» a quien el
 * servidor se lo va a rechazar.
 */
const MADRES_POR_ROL: Readonly<Record<string, readonly string[]>> = {
  CAJA: ["1105", "1110"],
  INVENTARIO: ["1435", "41", "61"],
  COMPRAS: ["5", "6", "1"],
};

export function madrePermitida(roles: readonly string[], madre: string): boolean {
  if (roles.includes("DIRECTOR") || roles.includes("CONTADOR")) return true;
  return roles.some((r) => (MADRES_POR_ROL[r] ?? []).some((p) => madre.startsWith(p)));
}

/**
 * ¿Puede crear bajo alguna de estas madres? `"cualquiera"` es todo el plan:
 * solo director y contador.
 */
export function puedeCrearBajo(roles: readonly string[], madres: readonly string[] | "cualquiera"): boolean {
  if (madres === "cualquiera") return roles.includes("DIRECTOR") || roles.includes("CONTADOR");
  return madres.some((m) => madrePermitida(roles, m));
}
