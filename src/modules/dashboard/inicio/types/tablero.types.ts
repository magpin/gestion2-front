/** Lo que devuelve `GET /tablero/plata`. Espejo de `tablero.reglas.ts` del backend. */

/** Un texto con montos: los números se pintan como plata. */
export type Parte = string | number;

export type AccionAlerta =
  | { tipo: "MARIA"; pregunta: string }
  | { tipo: "IR"; href: string; etiqueta: string };

export interface Alerta {
  clave: string;
  partes: Parte[];
  accion: AccionAlerta;
}

export interface Tablero {
  hoy: string;
  plataHoy: {
    total: number;
    lugares: Array<{ id: string; medio: "CAJA" | "BANCO"; nombre: string; saldo: number }>;
  };
  teDeben: {
    total: number;
    facturas: number;
    clientes: number;
    vencido: number;
    masVencidos: Array<{ terceroId: string; nombre: string; vencido: number; facturas: number; dias: number }>;
  };
  debes: {
    total: number;
    facturas: number;
    proveedores: number;
    vencido: number;
    proximos: Array<{
      compraId: string;
      proveedor: string;
      numero: string;
      vence: string;
      valor: number;
      vencida: boolean;
      descuentoPct: number | null;
      descuentoHasta: string | null;
    }>;
  };
  /** Los siete días desde hoy. */
  semana: Array<{ dia: string; entra: number; sale: number }>;
  /** `null` para quien no ve los estados financieros. */
  resultadoMes: {
    mes: string;
    ingresos: number;
    costosYGastos: number;
    utilidad: number;
    mesAnterior: string | null;
    variacion: number | null;
  } | null;
  alertas: Alerta[];
}
