import type { Metadata } from "next";

import { ConsumoIaView } from "@/modules/consumo-ia/ConsumoIaView";

/**
 * El tablero de consumo de la IA, aparte de todo el sistema: no lleva el
 * layout del dashboard ni la sesión de una empresa, y `proxy.ts` no lo mira.
 * Lo protege la clave del tablero, que se pide en la propia página.
 */
export const metadata: Metadata = {
  title: "Consumo de la IA",
  robots: { index: false, follow: false },
};

export default function ConsumoIaPage() {
  return <ConsumoIaView />;
}
