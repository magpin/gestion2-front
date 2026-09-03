"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, DollarSign, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { useAuthStore } from "@/core/store/authStore";
import { useGetProducto } from "../hooks/useProductos";
import { useDesactivarProducto , useActualizarMargenMinimo } from "../hooks/useProductoMutations";
import { PrecioMinimoModal } from "../components/PrecioMinimoModal";
import { bajoCritico } from "../types/productos.types";
import { ProductoDetalleContenido } from "./ProductoDetalleContenido";

interface ProductoDetalleViewProps {
  productoId: string;
}

export function ProductoDetalleView({ productoId }: ProductoDetalleViewProps) {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  // Desactivar un producto es del DIRECTOR o de INVENTARIO.
  const puedeEliminar = roles.includes("DIRECTOR") || roles.includes("INVENTARIO");

  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const { data: producto, isLoading, isError, refetch } = useGetProducto(productoId);
  const precioMinimo = useActualizarMargenMinimo(productoId);
  const eliminar = useDesactivarProducto();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !producto) {
    return (
      <EmptyState
        icon={AlertCircle}
        titulo="No se pudo cargar el producto"
        accion={{ label: "Reintentar", onClick: () => void refetch() }}
      />
    );
  }

  const critico = bajoCritico(producto);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/productos")}
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
            Productos
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {producto.nombre}
              </h1>
              {critico && (
                <Badge
                  className="border border-danger/20 bg-danger/15 text-danger"
                >
                  Stock crítico
                </Badge>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground/70">
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="gap-2"
            onClick={() => setEditandoPrecio(true)}
          >
            <DollarSign size={15} strokeWidth={1.75} />
            Precio mínimo
          </Button>
          <Button
            className="gap-2"
            onClick={() => router.push(`/dashboard/productos/${producto.id}/editar`)}
          >
            <Pencil size={15} strokeWidth={1.75} />
            Editar
          </Button>
          {puedeEliminar && (
            <Button
              className="gap-2 text-destructive"
              onClick={() => setEliminando(true)}
            >
              <Trash2 size={15} strokeWidth={1.75} />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <ProductoDetalleContenido producto={producto} />

      <PrecioMinimoModal
        open={editandoPrecio}
        onOpenChange={setEditandoPrecio}
        precioActual={Number(producto.margenMinimoPct)}
        loading={precioMinimo.isPending}
        onConfirmar={(valor) =>
          precioMinimo.mutate(valor, { onSuccess: () => setEditandoPrecio(false) })
        }
      />

      <Modal
        open={eliminando}
        onOpenChange={setEliminando}
        titulo="Eliminar producto"
        descripcion={`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"confirmarDestructivo
        confirmarLoading={eliminar.isPending}
        onConfirmar={() =>
          eliminar.mutate(producto.id, {
            onSuccess: () => router.push("/dashboard/productos"),
          })
        }
      />
    </div>
  );
}
