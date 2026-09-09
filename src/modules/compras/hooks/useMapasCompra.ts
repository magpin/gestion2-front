"use client";

import { useQuery } from "@tanstack/react-query";
import { productosApi } from "@/modules/inventario/services/inventario.service";
import { tercerosApi } from "@/modules/terceros/services/terceros.service";

/**
 * Los documentos de compra solo guardan `tercero_id`/`producto_id` —
 * mostrar "Proveedor" o "Producto" en una lista exige el nombre, no el id.
 * Mismo criterio que `useMapasVenta.ts` de `ventas`: se trae la primera
 * página una sola vez y se arma un mapa en el cliente.
 *
 * Límite conocido: más de 50 proveedores o productos deja el id crudo para
 * los que caen fuera de esa primera página.
 */
export function useMapaProveedores() {
  const { data } = useQuery({
    queryKey: ["terceros", "proveedores-para-compras"],
    queryFn: () =>
      tercerosApi.listar({ esProveedor: true, incluirInactivos: true }),
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
    queryKey: ["productos", "para-compras"],
    queryFn: () => productosApi.listar({ incluirInactivos: true }),
    staleTime: 5 * 60_000,
  });

  const mapa = new Map<string, { codigo: string; nombre: string }>();
  for (const p of data?.datos ?? []) {
    mapa.set(p.id, { codigo: p.codigo, nombre: p.nombre });
  }
  return mapa;
}
