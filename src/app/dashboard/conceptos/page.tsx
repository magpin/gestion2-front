import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { ConceptosView } from "@/modules/conceptos/views/ConceptosView";

/** Pieza nueva del menú: mientras esté apagada, la ruta no existe. */
export default function ConceptosPage() {
  if (!funcionActiva("conceptos")) notFound();
  return <ConceptosView />;
}
