import { ProductoDetalleView } from "@/modules/dashboard/productos/views/ProductoDetalleView";

// Next 16: params es una Promise que debe resolverse antes de usarse.
export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductoDetalleView productoId={id} />;
}
