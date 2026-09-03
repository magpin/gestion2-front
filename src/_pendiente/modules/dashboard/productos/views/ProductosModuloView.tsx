"use client";

import { ProductosView } from "./ProductosView";

/**
 * El área de inventario. Una sola pantalla.
 *
 * Antes tenía dos pestañas —Inventario y Stock crítico— y eran la misma lista
 * con distinto filtro. Ahora «Inventario bajo» es un chip más de la tabla, y el
 * panel del módulo dice cuántos hay antes de que nadie tenga que buscarlos.
 */
export function ProductosModuloView() {
  return <ProductosView />;
}
