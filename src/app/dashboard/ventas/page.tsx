import { VentasView } from "@/modules/ventas/views/VentasView";

/**
 * `?seccion=pedidos` abre directo en «Pedidos leídos» y `?seccion=anteriores`
 * en «Ventas anteriores»: es adonde lleva el lote del chat cuando María leyó el
 * pedido de un cliente o facturas del sistema anterior.
 */
export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { seccion } = await searchParams;
  return (
    <VentasView
      inicial={
        seccion === "pedidos"
          ? "Pedidos leídos"
          : seccion === "anteriores"
            ? "Ventas anteriores"
            : undefined
      }
    />
  );
}
