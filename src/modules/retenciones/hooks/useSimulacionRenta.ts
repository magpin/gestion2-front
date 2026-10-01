"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { mensajeDeError } from "@/core/api/api";
import type { PropuestaRenta } from "../types/retenciones.types";

/**
 * La retención de renta que calcularía el servidor para lo que se está
 * editando. Espera a que se deje de escribir y conserva la anterior mientras
 * pide la nueva: la pantalla no parpadea en cada tecla.
 *
 * `pedido` es lo que va al servidor; `null` mientras falte algo para poder
 * calcular (el proveedor, una línea sin completar).
 */
export function useSimulacionRenta<T>(
  clave: string,
  pedido: T | null,
  pedir: (pedido: T) => Promise<PropuestaRenta>,
) {
  const serializado = pedido === null ? null : JSON.stringify(pedido);
  const [quieto, setQuieto] = useState(serializado);
  useEffect(() => {
    const t = setTimeout(() => setQuieto(serializado), 400);
    return () => clearTimeout(t);
  }, [serializado]);

  const consulta = useQuery({
    queryKey: ["retenciones", "simular", clave, quieto],
    queryFn: () => pedir(JSON.parse(quieto!) as T),
    enabled: quieto !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    propuesta: quieto === null ? undefined : consulta.data,
    cargando: consulta.isFetching,
    error: consulta.error ? mensajeDeError(consulta.error) : null,
  };
}
