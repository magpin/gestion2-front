import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { CobrosView } from "@/modules/cobros/views/CobrosView";

/** Pieza nueva del menú: mientras esté apagada, la ruta no existe. */
export default function CobrosPage() {
  if (!funcionActiva("cobros")) notFound();
  return <CobrosView />;
}
