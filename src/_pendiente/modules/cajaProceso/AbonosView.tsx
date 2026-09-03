"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import {
  RangoSelector,
  rangoDePreset,
  type PresetRango,
} from "@/components/shared/RangoSelector";
import { useAuthStore } from "@/core/store/authStore";
import {
  BarraFiltros,
  AlternarFiltro,
  ChipsFiltro,
} from "@/components/shared/ChipsFiltro";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { AnularAbonoModal } from "../components/AnularAbonoModal";
import { crearColumnasAbonos } from "../components/abonosColumns";
import { useGetAbonos } from "../hooks/useCaja";
import { useAnularAbono } from "../hooks/useCajaMutations";
import type { Abono, SentidoAbono } from "../types/caja.types";

type FiltroSentido = "TODOS" | SentidoAbono;

const FILTROS: { id: FiltroSentido; label: string }[] = [
  { id: "TODOS", label: "Todos" },
  { id: "COBRO", label: "Cobros" },
  { id: "PAGO", label: "Pagos" },
];

interface AbonosViewProps {
  /** Sin panel de proceso: las pestañas van bajo el título. */
  pestanas?: ReactNode;
}

/**
 * El historial de cobros y pagos. Una sola tabla porque es una sola tabla.
 *
 * Los anulados se muestran solo si se piden: por defecto el backend los
 * esconde, y un listado que los mezclara haría que la suma de la columna no
 * signifique nada.
 */
export function AbonosView({ pestanas }: AbonosViewProps) {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  const puedeAnular = roles.includes("CAJA") || roles.includes("COMPRAS");

  const [preset, setPreset] = useState<PresetRango>("mes");
  const [sentido, setSentido] = useState<FiltroSentido>("TODOS");
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [anulando, setAnulando] = useState<Abono | null>(null);

  const rango = useMemo(() => rangoDePreset(preset), [preset]);
  const { data, isLoading, isError, refetch } = useGetAbonos({
    desde: rango.desde,
    hasta: rango.hasta,
    sentido: sentido === "TODOS" ? undefined : sentido,
    incluirAnulados: incluirAnulados || undefined,
    limite: 100,
  });

  const terceros = useMapaTerceros();
  const anular = useAnularAbono();

  // El backend no busca por nombre de tercero —el abono guarda el id— así que
  // el filtro de texto se resuelve acá con el mapa que la pantalla ya tiene.
  const abonos = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const todos = data?.datos ?? [];
    if (!termino) return todos;
    return todos.filter((abono) => {
      const tercero = terceros.tercero(abono.terceroId);
      return (
        tercero?.nombre.toLowerCase().includes(termino) ||
        tercero?.numeroDocumento.includes(termino) ||
        abono.referencia?.toLowerCase().includes(termino) ||
        abono.fecha.includes(termino)
      );
    });
  }, [data, busqueda, terceros]);

  const columnas = useMemo(
    () =>
      crearColumnasAbonos({
        onVerDocumento: (abono) =>
          router.push(
            abono.origenTipo === "VENTA"
              ? `/dashboard/ventas/${abono.origenId}`
              : `/dashboard/compras/${abono.origenId}`,
          ),
        onAnular: (abono) => setAnulando(abono),
        nombreTercero: terceros.nombre,
        puedeAnular,
      }),
    [router, terceros.nombre, puedeAnular],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Cobros y pagos"
        pestanas={pestanas}
        busqueda={{
          valor: busqueda,
          onChange: setBusqueda,
          placeholder: "Buscar por tercero o referencia…",
        }}
      />

      <DataTable
        columns={columnas}
        data={abonos}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        mensajeVacio="No hay cobros ni pagos en este rango."
        barra={
          <BarraFiltros
            derecha={
              <div className="flex flex-wrap items-center gap-4">
                <RangoSelector preset={preset} onPresetChange={setPreset} />
                <AlternarFiltro
                  activo={incluirAnulados}
                  onChange={setIncluirAnulados}
                  mostrar="Mostrar anulados"
                  ocultar="Ocultar anulados"
                />
              </div>
            }
          >
            <ChipsFiltro
              etiqueta="Sentido del abono"
              opciones={FILTROS}
              valor={sentido}
              onChange={setSentido}
            />
          </BarraFiltros>
        }
      />

      <AnularAbonoModal
        open={anulando !== null}
        onOpenChange={(abierto) => !abierto && setAnulando(null)}
        loading={anular.isPending}
        onConfirmar={(motivo) => {
          if (!anulando) return;
          anular.mutate(
            { id: anulando.id, motivo },
            { onSuccess: () => setAnulando(null) },
          );
        }}
      />
    </div>
  );
}
