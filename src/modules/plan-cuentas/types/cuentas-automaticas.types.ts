// Espejo de `common/contabilidad/cuentas-automaticas.ts` del backend: las
// cuentas que un módulo usa solo —el sobrante de un arqueo, la merma de
// inventario, el costo de venta de un producto nuevo—. Las exponen
// `/tesoreria/configuracion` e `/inventario/configuracion`, y las muestra el
// Plan de cuentas en «Cuentas automáticas».

export interface CuentaDelConcepto {
  id: string;
  codigo: string;
  nombre: string;
}

/** Cuánto la ha usado el sistema. */
export interface UsoDeCuenta {
  movimientos: number;
  /** AAAA-MM-DD del último asiento que la tocó, o `null` si nunca. */
  ultimaFecha: string | null;
}

export interface ConceptoConfigurado<C extends string = string> {
  concepto: C;
  etiqueta: string;
  /** Qué hace el sistema con esta cuenta, dicho para quien no es contador. */
  explicacion: string;
  /** La cuenta del decreto que el sistema propone. */
  codigoPorDefecto: string;
  /** La que se usa hoy. `null` si hay que elegir entre varios auxiliares. */
  cuenta: CuentaDelConcepto | null;
  /** Entre cuáles se elige. Más de una es lo que obliga a preguntar. */
  opciones: CuentaDelConcepto[];
  uso: UsoDeCuenta;
}

export interface ConfiguracionCuentas<C extends string = string> {
  conceptos: ConceptoConfigurado<C>[];
  /** Todos los conceptos tienen cuenta. */
  completa: boolean;
}
