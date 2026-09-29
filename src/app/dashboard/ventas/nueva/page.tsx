import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { FacturaNuevaView } from "@/modules/ventas/views/FacturaNuevaView";

/** La factura nueva como página. Mientras esté apagada, la factura sigue en el diálogo. */
export default function FacturaNuevaPage() {
  if (!funcionActiva("facturaPagina")) notFound();
  return <FacturaNuevaView />;
}
