"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCOP } from "@/lib/utils";
import { useGetStockCritico } from "../hooks/useProductos";

interface StockCriticoViewProps {
  /** Sin panel de proceso: las pestañas van bajo el título. */
  pestanas?: ReactNode;
}

export function StockCriticoView({ pestanas }: StockCriticoViewProps) {
  const router = useRouter();
  const { data: productos, isLoading, isError, refetch } = useGetStockCritico();

  return (
    <div className="space-y-6">
      {/* Esta pantalla no usa `PageHeader` porque pinta tarjetas y no una
          tabla; el encabezado se escribe a mano con la misma forma. */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Stock crítico
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Productos cuyo stock actual está por debajo del mínimo.
        </p>
        {pestanas && <div className="mt-4">{pestanas}</div>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, indice) => (
            <SkeletonCard key={`stock-skeleton-${indice}`} />
          ))}
        </div>
      ) : isError || !productos ? (
        <EmptyState
          icon={AlertCircle}
          titulo="No se pudo cargar el stock crítico"
          accion={{ label: "Reintentar", onClick: () => void refetch() }}
        />
      ) : productos.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          titulo="Sin productos en estado crítico"
          descripcion="Todo el inventario está por encima del mínimo."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {productos.map((producto) => (
            <Card
              key={producto.id}
              className="cursor-pointer gap-2 p-5 transition-transform hover:-translate-y-0.5"
              onClick={() => router.push(`/dashboard/productos/${producto.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {producto.nombre}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground/70">
                  </p>
                </div>
                <AlertTriangle
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0 text-destructive"
                />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xs text-muted-foreground">
                  Stock{" "}
                  <span className="font-mono font-semibold text-destructive">
                    {Number(producto.stock)}
                  </span>{" "}
                </span>
                <span className="font-mono text-xs text-muted-foreground/70">
                  {formatCOP(Number(producto.precioVenta))}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
