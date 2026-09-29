import { redirect } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { RetencionesView } from "@/modules/retenciones/views/RetencionesView";

/** Con Impuestos encendido, Retenciones vive ahí, en «Tarifas y terceros» (PC6). */
export default function RetencionesPage() {
  if (funcionActiva("impuestos")) redirect("/dashboard/impuestos?pestana=tarifas");
  return <RetencionesView />;
}
