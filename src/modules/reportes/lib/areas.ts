import {
  BookOpen,
  ChartColumn,
  Landmark,
  Package,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Area } from "../types/reportes.types";

/** El mismo ícono que el área lleva en la barra lateral. */
export const ICONO_AREA: Record<Area, LucideIcon> = {
  VENTAS: TrendingUp,
  CARTERA: Wallet,
  COMPRAS: ShoppingCart,
  INVENTARIO: Package,
  TESORERIA: Landmark,
  CONTABILIDAD: BookOpen,
};

export const ICONO_REPORTES = ChartColumn;
