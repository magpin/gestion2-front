import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { CompraNuevaView } from "@/modules/compras/views/CompraNuevaView";

/** La compra nueva como página. Mientras esté apagada, la compra sigue en el diálogo. */
export default function CompraNuevaPage() {
  if (!funcionActiva("compraPagina")) notFound();
  return <CompraNuevaView />;
}
