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
  /** Cuántas unidades hay hoy, según el último movimiento del kardex. */
  saldo_cantidad: string;
  /** El promedio ponderado con el que salen las ventas. */
  saldo_costo_promedio: string;
  /** Cuánta plata hay parada en este producto. */
  saldo_valor: string;
  /**
   * A cuánto se compró la última vez. **No es el costo promedio**: el promedio
   * es con lo que sale la mercancía y mezcla todas las entradas; esto es lo
   * que dijo la última factura del proveedor. `null` si nunca se compró.
   */
  ultimo_costo_compra: string | null;
  /** Cuándo fue esa compra. */
  ultima_compra_fecha: string | null;
  /** A qué categoría pertenece, o `null` si nadie lo clasificó. */
  categoria_id: string | null;
  /** El nombre de esa categoría, que es lo que se muestra. */
  categoria_nombre: string | null;
  /** Lo que trae el empaque. `null` en los importados. */
  codigo_barras: string | null;
  /** La llave del objeto en el bucket. La URL se firma al leer. */
  imagen_clave: string | null;
  /** La URL firmada con la que se ve. Caduca en una hora: no se guarda ni se comparte. */
  imagen_url?: string | null;
}

/** Una categoría del catálogo. Una lista, no un árbol: un nivel alcanza. */
export interface CategoriaResumen {
  id: string;
  nombre: string;
  activa: boolean;
  /** Cuántos productos tiene clasificados. */
  productos: string;
}

/** Cuánto vale el inventario entero, para la cabecera del catálogo. */
export interface ValorInventario {
  valor: string;
  productos: string;
  sin_existencia: string;
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
  /** Si la empresa acepta facturar sin existencia. Ver migración `0037`. */
  permite_existencia_negativa: boolean;
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
  /** A qué categoría pertenece. Opcional: los importados no traen ninguna. */
  categoriaId?: string;
  /** Lo que trae el empaque. Único por empresa cuando existe. */
  codigoBarras?: string;
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
  /** Se puede reclasificar cuando se quiera: no ancla ningún movimiento. */
  categoriaId?: string;
  codigoBarras?: string;
}

/** Una línea que se vendió sin tener: lo que hay que comprar. */
export interface FaltanteResumen {
  id: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  cantidad_faltante: string;
  costo_referencia: string;
  venta_documento_id: string;
  /** Prefijo y consecutivo juntos, como los muestra la factura. */
  documento: string;
  fecha: string;
  creado_en: string;
  /** Lo que hay hoy en el kardex: si sigue negativo, el faltante está vivo. */
  saldo_actual: string;
}

export interface PaginaFaltantes {
  datos: FaltanteResumen[];
  pagina: number;
  tamano: number;
  total: number;
}
