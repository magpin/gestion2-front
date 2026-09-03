"use client";

import { Card } from "@/components/ui/card";
import { cn, formatCOP } from "@/lib/utils";
import { KardexTable } from "../components/KardexTable";
import { useGetKardex } from "../hooks/useProductos";
import { bajoCritico, type Producto } from "../types/productos.types";

interface ProductoDetalleContenidoProps {
  producto: Producto;
}

// Cuerpo read-only del detalle de producto. Reutilizado por la página de deep-link
// (ProductoDetalleView) y por el modal (ProductoDetalleModal).
export function ProductoDetalleContenido({ producto }: ProductoDetalleContenidoProps) {
  const critico = bajoCritico(producto);
  // El kardex no viene dentro del producto: es su propia consulta.
  const { data: movimientos } = useGetKardex(producto.id, 20);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <Dato etiqueta="Stock actual" valor={String(Number(producto.stock))} critico={critico} />
          <Dato etiqueta="Precio venta" valor={formatCOP(Number(producto.precioVenta))} />
          <Dato etiqueta="Precio mínimo" valor={formatCOP(Number(producto.margenMinimoPct))} />
        </div>
      </Card>

      <Card className="gap-4 p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Dato etiqueta="Precio compra" valor={formatCOP(Number(producto.ultimoCostoCompra))} />
          {/* Las cuentas ya no se configuran por producto: van por CONCEPTO y
              por empresa, en `empresa_cuenta`. Un catálogo de 500 productos no
              necesita 1.000 cuentas. */}
          <Dato etiqueta="Stock" valor={String(producto.stock ?? 0)} />
          <Dato
            etiqueta="Costo promedio"
            valor={formatCOP(Number(producto.costoPromedio ?? 0))}
          />
        </div>
        {producto.descripcion && (
          <div className="border-t border-border pt-4">
            <p className="mb-1 text-xs text-muted-foreground/70">Descripción</p>
            <p className="text-sm text-muted-foreground">{producto.descripcion}</p>
          </div>
        )}
      </Card>

      <Card className="gap-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Movimientos recientes de kardex
        </h2>
        <KardexTable movimientos={movimientos ?? []} />
      </Card>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  critico = false,
}: {
  etiqueta: string;
  valor: string;
  critico?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground/70">{etiqueta}</span>
      <span
        className={cn(
          "text-sm font-medium text-foreground",
          critico && "text-destructive",
        )}
      >
        {valor}
      </span>
    </div>
  );
}
