// ⚠️ MOCK TEMPORAL — BORRAR ANTES DE PRODUCCIÓN
// Registrado en: frontend/MOCKS-CONTADOR.md
// Datos ficticios solo para verificar que los gráficos del Inicio del contador
// renderizan cuando /dashboard devuelve vacío (p. ej. mes en curso sin datos).
// Se activa con NEXT_PUBLIC_MOCK_CONTADOR="1" (ver InicioContadorView).
import type {
  DashboardResumen,
} from "../types/dashboard.types";

const ventasPorDia = Array.from({ length: 30 }, (_, i) => ({
  etiqueta: `2026-07-${String(i + 1).padStart(2, "0")}`,
  valor: Math.round(520_000 + Math.sin(i / 3) * 240_000 + i * 8_000),
}));

const ingresos = ventasPorDia.reduce((s, d) => s + d.valor, 0);
const gastos = Math.round(ingresos * 0.62);

export const DASHBOARD_CONTADOR_MOCK: DashboardResumen = {
  ventas: {
    totalVentas: ingresos,
    numVentas: 143,
    ticketPromedio: Math.round(ingresos / 143),
  },
  taller: { otCompletadas: 38, otPendientes: 11, tiempoPromedio: 2.4 },
  inventario: { productosBajoMinimo: 7, valorInventario: 24_800_000 },
  financiero: { ingresos, gastos, utilidadBruta: ingresos - gastos },
  ventasPorDia,
  otsPorEstado: [
    { estado: "Completada", cantidad: 38 },
    { estado: "En proceso", cantidad: 6 },
    { estado: "Pendiente", cantidad: 5 },
  ],
  topClientes: [
    { nombre: "Comercial Andina S.A.S.", numeroDocumento: "900123456", totalCompras: 4_120_000, numTransacciones: 12 },
    { nombre: "Distribuidora El Sol", numeroDocumento: "830987654", totalCompras: 3_540_000, numTransacciones: 9 },
    { nombre: "Ferretería La 80", numeroDocumento: "800112233", totalCompras: 2_780_000, numTransacciones: 15 },
  ],
  carteraVencida: 3_260_000,
};

