import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { ComprobanteManualView } from "@/modules/contabilidad/views/ComprobanteManualView";

/** El comprobante manual asistido. Mientras esté apagado, el asiento sigue en el diálogo. */
export default function ComprobanteManualPage() {
  if (!funcionActiva("comprobanteAsistido")) notFound();
  return <ComprobanteManualView />;
}
