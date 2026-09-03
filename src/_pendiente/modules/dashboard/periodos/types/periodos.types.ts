// Espejo del backend (backend/src/modules/periodos).

export type EstadoPeriodo = "ABIERTO" | "CERRADO" | "REABIERTO";

export interface PeriodoContable {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoPeriodo;
  cerradoPorId: string | null;
  cerradoAt: string | null;
  createdAt: string;
}

export interface CreatePeriodoPayload {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}
