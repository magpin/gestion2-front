"use client";

import { AprobacionesView } from "./AprobacionesView";

/**
 * La pantalla del director. Una sola cosa, por ahora.
 *
 * El módulo viejo traía tres pestañas —Catálogo Taller, aprobación de rutas de
 * diagnóstico y Reportería— y las tres dependen de lo que todavía no existe:
 * las dos primeras del módulo 7, diferido; la tercera del 9, sin especificar.
 * Queda apartado en `_pendiente`.
 *
 * Lo que sí es del director y ya tiene backend son las aprobaciones de precio.
 * Sus otras dos responsabilidades —cerrar períodos y asignar roles— ya tienen
 * casa propia en `periodos` y `configuracion`, y traerlas acá sería la misma
 * pantalla en dos sitios.
 */
export function AdministracionModuloView() {
  return <AprobacionesView />;
}
