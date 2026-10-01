import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { EstadosFinancierosView } from "@/modules/estados-financieros/views/EstadosFinancierosView";

/** Pieza nueva del menú: mientras esté apagada, la ruta no existe. */
export default function EstadosFinancierosPage() {
  if (!funcionActiva("estadosFinancieros")) notFound();
  return <EstadosFinancierosView />;
}
