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

// Pesos con centavos solo si los hay: el precio sin IVA de la tinta es
// $25.210,08 y mostrarlo como $25.210 sería decir otro número. Es el formato de
// los totales de una factura, que el servidor lleva en centavos.
export function formatCOPExacto(valor: number | null | undefined): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor ?? 0);
}

// Formatea una fecha del backend a "dd MMM yyyy" en locale es. Devuelve "—" si no hay fecha.
//
// Hay dos clases de fecha y cada una se lee distinto:
// - Una fecha sin hora (`AAAA-MM-DD`, lo que la API devuelve para las columnas
//   `date`: la fecha de una factura, de un asiento) es un día del calendario.
//   `parseISO` la deja a la medianoche LOCAL, así que sale el mismo día en
//   cualquier zona. Con `new Date("AAAA-MM-DD")` quedaría a la medianoche UTC y
//   en Colombia (UTC-5) saldría el día anterior.
// - Un instante (`creado_en`, `cerrado_en`: trae hora y zona) se muestra en la
//   zona del navegador, que es lo correcto.
export function formatFecha(isoFecha: string | null | undefined): string {
  if (!isoFecha) {
    return "—";
  }
  return format(parseISO(isoFecha), "dd MMM yyyy", { locale: es });
}

// El día de hoy como lo ve la empresa: AAAA-MM-DD en hora de Colombia, igual
// que `hoyEnColombia()` del backend. No se usa la del navegador: un portátil
// puesto en otra zona —o alguien de viaje— mandaría una fecha que el backend
// rechaza, porque para él hoy es otro día.
export function hoyEnColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
