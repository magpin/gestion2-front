// Espejo de `/productos`, `/productos/:id/movimientos` e
// `/inventario/configuracion`.
//
// Cuatro tablas del backend, dos historias distintas: `producto_precio` es
// historia comercial (a cuánto se ofrecía), `producto_movimiento` es historia
// de existencias y costo (cuánto hay y a qué costo promedio). No se mezclan
// en un solo tipo aunque las dos cuelguen del mismo producto.

export const UNIDADES_MEDIDA = [
  "UND",
  "KG",
  "LB",
  "LT",
  "GAL",
  "MT",
  "M2",
  "M3",
  "CAJA",
  "PAR",
  "DOC",
] as const;

export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number];

export const NOMBRE_UNIDAD: Record<UnidadMedida, string> = {
  UND: "Unidad",
  KG: "Kilogramo",
  LB: "Libra",
  LT: "Litro",
  GAL: "Galón",
  MT: "Metro",
  M2: "Metro²",
  M3: "Metro³",
  CAJA: "Caja",
  PAR: "Par",
  DOC: "Docena",
};

/** Las únicas tres tarifas reales de IVA para bienes en Colombia. */
export const TARIFAS_IVA = [0, 5, 19] as const;

/** Lo que devuelve la lista y la ficha. El backend no distingue las dos. */
export interface ProductoResumen {
  id: string;
  codigo: string;
  nombre: string;
  unidad_medida: UnidadMedida;
  /** `numeric` de Postgres, serializado como texto. */
  iva_tarifa: string;
  cuenta_inventario_id: string;
  /** Las dos siguientes: `null` en productos creados antes de que el módulo Ventas exigiera este dato. */
  cuenta_costo_venta_id: string | null;
  cuenta_ingreso_id: string | null;
  activo: boolean;
}

export interface PaginaProductos {
  datos: ProductoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface FiltroProductos {
  q?: string;
  incluirInactivos?: boolean;
  soloInactivos?: boolean;
  pagina?: number;
}

export interface PrecioResumen {
  id: string;
  producto_id: string;
  precio_venta: string;
  nota: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

/** La bitácora: igual que `PrecioResumen`, con el producto al lado. */
export interface PrecioBitacora extends PrecioResumen {
  producto_codigo: string;
  producto_nombre: string;
}

export interface PaginaPrecios {
  datos: PrecioBitacora[];
  pagina: number;
  tamano: number;
  total: number;
}

export type TipoMovimiento =
  | "ENTRADA_INICIAL"
  | "ENTRADA_AJUSTE"
  | "SALIDA_AJUSTE";

export const NOMBRE_MOVIMIENTO: Record<TipoMovimiento, string> = {
  ENTRADA_INICIAL: "Carga inicial",
  ENTRADA_AJUSTE: "Entrada de ajuste",
  SALIDA_AJUSTE: "Salida de ajuste",
};

export interface MovimientoResumen {
  id: string;
  producto_id: string;
  fecha: string;
  tipo: TipoMovimiento;
  cantidad: string;
  costo_unitario: string;
  valor_total: string;
  saldo_cantidad: string;
  saldo_costo_promedio: string;
  saldo_valor: string;
  motivo: string;
  asiento_id: string | null;
}

export interface PaginaMovimientos {
  datos: MovimientoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

/** `cuenta_ajuste_id` viene `null` si nadie la ha fijado todavía. */
export interface InventarioConfiguracion {
  empresa_id: string;
  cuenta_ajuste_id: string | null;
}

export interface CrearProductoInput {
  codigo: string;
  nombre: string;
  unidadMedida?: UnidadMedida;
  ivaTarifa: number;
  cuentaInventarioId: string;
  /**
   * Opcional: un producto sin esto se puede seguir usando en inventario,
   * solo no se podrá vender hasta que alguien la fije. No hay pantalla de
   * "editar producto" todavía (§4.6 de `productos-inventario-restante.md`),
   * así que hoy solo se completa acá, al crear.
   */
  cuentaCostoVentaId?: string;
  /** La pareja de `cuentaCostoVentaId`: el crédito cuando se vende. Mismo criterio. */
  cuentaIngresoId?: string;
  precioVenta: number;
}

export interface CambiarPrecioInput {
  precioVenta: number;
  fechaInicio: string;
  nota?: string;
}

/** Forma única para los tres tipos de movimiento; `costoUnitario` no aplica a salida. */
export interface RegistrarMovimientoInput {
  fecha: string;
  cantidad: number;
  costoUnitario?: number;
  motivo: string;
}

/** Lo que `PATCH /productos/:id` acepta — ver `EditarProductoDto` del backend. */
export interface EditarProductoInput {
  nombre?: string;
  unidadMedida?: UnidadMedida;
  ivaTarifa?: number;
  cuentaCostoVentaId?: string;
  cuentaIngresoId?: string;
}
