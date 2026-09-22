import { defineConfig, devices } from "@playwright/test";

/**
 * Las pruebas de punta a punta: el navegador contra la app de verdad.
 *
 * **Contra la base de desarrollo**, no contra una aparte: así se prueba con
 * los mismos datos y migraciones con los que se trabaja. A cambio, cada
 * prueba crea lo suyo con un sello de tiempo y no toca nada de lo que ya
 * existe. Lo que dejan se borra con `scripts/limpiar-pruebas.js --patron`,
 * que corre al terminar.
 *
 * No reemplazan a `vitest` ni a `jest`: acá va lo que solo el navegador puede
 * ver —que el formulario mande lo que la pantalla muestra, que un error del
 * servidor se vea, que un recorrido entero se pueda hacer sin atascarse—.
 * Las reglas de negocio se prueban donde viven.
 *
 * El navegador es el Chrome instalado (`channel: "chrome"`): no hay que
 * descargar nada.
 */
export default defineConfig({
  testDir: "./especificaciones",
  outputDir: "./.resultados",
  // Contra una sola base de datos, en serie: dos pruebas creando cuentas a la
  // vez se pisan los conteos del Inicio.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["github"], ["list"]]
    : [["list"], ["html", { outputFolder: "./.informe", open: "never" }]],
  globalTeardown: "./limpiar.ts",

  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:3000",
    // Cámara lenta para mirarla trabajar: `pnpm e2e:lento`. En una corrida
    // normal no frena nada.
    launchOptions: { slowMo: Number(process.env.E2E_LENTO ?? 0) },
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    // Entra una vez y guarda la sesión; las demás la reusan.
    {
      name: "entrar",
      // Vive fuera de `especificaciones/`: no es una prueba, es la llave.
      testDir: ".",
      testMatch: /entrar\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "consola",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["entrar"],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        storageState: "./e2e/.sesion/admin.json",
      },
    },
  ],
});
