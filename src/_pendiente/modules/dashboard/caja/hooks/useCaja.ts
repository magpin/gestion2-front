"use client";

import { useQuery } from "@tanstack/react-query";
import { cajaService } from "../services/caja.service";
import { hoyLocal } from "../lib/ciclo-caja";
import type { FiltrosAbono, FiltrosArqueo, FiltrosMovimiento } from "../types/caja.types";

/**
 * El efectivo que debería haber en el cajón.
 *
 * La fecha va explícita y se calcula en el navegador: el backend, si no la
 * recibe, la resuelve en UTC — y a las 7 de la noche en Colombia eso ya es
 * mañana. Ver `hoyLocal`.
 */
export const useGetSaldoCaja = (fecha: string = hoyLocal()) =>
  useQuery({
    queryKey: ["caja", "saldo", fecha],
    queryFn: () => cajaService.saldo(fecha),
  });

export const useGetMovimientos = (filtros: FiltrosMovimiento) =>
  useQuery({
    queryKey: ["caja", "movimientos", filtros],
    queryFn: () => cajaService.movimientos(filtros),
  });

/** Los dos lados en una sola petición: `ventas` y `compras` responden cada uno por lo suyo. */
export const useGetCartera = () =>
  useQuery({
    queryKey: ["cartera"],
    queryFn: () => cajaService.cartera(),
  });

export const useGetAbonos = (filtros: FiltrosAbono) =>
  useQuery({
    queryKey: ["abonos", filtros],
    queryFn: () => cajaService.abonos(filtros),
  });

export const useGetArqueos = (filtros: FiltrosArqueo) =>
  useQuery({
    queryKey: ["arqueos", filtros],
    queryFn: () => cajaService.arqueos(filtros),
  });

/**
 * Los arqueos recientes, para saber si el día ya se cerró.
 *
 * No hay endpoint que conteste «¿ya arquearon hoy?»: se deriva del listado con
 * `estadoDelCierre`. Un flag guardado necesitaría un proceso que lo moviera a
 * medianoche.
 */
export const useGetArqueosRecientes = () =>
  useQuery({
    queryKey: ["arqueos", "recientes"],
    queryFn: () => cajaService.arqueos({ limite: 30 }),
  });
