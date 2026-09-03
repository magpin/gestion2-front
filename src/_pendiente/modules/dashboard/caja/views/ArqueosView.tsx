"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { RangoSelector, rangoDePreset, type Rango } from "@/components/shared/RangoSelector";
import { crearColumnasArqueos } from "../components/arqueosColumns";
import { useGetArqueos } from "../hooks/useCaja";
import { ArqueoDetalleModal } from "./ArqueoDetalleModal";
import type { ArqueoCaja } from "../types/caja.types";

interface ArqueosViewProps {
  /** Las pestañas del área. Van bajo el título, no dentro de la barra. */
  pestanas?: ReactNode;
}

/**
 * El historial de cierres. Un arqueo por día, y ninguno se edita.
 *
 * Corregir un arqueo equivocado no es reescribirlo: es el arqueo del día
 * siguiente el que vuelve a poner el cajón en su sitio. Por eso acá solo se lee.
 */
export function ArqueosView({ pestanas }: ArqueosViewProps) {
  const router = useRouter();
  const [rango, setRango] = useState<Rango>(() => rangoDePreset("mes"));
  const [viendo, setViendo] = useState<ArqueoCaja | null>(null);

  const { data, isLoading, isError, refetch } = useGetArqueos({
    desde: rango.desde,
    hasta: rango.hasta,
    limite: 100,
  });

  const columnas = useMemo(() => crearColumnasArqueos(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Caja"
        acciones={<RangoSelector rango={rango} onRangoChange={setRango} />}
      />

      <DataTable
        pestanas={pestanas}
        columns={columnas}
        data={data?.datos ?? []}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(arqueo) => setViendo(arqueo)}
        mensajeVacio="No hay arqueos en este rango."
      />

      <ArqueoDetalleModal
        arqueo={viendo}
        onOpenChange={(abierto) => !abierto && setViendo(null)}
        onVerAsiento={(asientoId) => {
          setViendo(null);
          router.push(`/dashboard/asientos/${asientoId}`);
        }}
      />
    </div>
  );
}
