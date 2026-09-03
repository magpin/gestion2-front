import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea un valor numérico como pesos colombianos sin decimales (convención contable del backend).
export function formatCOP(valor: number | null | undefined): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor ?? 0);
}

// Formatea una fecha ISO del backend a "dd MMM yyyy" en locale es. Devuelve "—" si no hay fecha.
export function formatFecha(isoFecha: string | null | undefined): string {
  if (!isoFecha) {
    return "—";
  }
  return format(parseISO(isoFecha), "dd MMM yyyy", { locale: es });
}
