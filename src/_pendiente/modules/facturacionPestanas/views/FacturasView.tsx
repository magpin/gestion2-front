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
  BuscadorFiltro,
  ChipsFiltro,
} from "@/components/shared/ChipsFiltro";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { NotaCreditoFormModal } from "../components/NotaCreditoFormModal";
import { crearColumnasFacturas } from "../components/facturasColumns";
import { useGetFacturas } from "../hooks/useFacturacion";
import { useEmitirNotaCredito } from "../hooks/useFacturacionMutations";
import { FacturaImpresaModal } from "./FacturaImpresaModal";
import type { Factura, OrigenFacturableTipo } from "../types/facturacion.types";

type FiltroOrigen = "TODOS" | OrigenFacturableTipo;

/*
 * Los orígenes que una factura puede tener, y son solo dos: `factura.origen_tipo`
 * admite VENTA y OT.
 *
 * No hay «de compra»: la factura de una compra la emite el proveedor y se
 * registra en el módulo de compras, con SU número. Este módulo es lo que emite
 * la empresa.
 */
const FILTROS: { id: FiltroOrigen; label: string }[] = [
  { id: "TODOS", label: "Todas" },
  { id: "VENTA", label: "De venta" },
  { id: "OT", label: "De taller" },
];

interface FacturasViewProps {
  /** Sin panel de proceso: las pestañas van bajo el título. */
  pestanas?: ReactNode;
}

/**
 * Las facturas emitidas. Rol VENTAS.
 *
 * **Acá no se emite.** Emitir es el paso que le falta a una venta, y ese
 * trabajo vive en la línea del proceso de venta, en su nodo `Facturar`. Una
 * segunda bandeja de «ventas sin facturar» acá sería el mismo trabajo en dos
 * lugares, y el día que cambie el predicado uno de los dos mentiría.
 *
 * Lo que sí vive acá es lo que pasa DESPUÉS del número: verlo, imprimirlo y
 * corregirlo con una nota crédito.
 */
export function FacturasView({ pestanas }: FacturasViewProps) {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  const puedeEmitirNota = roles.includes("VENTAS");

  const [preset, setPreset] = useState<PresetRango>("mes");
  const [origen, setOrigen] = useState<FiltroOrigen>("TODOS");
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [imprimiendo, setImprimiendo] = useState<Factura | null>(null);
  const [devolviendo, setDevolviendo] = useState<Factura | null>(null);

  const rango = useMemo(() => rangoDePreset(preset), [preset]);
  const { data, isLoading, isError, refetch } = useGetFacturas({
    desde: rango.desde,
    hasta: rango.hasta,
    origenTipo: origen === "TODOS" ? undefined : origen,
    incluirAnuladas: incluirAnuladas || undefined,
    limite: 100,
  });

  const terceros = useMapaTerceros();
  const emitirNota = useEmitirNotaCredito();

  // El backend busca por número; el nombre del cliente vive en `terceros`, así
  // que ese filtro se resuelve acá con el mapa que la pantalla ya tiene.
  const facturas = useMemo(() => {
    const todas = data?.datos ?? [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return todas;
    return todas.filter((factura) => {
      const cliente = terceros.tercero(factura.terceroId);
      return (
        factura.numero.toLowerCase().includes(termino) ||
        cliente?.nombre.toLowerCase().includes(termino) ||
        cliente?.numeroDocumento.includes(termino)
      );
    });
  }, [data, busqueda, terceros]);

  const columnas = useMemo(
    () =>
      crearColumnasFacturas({
        onImprimir: (factura) => setImprimiendo(factura),
        onVerOrigen: (factura) =>
          router.push(
            factura.origenTipo === "VENTA"
              ? `/dashboard/ventas/${factura.origenId}`
              : `/dashboard/taller/${factura.origenId}`,
          ),
        onNotaCredito: (factura) => setDevolviendo(factura),
        nombreCliente: terceros.nombre,
        puedeEmitirNota,
      }),
    [router, terceros.nombre, puedeEmitirNota],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Facturas"
        pestanas={pestanas}
        acciones={<RangoSelector preset={preset} onPresetChange={setPreset} />}
      />

      <DataTable
        columns={columnas}
        data={facturas}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(factura) => setImprimiendo(factura)}
        mensajeVacio="No hay facturas emitidas en este rango. Se emiten desde la bandeja de ventas."
        barra={
          <BarraFiltros
            derecha={
              <div className="flex flex-wrap items-center gap-2">
                <BuscadorFiltro
                  valor={busqueda}
                  onChange={setBusqueda}
                  placeholder="Buscar por número o cliente…"
                />
                <AlternarFiltro
                  activo={incluirAnuladas}
                  onChange={setIncluirAnuladas}
                  mostrar="Mostrar anuladas"
                  ocultar="Ocultar anuladas"
                />
              </div>
            }
          >
            <ChipsFiltro
              etiqueta="Origen de la factura"
              opciones={FILTROS}
              valor={origen}
              onChange={setOrigen}
            />
          </BarraFiltros>
        }
      />

      <FacturaImpresaModal
        factura={imprimiendo}
        onOpenChange={(abierto) => !abierto && setImprimiendo(null)}
      />

      <NotaCreditoFormModal
        factura={devolviendo}
        onOpenChange={(abierto) => !abierto && setDevolviendo(null)}
        loading={emitirNota.isPending}
        onConfirmar={(payload) =>
          emitirNota.mutate(payload, { onSuccess: () => setDevolviendo(null) })
        }
      />
    </div>
  );
}
