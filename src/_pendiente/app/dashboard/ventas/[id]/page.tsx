import { VentaDetalleView } from "@/modules/dashboard/ventas/views/VentaDetalleView";

// Next 16: `params` es una Promise y hay que resolverla antes de usarla.
export default async function VentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VentaDetalleView ventaId={id} />;
}
