"use client";

import { useQuery } from "@tanstack/react-query";
import { cotizacionesService } from "../services/cotizaciones.service";
import type { FiltrosCotizacion } from "../types/cotizaciones.types";

export const useGetCotizaciones = (filtros?: FiltrosCotizacion) =>
  useQuery({
    queryKey: ["cotizaciones", filtros],
    queryFn: () => cotizacionesService.obtenerTodas(filtros),
  });

export const useGetCotizacion = (id: string) =>
  useQuery({
    queryKey: ["cotizaciones", "detalle", id],
    queryFn: () => cotizacionesService.obtenerPorId(id),
    enabled: Boolean(id),
  });
