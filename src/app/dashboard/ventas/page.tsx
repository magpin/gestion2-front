import { redirect } from "next/navigation";

import { VentasView } from "@/modules/ventas/views/VentasView";

/**
 * `?seccion=pedidos` y `?seccion=anteriores` eran las pestañas «Pedidos leídos»
 * y «Ventas anteriores». Con el menú nuevo viven en María → Documentos leídos
 * y en Configurar empresa → Datos anteriores; los enlaces viejos siguen
 * llegando.
 */
export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { seccion } = await searchParams;
  if (seccion === "pedidos") redirect("/dashboard/asistente/leidos?tipo=pedidos");
  if (seccion === "anteriores") redirect("/dashboard/datos-anteriores");
  // Al volver de emitir una factura (la página de la Fase 8), a sus facturas.
  return <VentasView inicial={seccion === "facturas" ? "Facturas" : undefined} />;
}
