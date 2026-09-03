"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pucService } from "../services/puc.service";
import type { FiltrosPuc } from "../types/puc.types";

// Debounce simple para el buscador (300ms, §F8).
function useDebounce<T>(valor: T, ms = 300): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return debounced;
}

export const useBuscarPuc = (filtros: FiltrosPuc, habilitado: boolean) => {
  const codigoDebounced = useDebounce(filtros.codigo ?? "");
  const nombreDebounced = useDebounce(filtros.nombre ?? "");
  return useQuery({
    queryKey: ["puc", "buscar", codigoDebounced, nombreDebounced, filtros.pagina, filtros.limit],
    queryFn: () =>
      pucService.buscar({
        ...(codigoDebounced ? { codigo: codigoDebounced } : {}),
        ...(nombreDebounced ? { nombre: nombreDebounced } : {}),
        page: filtros.pagina ?? 1,
        limit: filtros.limit ?? 50,
      }),
    enabled: habilitado,
    placeholderData: (anterior) => anterior,
  });
};

export const useCuentaPuc = (codigo: string, habilitado: boolean) => {
  return useQuery({
    queryKey: ["puc", "cuenta", codigo],
    queryFn: () => pucService.obtenerPorCodigo(codigo),
    enabled: habilitado && Boolean(codigo),
    staleTime: 24 * 60 * 60 * 1000,
  });
};
