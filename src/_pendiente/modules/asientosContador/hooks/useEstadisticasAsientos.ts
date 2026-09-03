"use client";

import { useQuery } from "@tanstack/react-query";
import { asientosService } from "../services/asientos.service";
// ⚠️ MOCK TEMPORAL — registrado en frontend/MOCKS-CONTADOR.md. Borrar con su uso.
import { ESTADISTICAS_ASIENTOS_MOCK } from "../mocks/estadisticas.mock";

export const useEstadisticasAsientos = (rango: {
  desde: string;
  hasta: string;
}) =>
  useQuery({
    queryKey: ["asientos", "estadisticas", rango],
    queryFn: () => asientosService.obtenerEstadisticas(rango),
    // ⚠️ MOCK TEMPORAL: si NEXT_PUBLIC_MOCK_CONTADOR="1" y el rango real viene
    // vacío, devuelve datos ficticios para ver los gráficos. Quitar al terminar.
    select: (respuesta) => {
      const data = respuesta;
      if (
        process.env.NEXT_PUBLIC_MOCK_CONTADOR === "1" &&
        (!data || data.kpis.numAsientos === 0)
      ) {
        return ESTADISTICAS_ASIENTOS_MOCK;
      }
      return data;
    },
  });
