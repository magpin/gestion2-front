"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { lookupsService } from "./lookups.service";

// Debounce simple para no disparar una búsqueda por cada tecla.
function useDebounce<T>(valor: T, ms = 300): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return debounced;
}

export const useBuscarClientes = (q: string) => {
  const qDebounced = useDebounce(q);
  return useQuery({
    queryKey: ["lookup", "clientes", qDebounced],
    queryFn: () => lookupsService.buscarClientes(qDebounced),
    // Reason: con query vacío el backend devuelve la lista (limit 20) → el picker muestra
    // clientes al abrir, sin obligar a teclear. placeholderData evita parpadeo al filtrar.
    placeholderData: (anterior) => anterior,
  });
};

export const useBuscarProductos = (q: string) => {
  const qDebounced = useDebounce(q);
  return useQuery({
    queryKey: ["lookup", "productos", qDebounced],
    queryFn: () => lookupsService.buscarProductos(qDebounced),
    // Reason: lista visible al abrir (query vacío) → búsqueda más ágil al cotizar.
    placeholderData: (anterior) => anterior,
  });
};

export const useBuscarTerceros = (q: string) => {
  const qDebounced = useDebounce(q);
  return useQuery({
    queryKey: ["lookup", "terceros", qDebounced],
    queryFn: () => lookupsService.buscarTerceros(qDebounced),
    placeholderData: (anterior) => anterior,
  });
};

export const useBuscarProveedores = (q: string) => {
  const qDebounced = useDebounce(q);
  return useQuery({
    queryKey: ["lookup", "proveedores", qDebounced],
    queryFn: () => lookupsService.buscarProveedores(qDebounced),
    placeholderData: (anterior) => anterior,
  });
};

export const useUsuarios = () => {
  return useQuery({
    queryKey: ["lookup", "usuarios"],
    queryFn: () => lookupsService.listarUsuarios(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBuscarCuentas = (q: string) => {
  const qDebounced = useDebounce(q);
  return useQuery({
    queryKey: ["lookup", "cuentas", qDebounced],
    queryFn: () => lookupsService.buscarCuentas(qDebounced),
    // El PUC sembrado son 51 cuentas: traerlo entero al abrir no cuesta nada y
    // evita obligar a teclear para ver la lista.
    placeholderData: (anterior) => anterior,
  });
};
