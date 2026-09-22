import { Suspense } from "react";

import { DetalleCuentaView } from "@/modules/plataforma/views/DetalleCuentaView";

export default async function CuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // La pestaña va en la URL (`?pestana=`).
  return (
    <Suspense>
      <DetalleCuentaView id={id} />
    </Suspense>
  );
}
