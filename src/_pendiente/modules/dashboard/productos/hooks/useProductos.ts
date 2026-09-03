"use client";

import { useQuery } from "@tanstack/react-query";
import { productosService } from "../services/productos.service";
import type { FiltrosProducto } from "../types/productos.types";

export const useGetProductos = (filtros?: FiltrosProducto) =>
  useQuery({
    queryKey: ["productos", filtros],
    queryFn: () => productosService.obtenerTodos(filtros),
  });

export const useGetProducto = (id: string) =>
  useQuery({
    queryKey: ["productos", "detalle", id],
    queryFn: () => productosService.obtenerPorId(id),
    enabled: Boolean(id),
  });

/**
 * La historia del producto. Cada fila trae el saldo DESPUÉS de aplicarse, así
 * que el stock a cualquier fecha se lee sin recalcular nada.
 */
export const useGetKardex = (id: string, limite = 100) =>
  useQuery({
    queryKey: ["productos", "detalle", id, "kardex", limite],
    queryFn: () => productosService.obtenerKardex(id, limite),
    enabled: Boolean(id),
  });

/** Lo que el bloque de INVENTARIO muestra en la pantalla de inicio. */
export const useGetStockCritico = (minimo = 0) =>
  useQuery({
    queryKey: ["productos", "stock-critico", minimo],
    queryFn: () => productosService.alertasStock(minimo),
  });
