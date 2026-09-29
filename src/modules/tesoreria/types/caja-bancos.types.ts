/** Lo que devuelven `GET /cajas/:id/dia` y `GET /tesoreria/movimientos` (Fase 6). */

export interface MovimientoDelDia {
  id: string;
  /** «11:42». */
  hora: string;
  concepto: string;
  /** El número del asiento: «CE-000074». */
  documento: string | null;
  /** Con quién: «Transportes Rápido Urabá». */
  tercero: string | null;
  entra: number;
  sale: number;
}

export interface DiaDeCaja {
  caja: {
    id: string;
    nombre: string;
    tipo: "PRINCIPAL" | "MENOR";
    responsable: string | null;
    /** El municipio de su sede. */
    sede: string | null;
  };
  fecha: string;
  saldo: number;
  abrioCon: number;
  entro: number;
  salio: number;
  movimientos: MovimientoDelDia[];
  ultimoArqueo: { fecha: string; diferencia: number; resultado: "CUADRO" | "SOBRANTE" | "FALTANTE" } | null;
}

export interface MovimientoTesoreria {
  id: string;
  fecha: string;
  hora: string;
  medio: "CAJA" | "BANCO";
  cuentaId: string;
  cuenta: string;
  concepto: string;
  documento: string | null;
  tercero: string | null;
  entra: number;
  sale: number;
  /** El saldo de esa cuenta después del movimiento. */
  saldo: number;
}

export interface MovimientosTesoreria {
  desde: string;
  hasta: string;
  movimientos: MovimientoTesoreria[];
  entro: number;
  salio: number;
}
