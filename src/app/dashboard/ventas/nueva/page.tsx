import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { FacturaNuevaView } from "@/modules/ventas/views/FacturaNuevaView";

/**
 * La factura nueva como página. Mientras esté apagada, la factura sigue en el diálogo.
 *
 * `?anticipo=` la arranca desde un anticipo (su cliente, sus productos y el
 * anticipo aplicado); `?cliente=`, con el cliente elegido.
 */
export default async function FacturaNuevaPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  if (!funcionActiva("facturaPagina")) notFound();
  const { anticipo, cliente } = await searchParams;
  return (
    <FacturaNuevaView
      anticipoId={typeof anticipo === "string" ? anticipo : undefined}
      clienteId={typeof cliente === "string" ? cliente : undefined}
    />
  );
}
