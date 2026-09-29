import { notFound } from "next/navigation";

import { funcionActiva } from "@/core/config/funciones";
import { ImpuestosView, type Pestana } from "@/modules/impuestos/views/ImpuestosView";

/** Pieza nueva del menú: mientras esté apagada, la ruta no existe. */
export default async function ImpuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  if (!funcionActiva("impuestos")) notFound();
  const { pestana } = await searchParams;
  const inicial: Pestana =
    pestana === "retencion" || pestana === "iva" || pestana === "ica" || pestana === "renta" || pestana === "tarifas" ? pestana : "calendario";
  return <ImpuestosView inicial={inicial} />;
}
