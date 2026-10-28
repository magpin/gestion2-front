import { MARIA_PROXIMAMENTE } from "@/modules/asistente/proximamente";
import { AsistenteView } from "@/modules/asistente/views/AsistenteView";
import { MariaProximamente } from "@/modules/asistente/views/MariaProximamente";

/**
 * `?pregunta=` llega escrita al campo del chat, **sin mandarse**: la usa el
 * panel de María en Ventas, y quien la trae decide si la manda.
 */
export default async function AsistentePage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  if (MARIA_PROXIMAMENTE) return <MariaProximamente />;
  const { pregunta } = await searchParams;
  return (
    <AsistenteView
      preguntaInicial={typeof pregunta === "string" ? pregunta.slice(0, 500) : undefined}
    />
  );
}
