import { DetalleCuentaView } from "@/modules/plataforma/views/DetalleCuentaView";

export default async function CuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleCuentaView id={id} />;
}
