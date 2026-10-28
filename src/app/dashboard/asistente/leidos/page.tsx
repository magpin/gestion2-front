import { MARIA_PROXIMAMENTE } from "@/modules/asistente/proximamente";
import { DocumentosLeidosView } from "@/modules/asistente/views/DocumentosLeidosView";
import { MariaProximamente } from "@/modules/asistente/views/MariaProximamente";

/** `?tipo=pedidos` abre en los pedidos de clientes; sin nada, en las facturas. */
export default async function DocumentosLeidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  if (MARIA_PROXIMAMENTE) return <MariaProximamente />;
  const { tipo } = await searchParams;
  return <DocumentosLeidosView inicial={tipo === "pedidos" ? "pedidos" : "facturas"} />;
}
