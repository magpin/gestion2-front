"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import {
  RangoSelector,
  rangoDePreset,
  type Rango,
} from "@/components/shared/RangoSelector";
import {
  BarraListado,
  grupoUnico,
  interruptor,
} from "@/components/shared/BarraListado";
import { formatCOP } from "@/lib/utils";
import { descargarCSV } from "@/lib/csv";
import { crearColumnasAsientos } from "../components/asientosColumns";
import { VentaDetalleModal } from "@/modules/dashboard/ventas/views/VentaDetalleModal";
import { CompraDetalleModal } from "@/modules/dashboard/compras/views/CompraDetalleModal";
import { AsientoDetalleModal } from "./AsientoDetalleModal";
import { useGetAsientos } from "../hooks/useAsientos";
import {
  ORIGEN_LABEL,
  type Asiento,
  type OrigenTipo,
} from "../types/asientos.types";

type FiltroOrigen = "TODOS" | OrigenTipo;

/**
 * Los orígenes que hoy producen asientos. `OT` y `ANTICIPO_OT` entran con el
 * módulo 7.
 *
 * `TODOS` no está en la lista: lo pone la barra, que necesita distinguir «sin
 * filtrar» de una opción cualquiera para no contarlo como filtro puesto.
 */
const ORIGENES: OrigenTipo[] = [
  "VENTA",
  "COMPRA",
  "ABONO",
  "NOTA_CREDITO",
  "ARQUEO",
  "AJUSTE_INV",
];

/**
 * El libro diario. Lo leen los seis roles que operan o revisan.
 *
 * Solo lectura, y no le falta nada: no existe `POST /contabilidad/asientos`
 * porque los asientos nacen dentro de la transacción del documento que los
 * produce. Corregir uno es anular ese documento, que emite la reversa — la
 * misma disciplina que impide editar una factura ya entregada.
 *
 * Ojo con lo que esta pantalla NO es: cada asiento cuadra por definición, así
 * que acá no hay «entradas» ni «salidas», hay eventos. El efectivo que entra y
 * sale del cajón está en Caja, con su signo y su saldo.
 */
