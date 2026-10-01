import type { Locator, Page } from "@playwright/test";

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
 * Con `E2E_LENTO` puesto —que es como se corre con ventana abierta o se
 * graba— se queda quieta unos segundos sobre lo que acaba de verificar. En la
 * corrida normal no espera nada: las pruebas no se pagan con tiempo de nadie.
 *
 * Se le puede decir **qué mostrar**: uno o varios locators. Antes de pausar
 * espera a que la página termine de cargar (sin spinner ni skeleton), lleva
 * cada uno al centro de la vista —también dentro de un diálogo con scroll,
 * para que no quede bajo el pie fijo— y lo enmarca mientras se mira. Es solo
 * para el video: si algo no está, no falla (lo que se verifica va en los
 * `expect`, no acá).
 *
 *     await mirar(page);                        // 4 s, donde esté
 *     await mirar(page, 2);                     // 2 s
 *     await mirar(page, fila);                  // lleva a la fila, 4 s
 *     await mirar(page, [renta, iva], 6);       // una tras otra, 6 s en total
 */
export async function mirar(
  page: Page,
  queOSegundos?: number | Locator | Locator[],
  segundos?: number,
): Promise<void> {
  if (!(Number(process.env.E2E_LENTO ?? 0) > 0)) return;
  let mostrar: Locator[] = [];
  let total = 4;
  if (typeof queOSegundos === "number") total = queOSegundos;
  else if (queOSegundos !== undefined) {
    mostrar = Array.isArray(queOSegundos) ? queOSegundos : [queOSegundos];
    total = segundos ?? 4;
  }

  await sinCargas(page);
  if (mostrar.length === 0) {
    await page.waitForTimeout(total * 1000);
    return;
  }
  const cada = Math.max(2, total / mostrar.length);
  for (const l of mostrar) {
    const el = l.first();
    const visto = await el
      .evaluate(
        (n: Element) => {
          n.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
          const h = n as HTMLElement;
          h.dataset.e2eOutline = h.style.outline;
          h.dataset.e2eFondo = h.style.backgroundColor;
          h.style.outline = "3px solid #f59e0b";
          h.style.outlineOffset = "2px";
          // Una fila de tabla no muestra bien el borde: el fondo la marca igual.
          h.style.backgroundColor = "rgba(245, 158, 11, 0.16)";
        },
        undefined,
        { timeout: 3_000 },
      )
      .then(() => true)
      .catch(() => false);
    if (!visto) continue;
    await sinCargas(page);
    await page.waitForTimeout(cada * 1000);
    await el
      .evaluate(
        (n: Element) => {
          const h = n as HTMLElement;
          h.style.outline = h.dataset.e2eOutline ?? "";
          h.style.outlineOffset = "";
          h.style.backgroundColor = h.dataset.e2eFondo ?? "";
          delete h.dataset.e2eOutline;
          delete h.dataset.e2eFondo;
        },
        undefined,
        { timeout: 2_000 },
      )
      .catch(() => undefined);
  }
}

/** Espera (hasta 15 s, sin fallar) a que no quede un spinner ni un skeleton a la vista. */
async function sinCargas(page: Page): Promise<void> {
  const cargando = page.locator('.animate-spin:visible, [data-slot="skeleton"]:visible, [aria-busy="true"]:visible');
  const hasta = Date.now() + 15_000;
  while (Date.now() < hasta) {
    if ((await cargando.count().catch(() => 0)) === 0) break;
    await page.waitForTimeout(250);
  }
  // Un respiro para que pinte lo que llegó.
  await page.waitForTimeout(300);
}
