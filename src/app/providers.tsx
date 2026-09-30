"use client";

import { useState } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { aviso } from "@/lib/avisos";

// Lo que mueve plata o asienta se ve en pantallas de otros módulos: la caja,
// los bancos, el tablero y los libros. Cada guardado recargaba solo lo suyo y
// un cobro por banco no aparecía en Movimientos hasta 5 minutos después. Tras
// cualquier guardado se recargan estas, y solo las que están en pantalla.
const TRAS_GUARDAR = [["tesoreria"], ["tablero"], ["libros"], ["cajas"], ["cuentas-bancarias"]];

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Reason: §10 — una sola instancia de QueryClient por árbol de cliente.
  const [queryClient] = useState(() => {
    const cliente: QueryClient = new QueryClient({
        // Una pantalla que no pudo cargar se veía igual que una vacía: "no hay
        // facturas" cuando lo que había era un error. Eso engaña, y en un
        // sistema contable engañar es peor que fallar. Cada consulta que falla
        // —después de su reintento— avisa, sin que cada pantalla tenga que
        // acordarse. La que ya muestra su propio error lo apaga con
        // `meta: { silencioso: true }`.
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.meta?.silencioso === true) return;
            aviso.falla(error, "cargar");
          },
        }),
        mutationCache: new MutationCache({
          onSuccess: () => {
            for (const queryKey of TRAS_GUARDAR) void cliente.invalidateQueries({ queryKey });
          },
        }),
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            // Reason: no refetch al reconectar → evita tormentas de refetch al volver al foco/red.
            refetchOnReconnect: false,
            // Reason: datos "frescos" 5 min → al volver a un módulo ya visitado NO refetch ni skeleton.
            staleTime: 5 * 60 * 1000,
            // Reason: la caché sobrevive 30 min tras desmontar el módulo → revisitar es instantáneo
            // (sin gcTime alto la caché se purga a los 5 min y el módulo vuelve a cargar de cero).
            gcTime: 30 * 60 * 1000,
          },
        },
    });
    return cliente;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
