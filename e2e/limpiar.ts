import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PREFIJO } from "./fixtures/datos";

const correr = promisify(execFile);

/**
 * Borra lo que dejó la corrida, y nada más.
 *
 * Las pruebas van contra la base de desarrollo, así que lo que crean tiene
 * que desaparecer: si no, el listado de cuentas termina lleno de
 * «Ferretería de prueba» y el Inicio cuenta clientes que no existen.
 *
 * El borrado lo hace `limpiar-pruebas.js`, que corre con el dueño de la base:
 * ni la API ni la consola pueden borrar una cuenta, a propósito. Acá solo se
 * lo llama con el patrón de estas pruebas.
 *
 * Si falla, se avisa y no se tumba la corrida: el resultado de las pruebas ya
 * es lo que importa, y lo que quedó se borra a mano con el mismo comando.
 */
export default async function limpiar(): Promise<void> {
  if (process.env.E2E_SIN_LIMPIAR === "1") {
    console.log(`\n  Se deja lo creado (E2E_SIN_LIMPIAR=1). Borrar con:`);
    console.log(`  node scripts/limpiar-pruebas.js --patron "${PREFIJO}-%" --confirmar\n`);
    return;
  }
  try {
    const { stdout } = await correr(
      "node",
      ["scripts/limpiar-pruebas.js", "--patron", `${PREFIJO}-%`, "--confirmar"],
      { cwd: process.env.E2E_BACKEND ?? "../backend" },
    );
    const ultima = stdout.trim().split("\n").filter(Boolean).at(-1);
    console.log(`\n  Limpieza: ${ultima ?? "sin cuentas que borrar"}\n`);
  } catch (e) {
    console.warn(
      `\n  No se pudo limpiar: ${String(e)}\n  Hágalo con: node scripts/limpiar-pruebas.js --patron "${PREFIJO}-%" --confirmar\n`,
    );
  }
}
