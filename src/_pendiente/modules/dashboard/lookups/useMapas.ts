"use client";

import { useQuery } from "@tanstack/react-query";
import { productosService } from "@/modules/dashboard/productos/services/productos.service";
import { tercerosService } from "@/modules/dashboard/terceros/services/terceros.service";

/**
 * Nombre del cliente y del producto por id, para las bandejas y los detalles.
 *
 * Los documentos guardan `tercero_id` y `producto_id` y nada más: el nombre vive
 * en el módulo que es su dueño. Copiarlo dentro de la venta dejaría un documento
 * diciendo un nombre viejo el día que el cliente cambie de razón social.
 *
 * Se trae el catálogo una vez, cacheado, y se arma el mapa acá. Con catálogos
 * grandes esto se cambia por un `?ids=` en el backend; a este volumen, una
 * consulta cacheada es más simple que un endpoint nuevo.
 */
export function useMapaTerceros() {
  const { data } = useQuery({
    queryKey: ["terceros", "mapa"],
    queryFn: () => tercerosService.obtenerTodos({ limite: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const mapa = new Map((data?.datos ?? []).map((t) => [t.id, t]));

  return {
    tercero: (id: string) => mapa.get(id),
    nombre: (id: string) => mapa.get(id)?.nombre ?? "—",
    documento: (id: string) => mapa.get(id)?.numeroDocumento ?? "",
  };
}

export function useMapaProductos() {
  const { data } = useQuery({
    queryKey: ["productos", "mapa"],
    queryFn: () => productosService.obtenerTodos({ limite: 200, incluirInactivos: true }),
    staleTime: 5 * 60 * 1000,
  });

  const mapa = new Map((data?.datos ?? []).map((p) => [p.id, p]));

  return {
    producto: (id: string) => mapa.get(id),
    nombre: (id: string) => mapa.get(id)?.nombre ?? "—",
    codigo: (id: string) => mapa.get(id)?.codigo ?? "",
  };
}
