import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { PagosView } from "@/modules/pagos/views/PagosView";

/** Pieza nueva del menú: mientras esté apagada, la ruta no existe. */
export default function PagosPage() {
  if (!funcionActiva("pagos")) notFound();
  return <PagosView />;
}
