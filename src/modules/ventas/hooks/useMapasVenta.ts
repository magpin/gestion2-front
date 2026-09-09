"use client";

import { useQuery } from "@tanstack/react-query";
import { productosApi } from "@/modules/inventario/services/inventario.service";
import { tercerosApi } from "@/modules/terceros/services/terceros.service";

/**
 * Los documentos de venta solo guardan `tercero_id`/`producto_id` — mostrar
 * "Cliente" o "Producto" en una lista exige el nombre, no el id. En vez de
 * pedirlo fila por fila (N+1), se trae la primera página de clientes y de
 * productos una sola vez y se arma un mapa en el cliente — mismo criterio
 * que ya usa `plan-cuentas` para su propio catálogo completo.
 *
 * Límite conocido: si una empresa tiene más de 50 clientes o 50 productos,
 * los que caen fuera de esa primera página se muestran por su id. Es un
 * límite real, no un error — se resuelve el día que alguien lo necesite,
 * no antes.
 */
export function useMapaClientes() {
  const { data } = useQuery({
    queryKey: ["terceros", "clientes-para-ventas"],
    queryFn: () => tercerosApi.listar({ esCliente: true, incluirInactivos: true }),
    staleTime: 5 * 60_000,
  });

  const mapa = new Map<string, string>();
  for (const t of data?.datos ?? []) {
    mapa.set(t.id, t.nombre);
  }
  return mapa;
}

export function useMapaProductos() {
  const { data } = useQuery({
    queryKey: ["productos", "para-ventas"],
    queryFn: () => productosApi.listar({ incluirInactivos: true }),
    staleTime: 5 * 60_000,
  });

  const mapa = new Map<string, { codigo: string; nombre: string }>();
  for (const p of data?.datos ?? []) {
    mapa.set(p.id, { codigo: p.codigo, nombre: p.nombre });
  }
  return mapa;
}
