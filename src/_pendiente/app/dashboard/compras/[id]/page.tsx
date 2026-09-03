import { CompraDetalleView } from "@/modules/dashboard/compras/views/CompraDetalleView";

// Next 16: params es una Promise que debe resolverse antes de usarse.
export default async function CompraDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompraDetalleView compraId={id} />;
}
