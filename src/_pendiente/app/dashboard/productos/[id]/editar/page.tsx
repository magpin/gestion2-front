import { ProductoFormView } from "@/modules/dashboard/productos/views/ProductoFormView";

// Next 16: params es una Promise que debe resolverse antes de usarse.
export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductoFormView productoId={id} />;
}