export function AsientosView() {

  // Abre en el día: la pregunta que trae a alguien acá es «qué pasó hoy».
  const [rango, setRango] = useState<Rango>(() => rangoDePreset("hoy"));
  const [origen, setOrigen] = useState<FiltroOrigen>("TODOS");
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  /* El asiento abierto. Se guarda el id y no la fila porque el diálogo salta de
     un asiento al que lo reversa, y ese no está necesariamente en la página. */
  const [viendoId, setViendoId] = useState<string | null>(null);
  const [numeroViendo, setNumeroViendo] = useState<string | undefined>(undefined);
  const [venta, setVenta] = useState<string | null>(null);
  const [compra, setCompra] = useState<string | null>(null);

  const setViendo = (asiento: Asiento) => {
    setViendoId(asiento.id);
    setNumeroViendo(asiento.numero);
  };

  const { data, isLoading, isError, refetch } = useGetAsientos({
    desde: rango.desde,
    hasta: rango.hasta,
    origenTipo: origen === "TODOS" ? undefined : origen,
    incluirAnulados: incluirAnulados || undefined,
    limite: 100,
  });

  const asientos = useMemo(() => data?.datos ?? [], [data]);

  const anulados = useMemo(
    () => asientos.filter((asiento) => asiento.anulado).length,
    [asientos],
  );

  /* Lo movido en el rango. Se suman solo los vigentes: incluir los anulados
     inflaría la cifra con plata que se reversó. */
  const movido = useMemo(
    () =>
      asientos.reduce(
        (total, asiento) =>
          asiento.anulado ? total : total + asiento.totalDebito,
        0,
      ),
    [asientos],
  );

  /* El origen se abre en su propio diálogo, encima del libro: quien está
     cuadrando no quiere salir del rango que tiene puesto para ver una venta. */
  const abrirOrigen = (asiento: Asiento) => {
    if (asiento.origenTipo === "VENTA") setVenta(asiento.origenId);
    else if (asiento.origenTipo === "COMPRA") setCompra(asiento.origenId);
  };

  const columnas = useMemo(
    () =>
      crearColumnasAsientos({
        onVer: (asiento) => setViendo(asiento),
        onVerDocumento: abrirOrigen,
        onVerReversa: (asiento) => {
          setViendoId(asiento.reversaDeId);
          // El número del otro asiento no está en esta fila: lo pone el diálogo
          // cuando llegue, y mientras tanto se titula genérico.
          setNumeroViendo(undefined);
        },
      }),
    [],
  );

  // El vacío se redacta distinto si el rango es justo el día de hoy: «todavía»
  // solo tiene sentido cuando el día no ha terminado.
  const hoy = rangoDePreset("hoy");
  const esHoy = rango.desde === hoy.desde && rango.hasta === hoy.hasta;

  /* El único gesto que nace en esta pantalla.

     No hay `POST /contabilidad/asientos` —un asiento nace dentro de la
     transacción del documento que lo produce—, así que acá no se crea ni se
     corrige nada. Lo que sí se hace con un libro diario es llevárselo: al
     contador externo, a la declaración, a la hoja de cálculo donde cuadra.

     Se exporta lo que se está viendo, con el rango y los filtros puestos, para
     que el archivo diga lo mismo que la pantalla. */
  const exportar = () => {
    descargarCSV(
      `libro-diario_${rango.desde}_${rango.hasta}`,
      ["Número", "Fecha", "Origen", "Descripción", "Débito", "Crédito", "Anulado"],
      asientos.map((asiento) => [
        asiento.numero,
        asiento.fecha,
        ORIGEN_LABEL[asiento.origenTipo] ?? asiento.origenTipo,
        asiento.descripcion,
        asiento.totalDebito,
        asiento.totalCredito,
        asiento.anulado ? "sí" : "no",
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Libro diario"
        acciones={<RangoSelector rango={rango} onRangoChange={setRango} />}
      />

      <DataTable
        columns={columnas}
        data={asientos}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(asiento) => setViendo(asiento)}
        mensajeVacio={
          esHoy
            ? "Hoy todavía no se ha registrado nada."
            : "No hay asientos en este rango."
        }
        pageSize={25}
        pie={
          /* Los totales cuadran con el filtro puesto: si se ve solo compras, la
             cifra es la de compras. Los anulados no suman —esa plata se
             reversó— pero se cuentan aparte para que no parezcan invisibles. */
          <tr>
            <td colSpan={3} className="text-muted-foreground">
              Totales · {asientos.length}{" "}
              {asientos.length === 1 ? "asiento" : "asientos"}
            </td>
            <td className="font-normal text-muted-foreground">
              {anulados > 0
                ? `${anulados} ${anulados === 1 ? "anulado" : "anulados"}`
                : "sin anulados"}
            </td>
            <td className="text-right font-mono tabular-nums text-foreground">
              {formatCOP(movido)}
            </td>
            <td colSpan={2} />
          </tr>
        }
        barra={
          <BarraListado
            filtros={[
              grupoUnico<FiltroOrigen>({
                id: "origen",
                titulo: "Origen",
                todos: "TODOS",
                valor: origen,
                onChange: setOrigen,
                opciones: ORIGENES.map((id) => ({
                  valor: id,
                  label: ORIGEN_LABEL[id] ?? id,
                })),
              }),
              interruptor({
                id: "anulados",
                titulo: "Incluir",
                texto: "Asientos anulados",
                chip: "Anulados",
                valor: incluirAnulados,
                onChange: setIncluirAnulados,
              }),
            ]}
            accion={{
              label: "Exportar",
              icon: Download,
              onClick: exportar,
              disabled: asientos.length === 0,
            }}
          />
        }
      />

      <AsientoDetalleModal
        asientoId={viendoId}
        numero={numeroViendo}
        open={viendoId !== null}
        onOpenChange={(abierto) => !abierto && setViendoId(null)}
        onVerAsiento={(id) => {
          setViendoId(id);
          setNumeroViendo(undefined);
        }}
        onVerOrigen={(asiento) => {
          setViendoId(null);
          abrirOrigen(asiento);
        }}
      />

      <VentaDetalleModal
        ventaId={venta}
        open={venta !== null}
        onOpenChange={(abierto) => !abierto && setVenta(null)}
      />

      <CompraDetalleModal
        compraId={compra}
        open={compra !== null}
        onOpenChange={(abierto) => !abierto && setCompra(null)}
      />
    </div>
  );
}
