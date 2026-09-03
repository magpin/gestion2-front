"use client";

import { useQuery } from "@tanstack/react-query";
import { tercerosService } from "../services/terceros.service";
import type { FiltrosTercero } from "../types/terceros.types";

// El backend devuelve la carga útil directa: ya no hay `select` que desenvuelva
// un `{status, message, data}`.

export const useGetTerceros = (filtros?: FiltrosTercero) =>
  useQuery({
    queryKey: ["terceros", filtros],
    queryFn: () => tercerosService.obtenerTodos(filtros),
  });

export const useGetTercero = (id: string) =>
  useQuery({
    queryKey: ["terceros", "detalle", id],
    queryFn: () => tercerosService.obtenerPorId(id),
    enabled: Boolean(id),
  });

/** Clientes, para los selectores de cotización y venta. */
export const useGetClientes = (buscar?: string) =>
  useQuery({
    queryKey: ["terceros", "clientes", buscar],
    queryFn: () => tercerosService.obtenerTodos({ soloClientes: true, buscar, limite: 50 }),
  });

/** Proveedores, para el selector de la compra. */
export const useGetProveedores = (buscar?: string) =>
  useQuery({
    queryKey: ["terceros", "proveedores", buscar],
    queryFn: () => tercerosService.obtenerTodos({ soloProveedores: true, buscar, limite: 50 }),
  });
