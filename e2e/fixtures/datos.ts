import { digitoVerificacion } from "../../src/lib/nit";

/**
 * Con qué entra la prueba y cómo se llama lo que crea.
 *
 * Las credenciales salen del entorno: en este repositorio no se escribe una
 * contraseña, ni siquiera la sembrada. Las locales están en
 * `docs/credencial/credenciales.md`, que no se versiona.
 */
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "superadmin@demo.co",
  password: process.env.E2E_ADMIN_PASSWORD ?? "",
};

export const API = process.env.E2E_API ?? "http://localhost:3001/api/v1";

/**
 * El prefijo de todo lo que crean estas pruebas, contra la misma base de
 * desarrollo. Es lo que después borra `limpiar-pruebas.js --patron 'e2e-%'`:
 * sin él, no habría forma de distinguir una cuenta de prueba de una real.
 */
export const PREFIJO = "e2e";

/** Un correo irrepetible: el slug de la cuenta sale de acá. */
export const correoDePrueba = (que = "cuenta"): string =>
  `${PREFIJO}-${que}-${Date.now()}-${Math.floor(Math.random() * 1000)}@prueba.co`;

/**
 * Un NIT distinto en cada corrida, con su dígito de verificación calculado
 * por la misma función del sistema: la base lo recalcula y rechaza la fila si
 * no coincide, así que inventarlo no sirve.
 */
export const nitDePrueba = (): { nit: string; dv: string } => {
  const nit = String(800_000_000 + Math.floor(Math.random() * 99_999_999));
  return { nit, dv: digitoVerificacion(nit) };
};

/**
 * Una pausa para mirar, solo cuando la corrida es para mirar.
 *
 * Con `E2E_LENTO` puesto —que es como se corre con ventana abierta— se queda
 * quieta unos segundos sobre lo que acaba de verificar. En la corrida normal
 * no espera nada: las pruebas no se pagan con tiempo de nadie.
 */
export const mirar = async (page: { waitForTimeout: (ms: number) => Promise<void> }, segundos = 4) => {
  if (Number(process.env.E2E_LENTO ?? 0) > 0) await page.waitForTimeout(segundos * 1000);
};
