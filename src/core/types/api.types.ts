// El backend devuelve la carga útil DIRECTA, sin envoltorio.
//
// Antes se esperaba `{ status, message, data }`. Un sobre que siempre dice lo
// mismo es ruido en cada respuesta: el código de estado ya viaja en HTTP y el
// mensaje solo aparece cuando hay error.

/** Lo que devuelve el backend cuando algo sale mal. */
export interface ApiError {
  statusCode: number;
  path: string;
  timestamp: string;
  /** Un string, o la lista de campos inválidos que arma el ValidationPipe. */
  message: string | string[];
  error?: string;
  /**
   * El nombre de la restricción de base que se rompió — `uk_tercero_documento`,
   * `uk_compra_factura`. Es lo que permite señalar el campo exacto en el
   * formulario en vez de mostrar «error inesperado».
   */
  constraint?: string;
  detail?: string;
  /**
   * Lo que manda el filtro de errores de Postgres del backend, que no usa
   * la forma de Nest: `estado` en vez de `statusCode`, el texto en `error` y
   * la restricción en `restriccion`. Se aceptan las dos formas.
   */
  estado?: number;
  restriccion?: string;
}
