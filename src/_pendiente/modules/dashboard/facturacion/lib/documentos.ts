import type { Compra } from "@/modules/dashboard/compras/types/compras.types";
import type { Venta } from "@/modules/dashboard/ventas/types/ventas.types";
import type { Factura, NotaCredito } from "../types/facturacion.types";

/**
 * Un documento fiscal, venga de donde venga.
 *
 * La pantalla junta cuatro cosas que el modelo guarda por separado —factura de
 * venta, factura de taller, factura del proveedor y nota crédito— porque para
 * quien las consulta son la misma pregunta: qué papeles pasaron por el negocio.
 *
 * Lo que NO hace es fundir las tablas: cada fila conserva de qué tabla salió, y
 * las acciones se arman con eso. Fundirlas del lado del backend sería inventar
 * un documento que la DIAN no reconoce.
 */
export type TipoDocumento = "VENTA" | "OT" | "COMPRA" | "NOTA_CREDITO";

export interface DocumentoFiscal {
  /** Id de la fila original, en su propia tabla. */
  id: string;
  tipo: TipoDocumento;
  /** El número que ve el cliente, o el del proveedor si la emitió él. */
  numero: string;
  fecha: string;
  terceroId: string;
  /**
   * `null` cuando no se pudo resolver.
   *
   * La factura **no guarda su total**: lo lee del origen al imprimir. Acá se
   * cruza con la venta por `origenId`; si esa venta no está en el listado
   * cargado, queda en null en vez de mostrar un cero que sería mentira.
   */
  total: number | null;
  anulado: boolean;
  /**
   * De qué documento sale, para abrirlo en su diálogo sin salir del listado.
   * `null` si ese tipo no tiene detalle propio (la nota crédito trae el suyo).
   */
  origen: { tipo: "VENTA" | "COMPRA"; id: string } | null;
}

export const TIPO_LABEL: Record<TipoDocumento, string> = {
  VENTA: "De venta",
  OT: "De taller",
  COMPRA: "De compra",
  NOTA_CREDITO: "Nota crédito",
};

/** Las facturas que emitió la empresa. El total sale de su venta. */
export function desdeFacturas(
  facturas: Factura[],
  totalPorVenta: Map<string, number>,
): DocumentoFiscal[] {
  return facturas.map((factura) => ({
    id: factura.id,
    tipo: factura.origenTipo === "OT" ? "OT" : "VENTA",
    numero: factura.numero,
    fecha: factura.fechaEmision,
    terceroId: factura.terceroId,
    total: factura.origenTipo === "VENTA" ? (totalPorVenta.get(factura.origenId) ?? null) : null,
    anulado: factura.anulada,
    origen:
      factura.origenTipo === "VENTA"
        ? { tipo: "VENTA" as const, id: factura.origenId }
        : null,
  }));
}

/**
 * Las facturas del proveedor.
 *
 * Salen del módulo de compras porque **no las emite la empresa**: llegan con la
 * mercancía y se registran con el número de él. Están acá porque quien pregunta
 * «qué facturas hay» las cuenta entre ellas.
 */
export function desdeCompras(compras: Compra[]): DocumentoFiscal[] {
  return compras.map((compra) => ({
    id: compra.id,
    tipo: "COMPRA",
    numero: compra.numeroFactura,
    fecha: compra.fecha,
    terceroId: compra.terceroId,
    total: compra.total,
    anulado: compra.anulada,
    origen: { tipo: "COMPRA" as const, id: compra.id },
  }));
}

/** Las notas crédito. Son las únicas que guardan su total en su propia fila. */
export function desdeNotas(notas: NotaCredito[]): DocumentoFiscal[] {
  return notas.map((nota) => ({
    id: nota.id,
    tipo: "NOTA_CREDITO",
    numero: nota.numero,
    fecha: nota.fechaEmision,
    terceroId: nota.terceroId,
    total: nota.total,
    anulado: false,
    origen: null,
  }));
}

/** El total de cada venta, indexado por su id, para resolver el de su factura. */
export function totalesPorVenta(ventas: Venta[]): Map<string, number> {
  return new Map(ventas.map((venta) => [venta.id, venta.total]));
}
