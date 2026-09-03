"use client";

import { useQuery } from "@tanstack/react-query";
import { comprasService } from "../services/compras.service";
import type { FiltrosCompra } from "../types/compras.types";

export const useGetCompras = (filtros?: FiltrosCompra) =>
  useQuery({
    queryKey: ["compras", filtros],
    queryFn: () => comprasService.obtenerTodas(filtros),
  });

export const useGetCompra = (id: string) =>
  useQuery({
    queryKey: ["compras", "detalle", id],
    queryFn: () => comprasService.obtenerPorId(id),
    enabled: Boolean(id),
  });

/** A quién le debo. Es el listado con `soloPendientes`, no un endpoint aparte. */
export const useGetCarteraProveedores = (enabled = true) =>
  useQuery({
    queryKey: ["compras", "cartera"],
    queryFn: () => comprasService.obtenerCartera({ limite: 100 }),
    enabled,
  });

export const useGetSaldoProveedor = (terceroId?: string) =>
  useQuery({
    queryKey: ["compras", "saldo", terceroId],
    queryFn: () => comprasService.saldoProveedor(terceroId as string),
    enabled: Boolean(terceroId),
  });
