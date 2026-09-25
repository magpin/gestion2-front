// Espejo de `/ventas-historicas-leidas` — las facturas de venta que la empresa
// emitió en el sistema anterior, leídas por María (fase 11 de
// `docs/planes/maria-facturas-y-errores.md`).
//
// Se cargan como **históricas**: con su número y su fecha, sin asiento y sin
// kardex, por la misma puerta que el Excel.

import type {
  Comprobacion,
  EstadoLectura,
  PreguntaLectura,
} from "@/modules/compras/types/lecturas.types";

export interface RenglonVentaAnterior {
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  /** Antes de IVA: el que se cobró. Es el que se carga. */
  valorUnitario: number;
  ivaTarifa: number;
}

export interface VentaAnteriorLeida {
  /** Como está impreso: «FEV 13892». */
  numero: string;
  fecha: string;
  cliente: { nombre: string; nit: string | null };
  /** Lo que dice el papel; `null` si no lo dice. */
  formaPago: "CONTADO" | "CREDITO" | null;
  renglones: RenglonVentaAnterior[];
  impreso: { subtotal: number; iva: number; total: number };
}

export interface VentaAnteriorCruzada {
  factura: VentaAnteriorLeida;
  comprobaciones: Comprobacion[];
  cliente: { id: string; nombre: string } | null;
  renglones: Array<{
    orden: number;
    leido: RenglonVentaAnterior;
    resuelto: { id: string; codigo: string; nombre: string } | null;
    motivo: string;
  }>;
  preguntas: PreguntaLectura[];
  /** Sin preguntas y con las cuentas dando: se puede cargar. */
  completa: boolean;
}

export interface LecturaVentasAnteriores {
  id: string;
  tipo: "VENTA_HISTORICA";
  estado: EstadoLectura;
  extraido: {
    facturas: VentaAnteriorCruzada[];
    /** Lo que impidió cruzar el archivo entero. */
    preguntas: PreguntaLectura[];
  } | null;
  /** Por número leído, la factura que ya lo tiene en el sistema. */
  enSistema: Record<string, { id: string; numero: string }>;
  error: string | null;
  creadoEn: string;
  leidoEn: string | null;
  motivoDescarte: string | null;
}

/** Lo que contesta una carga: cuántas entraron, o por qué ninguna. */
export interface ResultadoCargaAnteriores {
  registradas: number;
  problemas: Array<{ numero: string; problemas: string[] }>;
}
