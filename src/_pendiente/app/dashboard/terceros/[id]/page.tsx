import { TerceroDetalleView } from "@/modules/dashboard/terceros/views/TerceroDetalleView";

// Next 16: params es una Promise que debe resolverse antes de usarse.
export default async function TerceroDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TerceroDetalleView terceroId={id} />;
}
