import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import type { FullConfig, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/**
 * Deja los videos de la corrida ordenados por el paso del guion de QA
 * (`docs/planes/prueba-qa-motor-retenciones.md`, «Resumen: paso a paso»):
 *
 *     .corridas/<corrida>/videos/Paso 06 - Compra manual a A/01 ✓ título.webm
 *
 * El paso sale de la etiqueta `@paso6` de la prueba (o de su `describe`). Lo
 * que no tiene etiqueta va a «Sin paso».
 */
const PASOS: Record<number, string> = {
  1: "Revisar la base",
  2: "Proveedor viejo",
  3: "Terceros de prueba",
  4: "Tarifas",
  5: "Empresa nueva",
  6: "Compra manual a A",
  7: "Otras compras",
  8: "Factura leida por Maria",
  9: "Ventas y autorretencion",
  10: "Notas y anulaciones",
  11: "Reportes",
  12: "Recalculo",
  13: "Propuesta de perfil",
  14: "Cierre",
};

const limpio = (s: string) => s.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim().slice(0, 90);

export default class ReporteroVideos implements Reporter {
  private carpeta = "";
  private contador = new Map<string, number>();

  onBegin(config: FullConfig) {
    // outputDir = .corridas/<corrida>/resultados → los videos van al lado.
    this.carpeta = join(dirname(config.projects[0]?.outputDir ?? "."), "videos");
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // El video de la página principal y los de otros contextos («video-vendedor»).
    const videos = result.attachments.filter((a) => /^video(-|$)/.test(a.name) && a.path);
    if (videos.length === 0) return;

    const etiqueta = [...test.tags, test.title, ...test.titlePath()]
      .join(" ")
      .match(/@paso(\d+)/i);
    const paso = etiqueta ? Number(etiqueta[1]) : null;
    const subcarpeta =
      paso === null
        ? "Sin paso"
        : `Paso ${String(paso).padStart(2, "0")} - ${PASOS[paso] ?? ""}`.trim();

    const n = (this.contador.get(subcarpeta) ?? 0) + 1;
    this.contador.set(subcarpeta, n);
    // `test.fail()` es un bug conocido: que falle es lo esperado.
    const marca =
      result.status === "skipped"
        ? "SALTADA"
        : test.expectedStatus === "failed"
          ? result.status === "passed"
            ? "BUG CONOCIDO YA NO FALLA"
            : "FALLA ESPERADA"
          : result.status === "passed"
            ? "OK"
            : "FALLA";
    const titulo = limpio(test.title.replace(/@paso\d+/gi, ""));

    const destino = join(this.carpeta, subcarpeta);
    mkdirSync(destino, { recursive: true });
    for (const video of videos) {
      const extra = video.name === "video" ? "" : ` (${video.name.replace(/^video-/, "")})`;
      copyFileSync(
        video.path!,
        join(destino, `${String(n).padStart(2, "0")} ${marca} - ${limpio(titulo + extra)}.webm`),
      );
    }
  }
}
