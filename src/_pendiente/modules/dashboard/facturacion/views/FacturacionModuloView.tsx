"use client";

import { DocumentosView } from "./DocumentosView";

/**
 * El área de facturación. Una sola pantalla.
 *
 * Antes eran dos pestañas —Facturas y Notas crédito— y separaban lo que para
 * quien consulta es una sola pregunta: qué papeles hay. Ahora es una tabla con
 * el tipo como filtro, y las notas conviven con las facturas que corrigen.
 */
export function FacturacionModuloView() {
  return <DocumentosView />;
}
