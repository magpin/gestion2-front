import { CotizacionDetalleView } from "@/modules/dashboard/cotizaciones/views/CotizacionDetalleView";

// Next 16: `params` es una Promise y hay que resolverla antes de usarla.
export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CotizacionDetalleView cotizacionId={id} />;
}
