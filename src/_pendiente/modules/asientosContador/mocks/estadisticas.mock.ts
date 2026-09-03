// ⚠️ MOCK TEMPORAL — BORRAR ANTES DE PRODUCCIÓN
// Registrado en: frontend/MOCKS-CONTADOR.md
// Datos ficticios para verificar los gráficos del tablero de Asientos del contador
// cuando el rango real viene vacío. Se activa con NEXT_PUBLIC_MOCK_CONTADOR="1".
import type { EstadisticasAsientos } from "../types/asientos.types";

const porDia = Array.from({ length: 30 }, (_, i) => {
  const debitos = Math.round(500_000 + Math.sin(i / 3) * 260_000 + i * 6_000);
  return {
    etiqueta: `2026-07-${String(i + 1).padStart(2, "0")}`,
    debitos,
    creditos: debitos, // partida doble: deben cuadrar
  };
});

const totalDebitos = porDia.reduce((s, d) => s + d.debitos, 0);

export const ESTADISTICAS_ASIENTOS_MOCK: EstadisticasAsientos = {
  kpis: {
    numAsientos: 128,
    totalDebitos,
    totalCreditos: totalDebitos,
    descuadre: 0,
  },
  porOrigen: [
    { origen: "VENTA", cantidad: 54, total: 12_400_000 },
    { origen: "COMPRA", cantidad: 31, total: 7_800_000 },
    { origen: "GASTO", cantidad: 22, total: 3_200_000 },
    { origen: "NOMINA", cantidad: 9, total: 5_600_000 },
    { origen: "AJUSTE", cantidad: 7, total: 1_100_000 },
    { origen: "CAJA", cantidad: 5, total: 640_000 },
  ],
  cuentasMovidas: [
    { cuenta: "1105 - Caja", movimiento: 9_800_000 },
    { cuenta: "4135 - Comercio al por mayor", movimiento: 8_600_000 },
    { cuenta: "1435 - Mercancías no fabricadas", movimiento: 6_200_000 },
    { cuenta: "2408 - IVA por pagar", movimiento: 3_100_000 },
    { cuenta: "5135 - Servicios", movimiento: 2_180_000 },
    { cuenta: "2205 - Proveedores nacionales", movimiento: 1_900_000 },
    { cuenta: "5105 - Gastos de personal", movimiento: 1_400_000 },
    { cuenta: "1305 - Clientes", movimiento: 1_120_000 },
  ],
  porDia,
};
