// Espejo EXACTO del backend (backend/src/modules/dashboard/dashboard.service.ts).
// GET /dashboard?periodo=hoy|semana|mes|anio  → DashboardResumen
// GET /dashboard/alertas                       → AlertaDashboard[]

export type PeriodoDashboard = "hoy" | "semana" | "mes" | "anio";

export interface PuntoVenta {
  etiqueta: string;
  valor: number;
}

export interface OtEstadoConteo {
  estado: string;
  cantidad: number;
}

export interface ClienteTop {
  nombre: string;
  numeroDocumento: string;
  totalCompras: number;
  numTransacciones: number;
}

export interface DashboardResumen {
  ventas: { totalVentas: number; numVentas: number; ticketPromedio: number };
  taller: { otCompletadas: number; otPendientes: number; tiempoPromedio: number };
  inventario: { productosBajoMinimo: number; valorInventario: number };
  financiero: { ingresos: number; gastos: number; utilidadBruta: number };
  ventasPorDia: PuntoVenta[];
  otsPorEstado: OtEstadoConteo[];
  topClientes: ClienteTop[];
  carteraVencida: number;
}

export type TipoAlerta = "OT_VENCIDA" | "STOCK_CRITICO" | "CARTERA_VENCIDA";
export type PrioridadAlerta = "alta" | "media" | "baja";

export interface AlertaDashboard {
  tipo: TipoAlerta;
  descripcion: string;
  id: string;
  prioridad: PrioridadAlerta;
}

export const PERIODOS: { id: PeriodoDashboard; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "anio", label: "Año" },
];
