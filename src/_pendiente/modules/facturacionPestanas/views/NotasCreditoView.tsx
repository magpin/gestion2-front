"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { RangoSelector, rangoDePreset, type PresetRango } from "@/components/shared/RangoSelector";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { BarraFiltros } from "@/components/shared/ChipsFiltro";
import { crearColumnasNotas } from "../components/notasColumns";
import { useGetFacturas, useGetNotasCredito } from "../hooks/useFacturacion";
import { NotaCreditoDetalleModal } from "./NotaCreditoDetalleModal";
import type { NotaCredito } from "../types/facturacion.types";

interface NotasCreditoViewProps {
  /** Sin panel de proceso: las pestañas van bajo el título. */
  pestanas?: ReactNode;
}

/**
 * Las notas crédito emitidas.
 *
 * Solo lectura y sin anulación: una nota crédito corrige una factura, y
 * corregir la corrección sería otra nota, no un botón de borrar. Es la misma
 * disciplina de la contabilidad, donde nada se edita: se reversa.
 */
export function NotasCreditoView({ pestanas }: NotasCreditoViewProps) {
  const [preset, setPreset] = useState<PresetRango>("mes");
  const [busqueda, setBusqueda] = useState("");
  const [viendo, setViendo] = useState<NotaCredito | null>(null);

  const rango = useMemo(() => rangoDePreset(preset), [preset]);
  const { data, isLoading, isError, refetch } = useGetNotasCredito({
    desde: rango.desde,
    hasta: rango.hasta,
    limite: 100,
  });

  // La nota guarda `facturaId`, no el número. Se cruza con el listado de
  // facturas —incluidas las anuladas, que es justo lo que una nota TOTAL deja—
  // en vez de pedir una consulta por fila.
  const { data: facturas } = useGetFacturas({
    desde: rango.desde,
    hasta: rango.hasta,
    incluirAnuladas: true,
    limite: 200,
  });
  const numeroPorFactura = useMemo(
    () => new Map((facturas?.datos ?? []).map((factura) => [factura.id, factura.numero])),
    [facturas],
  );

  const terceros = useMapaTerceros();

  const notas = useMemo(() => {
    const todas = data?.datos ?? [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return todas;
    return todas.filter((nota) => {
      const cliente = terceros.tercero(nota.terceroId);
      return (
        nota.numero.toLowerCase().includes(termino) ||
        (numeroPorFactura.get(nota.facturaId) ?? "").toLowerCase().includes(termino) ||
        cliente?.nombre.toLowerCase().includes(termino)
      );
    });
  }, [data, busqueda, terceros, numeroPorFactura]);

  const columnas = useMemo(
    () =>
      crearColumnasNotas({
        nombreCliente: terceros.nombre,
        numeroFactura: (facturaId) => numeroPorFactura.get(facturaId) ?? "—",
      }),
    [terceros.nombre, numeroPorFactura],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Notas crédito"
        pestanas={pestanas}
        busqueda={{
          valor: busqueda,
          onChange: setBusqueda,
          placeholder: "Buscar por número, factura o cliente…",
        }}
      />

      <DataTable
        columns={columnas}
        data={notas}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(nota) => setViendo(nota)}
        mensajeVacio="No hay notas crédito en este rango."
        barra={
          <BarraFiltros>
            <RangoSelector preset={preset} onPresetChange={setPreset} />
          </BarraFiltros>
        }
      />

      <NotaCreditoDetalleModal
        nota={viendo}
        numeroFactura={viendo ? (numeroPorFactura.get(viendo.facturaId) ?? "—") : "—"}
        onOpenChange={(abierto) => !abierto && setViendo(null)}
      />
    </div>
  );
}
