import { TerceroFormView } from "@/modules/dashboard/terceros/views/TerceroFormView";

// Next 16: params es una Promise que debe resolverse antes de usarse.
export default async function EditarTerceroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TerceroFormView terceroId={id} />;
}
