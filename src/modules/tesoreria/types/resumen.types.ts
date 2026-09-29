/** El resumen del mes por medio, como lo devuelve el backend (`common/resumen-medio.ts`). */
export interface MedioDelMes {
  medio: "CAJA" | "BANCO";
  id: string;
  /** «Caja principal», «Bancolombia». */
  nombre: string;
  /** «Efectivo», «Ahorros ···4521». */
  detalle: string;
  total: number;
  cantidad: number;
}

export interface ResumenDelMes {
  mes: string;
  total: number;
  cantidad: number;
  anulados: number;
  porMedio: MedioDelMes[];
}
