"use client";

import { AsientosView } from "./AsientosView";

/**
 * El libro diario, igual para todos los que pueden verlo.
 *
 * Antes esto desviaba al DIRECTOR a una vista analítica con gráficos y sin
 * tabla, alimentada por `GET /asientos/estadisticas` — un endpoint que el
 * backend de 32 tablas no tiene. El efecto era que nadie podía ver los
 * asientos: el director llegaba a la vista equivocada y ningún otro rol tenía
 * el modulo. Quedó apartada en `_pendiente`, esperando al módulo 9.
 */
export function AsientosModuloView() {
  return <AsientosView />;
}
