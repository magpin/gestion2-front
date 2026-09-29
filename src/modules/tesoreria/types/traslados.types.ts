/** Espejo de `TrasladoService` en el backend (`tesoreria`). */

export type MedioTraslado = "CAJA" | "BANCO";

export interface Traslado {
  id: string;
  numero: string;
  fecha: string;
  origen: { medio: MedioTraslado; id: string; nombre: string };
  destino: { medio: MedioTraslado; id: string; nombre: string };
  valor: number;
  detalle: string;
  /** El 4×1000 que cobró el banco de origen. */
  gmf: number;
  estado: "VIGENTE" | "ANULADO";
  motivoAnulacion: string | null;
}

export interface ExtremoTrasladoInput {
  medio: MedioTraslado;
  cajaId?: string;
  cuentaBancariaId?: string;
}

export interface CrearTrasladoInput {
  fecha: string;
  origen: ExtremoTrasladoInput;
  destino: ExtremoTrasladoInput;
  valor: number;
  detalle?: string;
  /** El banco no lo cobró aunque la regla diga que sí. */
  sinGmf?: boolean;
}

/** Antes de guardar: el 4×1000, el número que le toca y las cuentas del asiento. */
export interface PreviaTraslado {
  causa: boolean;
  gmf: number;
  numero: string;
  cuentas: {
    origen: { codigo: string; nombre: string } | null;
    destino: { codigo: string; nombre: string } | null;
    gmf: { codigo: string; nombre: string } | null;
  };
}
