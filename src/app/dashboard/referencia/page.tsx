import { ReferenciaView } from "@/modules/catalogos/views/ReferenciaView";

/** `?catalogo=ciiu` abre directo en Actividades CIIU; sin nada, en el PUC. */
export default async function ReferenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { catalogo } = await searchParams;
  return <ReferenciaView inicial={catalogo === "ciiu" ? "Actividades CIIU" : "PUC"} />;
}
