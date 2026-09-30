import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { AnticiposView } from "@/modules/anticipos/views/AnticiposView";

/** Va con Cobros: mientras Cobros esté apagado, Anticipos tampoco existe. */
export default function AnticiposPage() {
  if (!funcionActiva("cobros")) notFound();
  return <AnticiposView />;
}
