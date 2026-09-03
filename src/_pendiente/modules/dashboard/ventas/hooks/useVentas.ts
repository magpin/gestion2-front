"use client";

import { useQuery } from "@tanstack/react-query";
import { ventasService } from "../services/ventas.service";
import type { FiltrosVenta } from "../types/ventas.types";

export const useGetVentas = (filtros?: FiltrosVenta) =>
  useQuery({
    queryKey: ["ventas", filtros],
    queryFn: () => ventasService.obtenerTodas(filtros),
  });

export const useGetVenta = (id: string) =>
  useQuery({
    queryKey: ["ventas", "detalle", id],
    queryFn: () => ventasService.obtenerPorId(id),
    enabled: Boolean(id),
  });

export const useGetCarteraClientes = (enabled = true) =>
  useQuery({
    queryKey: ["ventas", "cartera"],
    queryFn: () => ventasService.obtenerCartera({ limite: 100 }),
    enabled,
  });

export const useGetSaldoCliente = (terceroId?: string) =>
  useQuery({
    queryKey: ["ventas", "saldo", terceroId],
    queryFn: () => ventasService.saldoCliente(terceroId as string),
    enabled: Boolean(terceroId),
  });

/** Las líneas bajo el piso sin firmar. El vendedor las ve; el director las firma. */
export const useGetAutorizacionesPendientes = (enabled = true) =>
  useQuery({
    queryKey: ["ventas", "autorizaciones"],
    queryFn: () => ventasService.pendientesDeAutorizacion(),
    enabled,
  });

/** Qué ventas ya tienen factura. Vive del lado de `facturacion`, no de la venta. */
export const useGetVentasFacturadas = () =>
  useQuery({
    queryKey: ["facturas", "por-venta"],
    queryFn: () => ventasService.facturadas(),
  });
