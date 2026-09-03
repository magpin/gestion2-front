"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Reason: §10 — una sola instancia de QueryClient por árbol de cliente.
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
