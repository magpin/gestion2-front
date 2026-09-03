"use client";

import { useQuery } from "@tanstack/react-query";
import { asientosService } from "../services/asientos.service";
import type { FiltrosAsiento } from "../types/asientos.types";

export const useGetAsientos = (filtros?: FiltrosAsiento) => {
  return useQuery({
    queryKey: ["asientos", filtros],
    queryFn: () => asientosService.obtenerTodos(filtros),
  });
};

export const useGetAsiento = (id: string) => {
  return useQuery({
    queryKey: ["asientos", "detalle", id],
    queryFn: () => asientosService.obtenerPorId(id),
    enabled: Boolean(id),
  });
};
