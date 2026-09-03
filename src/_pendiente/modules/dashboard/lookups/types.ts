// Lookups ligeros para los pickers de los formularios comerciales.
// Compartidos entre cotizaciones, ventas, compras, caja.
//
// Son subconjuntos de lo que devuelven `/terceros` y `/productos`: los pickers
// no necesitan la entidad completa, y nombrar solo lo que se usa evita que un
// cambio en una columna que nadie muestra rompa cuatro formularios.

export interface ClienteLookup {
  id: string;
  nombre: string;
  numeroDocumento: string;
  /** Si es true, al facturarle nace la línea de retención a favor. */
  esAgenteRetenedor?: boolean;
}

export interface ProductoLookup {
  id: string;
  codigo: string;
  nombre: string;
  /** Sugerido: la línea de venta puede cambiarlo. */
  precioVenta: number;
  /** Costo de REPOSICIÓN, distinto del promedio del kardex. */
  ultimoCostoCompra: number;
  /** NULL hereda el de la empresa. */
  margenMinimoPct: number | null;
  porcentajeIva: number | null;
  manejaInventario: boolean;
  /** Lo calcula el backend leyendo el kardex; no es una columna de `producto`. */
  stock?: number;
  costoPromedio?: number;
  /**
   * Costo de reposición más el margen mínimo. Lo compone el backend porque el
   * margen de la empresa vive en una configuración que solo el DIRECTOR lee —y
   * porque la regla se escribe una sola vez.
   */
  precioPiso?: number;
}

export interface CuentaLookup {
  id: string;
  codigo: string;
  nombre: string;
  naturaleza: string;
  transaccional: boolean;
}

export interface UsuarioLookup {
  id: string;
  nombreCompleto: string;
  rol: string;
}
