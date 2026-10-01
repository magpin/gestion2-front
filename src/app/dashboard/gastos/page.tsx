import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { GastosView } from "@/modules/gastos/views/GastosView";

/** Pieza nueva del menú: mientras esté apagada, la ruta no existe. */
export default function GastosPage() {
  if (!funcionActiva("gastos")) notFound();
  return <GastosView />;
}
