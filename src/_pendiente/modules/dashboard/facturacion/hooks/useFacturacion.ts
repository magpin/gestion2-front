"use client";

import { useQuery } from "@tanstack/react-query";
import { facturacionService } from "../services/facturacion.service";
import type { FiltrosFactura, FiltrosNotaCredito } from "../types/facturacion.types";

export const useGetFacturas = (filtros?: FiltrosFactura) =>
  useQuery({
    queryKey: ["facturas", filtros],
    queryFn: () => facturacionService.facturas(filtros),
  });

export const useGetFactura = (id?: string) =>
  useQuery({
    queryKey: ["facturas", "detalle", id],
    queryFn: () => facturacionService.factura(id as string),
    enabled: Boolean(id),
  });

/**
 * El impreso. Se pide solo cuando se va a ver o a devolver: son dos consultas
 * del lado del backend —la factura y el origen— y no hacen falta para listar.
 */
export const useGetImpresion = (id?: string) =>
  useQuery({
    queryKey: ["facturas", "impresion", id],
    queryFn: () => facturacionService.impresion(id as string),
    enabled: Boolean(id),
  });

export const useGetNotasCredito = (filtros?: FiltrosNotaCredito) =>
  useQuery({
    queryKey: ["notas-credito", filtros],
    queryFn: () => facturacionService.notas(filtros),
  });

export const useGetNotaCredito = (id?: string) =>
  useQuery({
    queryKey: ["notas-credito", "detalle", id],
    queryFn: () => facturacionService.nota(id as string),
    enabled: Boolean(id),
  });
