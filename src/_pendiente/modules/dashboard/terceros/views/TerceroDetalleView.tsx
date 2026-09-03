"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/core/store/authStore";
import { useGetTercero } from "../hooks/useTerceros";
import { useDesactivarTercero } from "../hooks/useTerceroMutations";
import { TerceroTabs } from "../components/TerceroTabs";

interface TerceroDetalleViewProps {
  terceroId: string;
  /** Dentro de un diálogo: sin botón de volver y sin título propio. */
  enModal?: boolean;
  /** Abrir el formulario de edición sin salir del listado. */
  onEditar?: () => void;
  /** Qué hacer cuando el tercero deja de existir: cerrar el diálogo. */
  onEliminado?: () => void;
}

export function TerceroDetalleView({
  terceroId,
  enModal = false,
  onEditar,
  onEliminado,
}: TerceroDetalleViewProps) {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  const puedeEliminar = roles.includes("DIRECTOR");

  const [eliminando, setEliminando] = useState(false);
  const { data: tercero, isLoading, isError, refetch } = useGetTercero(terceroId);
  const eliminar = useDesactivarTercero();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !tercero) {
    return (
      <EmptyState
        icon={AlertCircle}
        titulo="No se pudo cargar el tercero"
        accion={{ label: "Reintentar", onClick: () => void refetch() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!enModal && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => router.push("/dashboard/terceros")}
            >
              <ArrowLeft size={15} strokeWidth={1.75} />
              Terceros
            </Button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {!enModal && (
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {tercero.nombre}
                </h1>
              )}
              {tercero.esCliente && (
                <Badge
                  className="border border-info/20 bg-info/15 text-info"
                >
                  Cliente
                </Badge>
              )}
              {tercero.esProveedor && (
                <Badge
                  className="border border-info/20 bg-info/15 text-info"
                >
                  Proveedor
                </Badge>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground/70">
              {tercero.tipoDocumento} {tercero.numeroDocumento}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            onClick={() =>
              onEditar
                ? onEditar()
                : router.push(`/dashboard/terceros/${tercero.id}/editar`)
            }
          >
            <Pencil size={15} strokeWidth={1.75} />
            Editar
          </Button>
          {puedeEliminar && (
            <Button
              className={cn("gap-2 text-destructive")}
              onClick={() => setEliminando(true)}
            >
              <Trash2 size={15} strokeWidth={1.75} />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <Card className="p-5">
        <TerceroTabs tercero={tercero} />
      </Card>

      <Modal
        open={eliminando}
        onOpenChange={setEliminando}
        titulo="Eliminar tercero"
        descripcion={`¿Eliminar "${tercero.nombre}"? No se podrá si tiene operaciones asociadas.`}
        labelConfirmar="Eliminar"confirmarDestructivo
        confirmarLoading={eliminar.isPending}
        onConfirmar={() =>
          eliminar.mutate(tercero.id, {
            onSuccess: () =>
              onEliminado ? onEliminado() : router.push("/dashboard/terceros"),
          })
        }
      />
    </div>
  );
}
