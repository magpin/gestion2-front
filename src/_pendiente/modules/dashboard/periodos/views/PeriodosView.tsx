"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { useAuthStore } from "@/core/store/authStore";
import { useCerrarPeriodo, useGetPeriodos, useReabrirPeriodo } from "../hooks/usePeriodos";
import { crearColumnasPeriodos } from "../components/periodosColumns";
import { PeriodoFormModal } from "../components/PeriodoFormModal";
import type { PeriodoContable } from "../types/periodos.types";

type Accion = { tipo: "cerrar" | "reabrir"; periodo: PeriodoContable };

export function PeriodosView() {
  const roles = useAuthStore((state) => state.roles);
  const esDirector = roles.includes("DIRECTOR");
  const puedeCerrar = esDirector || roles.includes("DIRECTOR");
  const puedeReabrir = esDirector; // reabrir es solo director (backend @Roles)

  const [creando, setCreando] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);

  const { data, isLoading, isError, refetch } = useGetPeriodos();
  const cerrarPeriodo = useCerrarPeriodo();
  const reabrirPeriodo = useReabrirPeriodo();

  const periodos = useMemo(() => data ?? [], [data]);

  const columnas = useMemo(
    () =>
      crearColumnasPeriodos({
        onCerrar: (periodo) => setAccion({ tipo: "cerrar", periodo }),
        onReabrir: (periodo) => setAccion({ tipo: "reabrir", periodo }),
        puedeCerrar,
        puedeReabrir,
      }),
    [puedeCerrar, puedeReabrir],
  );

  const ejecutar = () => {
    if (!accion) {
      return;
    }
    const opciones = { onSuccess: () => setAccion(null) };
    if (accion.tipo === "cerrar") {
      cerrarPeriodo.mutate(accion.periodo.id, opciones);
    } else {
      reabrirPeriodo.mutate(accion.periodo.id, opciones);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Períodos contables"
        acciones={
          puedeCerrar ? (
            <Button className="gap-2" onClick={() => setCreando(true)}>
              <Plus size={16} strokeWidth={1.75} />
              Nuevo período
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columnas}
        data={periodos}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        mensajeVacio="No hay períodos contables todavía."
      />

      <PeriodoFormModal open={creando} onOpenChange={setCreando} />

      <Modal
        open={accion !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setAccion(null);
          }
        }}
        titulo={accion?.tipo === "reabrir" ? "Reabrir período" : "Cerrar período"}
        descripcion={
          accion?.tipo === "reabrir"
            ? `¿Reabrir "${accion?.periodo.nombre ?? ""}"? Permitirá registrar y ajustar asientos en este período.`
            : `¿Cerrar "${accion?.periodo.nombre ?? ""}"? No se podrán registrar más asientos en este período.`
        }
        labelConfirmar={accion?.tipo === "reabrir" ? "Reabrir" : "Cerrar"}
        confirmarDestructivo={accion?.tipo === "cerrar"}
        confirmarLoading={cerrarPeriodo.isPending || reabrirPeriodo.isPending}
        onConfirmar={ejecutar}
      />
    </div>
  );
}
