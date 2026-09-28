import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Las mismas pruebas, contra QA (`pnpm e2e:qa`).
 *
 * La URL y la clave del superadmin salen de `e2e/.env.qa`, que no se versiona:
 *
 *     E2E_URL=https://qa.contable.computintasdigital.com
 *     E2E_API=https://qa.contable.computintasdigital.com/api/v1
 *     E2E_ADMIN_EMAIL=…
 *     E2E_ADMIN_PASSWORD=…
 *
 * Allá no se limpia desde acá —la base está en el servidor—: lo creado lleva
 * el prefijo `e2e` y se borra en el VPS con `limpiar-pruebas.js`.
 */
const archivo = resolve(__dirname, ".env.qa");
if (!existsSync(archivo)) {
  throw new Error(`Falta ${archivo} (E2E_URL, E2E_API, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)`);
}
process.loadEnvFile(archivo);
process.env.E2E_SIN_LIMPIAR = "1";

// Se importa después de cargar el entorno: la configuración lee E2E_URL al armarse.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require("./playwright.config").default;

/**
 * Con `E2E_GRABAR=1`: video y trace de cada prueba, pasen o fallen, en una
 * carpeta por corrida (`e2e/.corridas/2026-09-28_1130/`) que no se pisa con la
 * siguiente. El informe de esa corrida se abre con
 * `npx playwright show-report e2e/.corridas/<carpeta>/informe`.
 */
if (process.env.E2E_GRABAR === "1") {
  const sello =
    process.env.E2E_CORRIDA ??
    new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  // Los procesos de las pruebas vuelven a leer este archivo: que usen la misma carpeta.
  process.env.E2E_CORRIDA = sello;
  const carpeta = resolve(__dirname, ".corridas", sello);
  config.outputDir = resolve(carpeta, "resultados");
  config.reporter = [
    ["list"],
    ["html", { outputFolder: resolve(carpeta, "informe"), open: "never" }],
    // Los videos, además, en carpetas por paso del guion (`@paso6` en la prueba).
    [resolve(__dirname, "reportero-videos.ts")],
  ];
  config.use = { ...config.use, video: "on", trace: "on", screenshot: "on" };
}

module.exports = config;
