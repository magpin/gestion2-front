"use client";

import { useMemo, useState } from "react";
import { FileMinus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { RangoSelector, rangoDePreset, type Rango } from "@/components/shared/RangoSelector";
import {
  BarraListado,
  grupoUnico,
  interruptor,
  type FiltroListado,
} from "@/components/shared/BarraListado";
import {
  SelectorDocumentoModal,
  type GrupoSelector,
} from "@/components/shared/SelectorDocumentoModal";
import { useAuthStore } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { useGetCompras } from "@/modules/dashboard/compras/hooks/useCompras";
import { useGetVentas } from "@/modules/dashboard/ventas/hooks/useVentas";
import { NotaCreditoFormModal } from "../components/NotaCreditoFormModal";
import { crearColumnasDocumentos } from "../components/documentosColumns";
import {
  desdeCompras,
  desdeFacturas,
  desdeNotas,
  totalesPorVenta,
  TIPO_LABEL,
  type DocumentoFiscal,
  type TipoDocumento,
} from "../lib/documentos";
import { useGetFacturas, useGetNotasCredito } from "../hooks/useFacturacion";
import { useEmitirNotaCredito } from "../hooks/useFacturacionMutations";
import { VentaDetalleModal } from "@/modules/dashboard/ventas/views/VentaDetalleModal";
import { CompraDetalleModal } from "@/modules/dashboard/compras/views/CompraDetalleModal";
import { FacturaImpresaModal } from "./FacturaImpresaModal";
import { NotaCreditoDetalleModal } from "./NotaCreditoDetalleModal";
import type { Factura, NotaCredito } from "../types/facturacion.types";

/**
 * Los dos ejes por los que se acota la tabla, separados a propósito.
 *
 * Antes eran uno solo —una fila con «De venta», «De compra» y «Notas crédito»
 * al mismo nivel—, y ahí «nota crédito» se leía como un origen más cuando en
 * realidad es otro documento. Separarlos NO devuelve las pestañas que se
 * quitaron: la tabla sigue siendo una sola, porque quien viene acá hace una
 * sola pregunta. Lo que cambia es que ya no hay que elegir entre las dos cosas.
 */
type FiltroClase = "TODAS" | "FACTURAS" | "NOTAS";
type FiltroOrigen = "TODOS" | Exclude<TipoDocumento, "NOTA_CREDITO">;

/** Una factura como la lista el selector de nota crédito. */
interface FacturaEnSelector {
  id: string;
  numero: string;
  titulo: string;
  detalle?: string;
  contextual?: string;
}

/**
 * Los papeles que pasan por el negocio, en una sola tabla.
 *
 * Son cuatro tablas distintas del modelo —factura de venta, factura de taller,
 * factura del proveedor y nota crédito— porque cada una tiene reglas propias.
 * Acá se juntan porque quien viene a esta pantalla hace una sola pregunta: qué
 * documentos hay. Cada fila conserva de dónde salió, y las acciones se arman
 * con eso.
 *
 * **Acá no se emite una factura.** Emitir es el paso que le falta a una venta y
 * vive en el nodo `Facturar` de su proceso. Lo que vive acá es lo que pasa
 * DESPUÉS del número: verlo, imprimirlo y corregirlo con una nota crédito.
 */
export function DocumentosView() {
  const roles = useAuthStore((state) => state.roles);
  const puedeEmitirNota = roles.includes("VENTAS");
  // `GET /compras` es del rol COMPRAS: sin él, ni se pide ni se ofrece el chip.
  const puedeVerCompras = roles.includes("COMPRAS");

  const [rango, setRango] = useState<Rango>(() => rangoDePreset("mes"));
  const [clase, setClase] = useState<FiltroClase>("TODAS");
  const [origen, setOrigen] = useState<FiltroOrigen>("TODOS");
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [imprimiendo, setImprimiendo] = useState<Factura | null>(null);
  const [viendoNota, setViendoNota] = useState<NotaCredito | null>(null);
  const [devolviendo, setDevolviendo] = useState<Factura | null>(null);
  const [venta, setVenta] = useState<string | null>(null);
  const [compra, setCompra] = useState<string | null>(null);
  const [eligiendoFactura, setEligiendoFactura] = useState(false);

  const filtroFecha = { desde: rango.desde, hasta: rango.hasta, limite: 100 };

  const {
    data: facturas,
    isLoading: cargandoFacturas,
    isError,
    refetch,
  } = useGetFacturas({ ...filtroFecha, incluirAnuladas: incluirAnuladas || undefined });
  const { data: notas } = useGetNotasCredito(filtroFecha);
  const { data: compras } = useGetCompras(
    puedeVerCompras ? { ...filtroFecha, incluirAnuladas: incluirAnuladas || undefined } : undefined,
  );
  // El total de la factura no está en la factura: sale de su venta.
  const { data: ventas } = useGetVentas({ ...filtroFecha, incluirAnuladas: true });

  const terceros = useMapaTerceros();
  const emitirNota = useEmitirNotaCredito();

  /* Índices para volver de la fila a su documento original: la tabla trabaja
     con la forma unificada, pero imprimir o devolver necesitan la fila real. */
  const porId = useMemo(
    () => ({
      facturas: new Map((facturas?.datos ?? []).map((f) => [f.id, f])),
      notas: new Map((notas?.datos ?? []).map((n) => [n.id, n])),
    }),
    [facturas, notas],
  );

  const documentos = useMemo(() => {
    const totales = totalesPorVenta(ventas?.datos ?? []);
    const todos: DocumentoFiscal[] = [
      ...desdeFacturas(facturas?.datos ?? [], totales),
      ...desdeNotas(notas?.datos ?? []),
      ...(puedeVerCompras ? desdeCompras(compras?.datos ?? []) : []),
    ];

    /* Los dos ejes se aplican en cadena. `origen` ya excluye las notas por sí
       solo —ninguna tiene tipo VENTA, COMPRA ni OT—, así que no hace falta
       combinarlos a mano. */
    let items = todos;
    if (clase === "FACTURAS") items = items.filter((d) => d.tipo !== "NOTA_CREDITO");
    if (clase === "NOTAS") items = items.filter((d) => d.tipo === "NOTA_CREDITO");
    if (origen !== "TODOS") items = items.filter((d) => d.tipo === origen);

    const termino = busqueda.trim().toLowerCase();
    if (termino) {
      items = items.filter((documento) => {
        const tercero = terceros.tercero(documento.terceroId);
        return (
          documento.numero.toLowerCase().includes(termino) ||
          tercero?.nombre.toLowerCase().includes(termino) ||
          tercero?.numeroDocumento.includes(termino)
        );
      });
    }

    // Lo más reciente arriba, que es como se busca un papel.
    return items.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [facturas, notas, compras, ventas, clase, origen, busqueda, terceros, puedeVerCompras]);

  /* Lo que suma lo que se ve. Los anulados no entran —ese papel no vale— pero
     se cuentan aparte. Las filas sin total resuelto tampoco suman. */
  const totalVisible = useMemo(
    () =>
      documentos.reduce(
        (suma, documento) => (documento.anulado ? suma : suma + (documento.total ?? 0)),
        0,
      ),
    [documentos],
  );
  const sinTotal = useMemo(
    () => documentos.filter((documento) => documento.total === null).length,
    [documentos],
  );

  const filtros: FiltroListado[] = [
    grupoUnico<FiltroClase>({
      id: "clase",
      titulo: "Documento",
      todos: "TODAS",
      etiquetaTodos: "Todos",
      valor: clase,
      opciones: [
        { valor: "FACTURAS", label: "Facturas" },
        { valor: "NOTAS", label: "Notas crédito" },
      ],
      // Una nota crédito no sale de una venta ni de una compra: sale de una
      // factura. Dejar el origen puesto acá sería un filtro invisible que no
      // devuelve nada.
      onChange: (valor) => {
        setClase(valor);
        if (valor === "NOTAS") setOrigen("TODOS");
      },
    }),

    // El origen solo aplica a las facturas, así que con las notas a la vista
    // el grupo no se ofrece en vez de ofrecerse sin efecto.
    ...(clase === "NOTAS"
      ? []
      : [
          grupoUnico<FiltroOrigen>({
            id: "origen",
            titulo: "Origen",
            todos: "TODOS",
            valor: origen,
            onChange: setOrigen,
            opciones: [
              { valor: "VENTA" as const, label: TIPO_LABEL.VENTA },
              ...(puedeVerCompras
                ? [{ valor: "COMPRA" as const, label: TIPO_LABEL.COMPRA }]
                : []),
              { valor: "OT" as const, label: TIPO_LABEL.OT },
            ],
          }),
        ]),

    interruptor({
      id: "anuladas",
      titulo: "Incluir",
      texto: "Facturas anuladas",
      chip: "Anuladas",
      valor: incluirAnuladas,
      onChange: setIncluirAnuladas,
    }),
  ];

  /* Sobre qué se puede emitir una nota crédito: una factura que la empresa
     emitió y que sigue viva. La del proveedor no —esa la corrige él— y una
     anulada ya no vale nada. */
  const facturasCorregibles = useMemo((): FacturaEnSelector[] => {
    return (facturas?.datos ?? [])
      .filter((factura) => !factura.anulada)
      .map((factura) => ({
        id: factura.id,
        numero: factura.numero,
        titulo: terceros.nombre(factura.terceroId),
        detalle: formatFecha(factura.fechaEmision),
      }));
  }, [facturas, terceros]);

  const gruposDeFacturas: GrupoSelector<FacturaEnSelector>[] = [
    {
      id: "emitidas",
      label: "Facturas emitidas",
      documentos: facturasCorregibles,
      accion: {
        label: "Emitir nota crédito",
        onElegir: (documento) => {
          const factura = porId.facturas.get(documento.id);
          setEligiendoFactura(false);
          if (factura) setDevolviendo(factura);
        },
      },
    },
  ];

  const columnas = useMemo(
    () =>
      crearColumnasDocumentos({
        onImprimir: (documento) => {
          const factura = porId.facturas.get(documento.id);
          if (factura) setImprimiendo(factura);
        },
        onVerNota: (documento) => {
          const nota = porId.notas.get(documento.id);
          if (nota) setViendoNota(nota);
        },
        /* La venta o la compra se abren encima del listado: quien revisa
           facturación no quiere perder el rango ni el filtro que tiene puesto. */
        onIrAlOrigen: (documento) => {
          if (!documento.origen) return;
          if (documento.origen.tipo === "VENTA") setVenta(documento.origen.id);
          else setCompra(documento.origen.id);
        },
        onNotaCredito: (documento) => {
          const factura = porId.facturas.get(documento.id);
          if (factura) setDevolviendo(factura);
        },
        nombreTercero: terceros.nombre,
        puedeEmitirNota,
      }),
    [terceros.nombre, puedeEmitirNota, porId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Facturación"
        acciones={<RangoSelector rango={rango} onRangoChange={setRango} />}
      />

      <DataTable
        columns={columnas}
        data={documentos}
        isLoading={cargandoFacturas}
        isError={isError}
        onReintentar={() => void refetch()}
        mensajeVacio="No hay documentos en este rango."
        pageSize={25}
        barra={
          <BarraListado
            filtros={filtros}
            busqueda={{
              valor: busqueda,
              onChange: setBusqueda,
              placeholder: "Buscar por número o tercero…",
            }}
            /* Acá no se emite una factura —eso es del proceso de venta—, pero
               sí se corrige una: es el único gesto de escritura que nace en
               esta pantalla, así que es el que ocupa el botón. */
            accion={
              puedeEmitirNota
                ? {
                    label: "Emitir nota crédito",
                    icon: FileMinus,
                    onClick: () => setEligiendoFactura(true),
                    disabled: facturasCorregibles.length === 0,
                  }
                : undefined
            }
          />
        }
        pie={
          <tr>
            <td colSpan={3} className="text-muted-foreground">
              Totales · {documentos.length}{" "}
              {documentos.length === 1 ? "documento" : "documentos"}
            </td>
            <td className="font-normal text-muted-foreground">
              {sinTotal > 0 ? `${sinTotal} sin total` : ""}
            </td>
            <td className="text-right font-mono tabular-nums text-foreground">
              {formatCOP(totalVisible)}
            </td>
            <td colSpan={2} />
          </tr>
        }
      />

      {/* Paso 1 del gesto: cuál factura se corrige. El paso 2 es el formulario
          de la nota, el mismo que abre la acción de la fila. */}
      <SelectorDocumentoModal<FacturaEnSelector>
        open={eligiendoFactura}
        onOpenChange={setEligiendoFactura}
        titulo="Elegí la factura a corregir"
        grupos={gruposDeFacturas}
        singular="factura"
        plural="facturas"
        isLoading={cargandoFacturas}
        isError={isError}
        onReintentar={() => void refetch()}
      />

      <FacturaImpresaModal
        factura={imprimiendo}
        onOpenChange={(abierto) => !abierto && setImprimiendo(null)}
      />

      <NotaCreditoDetalleModal
        nota={viendoNota}
        numeroFactura={
          viendoNota ? (porId.facturas.get(viendoNota.facturaId)?.numero ?? "—") : "—"
        }
        onOpenChange={(abierto) => !abierto && setViendoNota(null)}
      />

      <NotaCreditoFormModal
        factura={devolviendo}
        onOpenChange={(abierto) => !abierto && setDevolviendo(null)}
        loading={emitirNota.isPending}
        onConfirmar={(payload) =>
          emitirNota.mutate(payload, { onSuccess: () => setDevolviendo(null) })
        }
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
