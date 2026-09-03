import type { FiltroPaginado } from "@/core/types/pagination.types";
// Espejo del backend (backend/src/modules/puc).

export type NaturalezaCuenta = "DEBITO" | "CREDITO";

export interface PucCuenta {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  naturaleza: NaturalezaCuenta | string;
  transaccional: boolean;
  parentId: string | null;
  // Solo presentes en findByCodigo (GET /puc/:codigo).
  parent?: PucCuenta | null;
  hijos?: PucCuenta[];
}

export interface FiltrosPuc extends FiltroPaginado {
  codigo?: string;
  nombre?: string;
  page?: number;
  limit?: number;
}

// Clases raíz del PUC (Decreto 2650) — usadas como nodos raíz del árbol lazy.
export const CLASES_PUC: { codigo: string; nombre: string }[] = [
  { codigo: "1", nombre: "Activo" },
  { codigo: "2", nombre: "Pasivo" },
  { codigo: "3", nombre: "Patrimonio" },
  { codigo: "4", nombre: "Ingresos" },
  { codigo: "5", nombre: "Gastos" },
  { codigo: "6", nombre: "Costos de ventas" },
  { codigo: "7", nombre: "Costos de producción o de operación" },
  { codigo: "8", nombre: "Cuentas de orden deudoras" },
  { codigo: "9", nombre: "Cuentas de orden acreedoras" },
];
