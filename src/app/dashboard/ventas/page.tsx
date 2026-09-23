import { VentasView } from "@/modules/ventas/views/VentasView";

/**
 * `?seccion=pedidos` abre directo en «Pedidos leídos»: es adonde lleva el lote
 * del chat cuando María leyó el pedido de un cliente.
 */
export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { seccion } = await searchParams;
  return <VentasView inicial={seccion === "pedidos" ? "Pedidos leídos" : undefined} />;
}
