import { DocumentosLeidosView } from "@/modules/asistente/views/DocumentosLeidosView";

/** `?tipo=pedidos` abre en los pedidos de clientes; sin nada, en las facturas. */
export default async function DocumentosLeidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { tipo } = await searchParams;
  return <DocumentosLeidosView inicial={tipo === "pedidos" ? "pedidos" : "facturas"} />;
}
