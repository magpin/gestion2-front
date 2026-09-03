/**
 * Exportar a CSV lo que hay en pantalla.
 *
 * Se arma en el navegador con los datos que la tabla ya tiene, no con un
 * endpoint de descarga: así el archivo sale con EXACTAMENTE lo que la persona
 * está viendo —mismo rango, mismos filtros— y no con otra consulta que podría
 * traer algo distinto.
 */

/**
 * Una celda, escapada según RFC 4180.
 *
 * Las comillas se duplican y el campo se encierra si trae separador, comilla o
 * salto de línea. Sin esto, una descripción con una coma parte la fila en dos
 * columnas y desplaza todo lo que viene después.
 */
function celda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * Descarga una tabla como CSV.
 *
 * Separador `;` y BOM al inicio: es lo que Excel en español espera. Con coma
 * abre todo en una sola columna, y sin BOM se come los acentos.
 */
export function descargarCSV(
  nombreArchivo: string,
  encabezados: string[],
  filas: (string | number | null | undefined)[][],
): void {
  const contenido = [encabezados, ...filas]
    .map((fila) => fila.map(celda).join(";"))
    .join("\r\n");

  const blob = new Blob([`﻿${contenido}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
