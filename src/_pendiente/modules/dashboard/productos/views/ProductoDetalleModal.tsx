"use client";

import { AlertCircle } from "lucide-react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useGetProducto } from "../hooks/useProductos";
import { bajoCritico } from "../types/productos.types";
import { ProductoDetalleContenido } from "./ProductoDetalleContenido";

interface ProductoDetalleModalProps {
  productoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductoDetalleModal({ productoId, open, onOpenChange }: ProductoDetalleModalProps) {
  const { data: producto, isLoading, isError, refetch } = useGetProducto(productoId ?? "");

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      titulo={producto ? producto.nombre : "Detalle de producto"}
    >
      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isError || !producto ? (
        <EmptyState
          icon={AlertCircle}
          titulo="No se pudo cargar el producto"
          accion={{ label: "Reintentar", onClick: () => void refetch() }}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground/70">
            </span>
            {bajoCritico(producto) && (
              <Badge
                className="border border-danger/20 bg-danger/15 text-danger"
              >
                Stock crítico
              </Badge>
            )}
          </div>
          <ProductoDetalleContenido producto={producto} />
        </div>
      )}
    </FormDialog>
  );
}
