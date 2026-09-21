"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { armadorService } from "../services/armador.service";
import type { ClaveOrigen, Definicion } from "../types/armador.types";

export const llavesArmador = {
  origenes: ["reportes", "armador", "origenes"] as const,
  valores: (origen: ClaveOrigen, columna: string) =>
    ["reportes", "armador", "valores", origen, columna] as const,
  muestra: (def: Definicion) => ["reportes", "armador", "muestra", JSON.stringify(def)] as const,
  guardados: ["reportes", "guardados"] as const,
  guardado: (id: string) => ["reportes", "guardados", id] as const,
};

export function useOrigenes() {
  return useQuery({
    queryKey: llavesArmador.origenes,
    queryFn: armadorService.origenes,
    staleTime: Infinity,
  });
}

export function useValores(origen: ClaveOrigen, columna: string, activo: boolean) {
  return useQuery({
    queryKey: llavesArmador.valores(origen, columna),
    queryFn: () => armadorService.valores(origen, columna),
    enabled: activo,
    staleTime: 5 * 60_000,
  });
}

/** Un valor que se asienta: cambia solo cuando dejó de cambiar por `ms`. */
function useAsentado<T>(valor: T, ms: number): T {
  const [asentado, setAsentado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAsentado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return asentado;
}

/**
 * La vista previa del armador. Espera medio segundo quieta antes de pedir: sin
 * eso, marcar tres columnas seguidas son tres consultas, y la tabla parpadea.
 * Mientras llega la nueva, se sigue viendo la anterior.
 */
export function useMuestra(def: Definicion | null) {
  const asentada = useAsentado(def, 500);
  return useQuery({
    queryKey: asentada ? llavesArmador.muestra(asentada) : ["reportes", "armador", "muestra", "nada"],
    queryFn: ({ signal }) => armadorService.muestra(asentada!, signal),
    enabled: asentada !== null && asentada.columnas.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useGuardados() {
  return useQuery({ queryKey: llavesArmador.guardados, queryFn: armadorService.guardados });
}

export function useGuardado(id: string | null) {
  return useQuery({
    queryKey: llavesArmador.guardado(id ?? ""),
    queryFn: () => armadorService.guardado(id!),
    enabled: id !== null,
    retry: false,
  });
}

/** Guardar, renombrar, archivar: todo refresca la lista. */
export function useCambiosGuardados() {
  const qc = useQueryClient();
  const refrescar = () => qc.invalidateQueries({ queryKey: llavesArmador.guardados });
  return {
    guardar: useMutation({
      mutationFn: (v: { nombre: string; definicion: Definicion }) =>
        armadorService.guardar(v.nombre, v.definicion),
      onSuccess: refrescar,
    }),
    actualizar: useMutation({
      mutationFn: (v: { id: string; nombre?: string; definicion?: Definicion }) =>
        armadorService.actualizar(v.id, { nombre: v.nombre, definicion: v.definicion }),
      onSuccess: refrescar,
    }),
    archivar: useMutation({
      mutationFn: (id: string) => armadorService.archivar(id),
      onSuccess: refrescar,
    }),
  };
}
