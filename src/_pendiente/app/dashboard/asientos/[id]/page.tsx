import { AsientoDetalleView } from "@/modules/dashboard/asientos/views/AsientoDetalleView";

// Next 16: params es una Promise que debe resolverse antes de usarse.
export default async function AsientoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AsientoDetalleView asientoId={id} />;
}
