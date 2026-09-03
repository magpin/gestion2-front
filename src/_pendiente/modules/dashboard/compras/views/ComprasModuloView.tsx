"use client";

import { ComprasView } from "./ComprasView";

/**
 * El área de compras. Una sola pantalla.
 *
 * Antes tenía dos pestañas —Compras y Órdenes de compra— y una vista analítica
 * aparte para el director. Las dos se cayeron con el modelo de 32 tablas: no
 * hay orden de compra previa —la compra ES la factura del proveedor ya
 * recibida— y `GET /compras/estadisticas` no existe. El módulo entero está
 * protegido con el rol COMPRAS, así que una sesión de puro DIRECTOR ni siquiera
 * puede leer el listado.
 */
export function ComprasModuloView() {
  return <ComprasView />;
}
