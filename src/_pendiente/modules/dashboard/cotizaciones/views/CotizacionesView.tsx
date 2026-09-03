"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FormDialog } from "@/components/shared/FormDialog";
import {
  SelectorDocumentoModal,
  type GrupoSelector,
} from "@/components/shared/SelectorDocumentoModal";
import { BarraListado, grupoUnico } from "@/components/shared/BarraListado";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { crearColumnasCotizaciones } from "../components/cotizacionesColumns";
import { ConvertirCotizacionModal } from "../components/ConvertirCotizacionModal";
import { ProcesoCotizacionLinea } from "../components/ProcesoCotizacionLinea";
import { contar, subbandejaDe, type IdNodoCotizacion } from "../lib/ciclo-cotizacion";
import { useGetCotizaciones } from "../hooks/useCotizaciones";
import {
  useCambiarEstadoCotizacion,
  useConvertirCotizacion,
} from "../hooks/useCotizacionMutations";
import { CotizacionFormView } from "./CotizacionFormView";
import { CotizacionDetalleModal } from "./CotizacionDetalleModal";
import { VentaDetalleModal } from "@/modules/dashboard/ventas/views/VentaDetalleModal";
import {
  ESTADOS_FILTRO,
  type Cotizacion,
  type EstadoCotizacionVisible,
} from "../types/cotizaciones.types";

/** Una cotización como la lista el selector: cuatro textos ya resueltos. */
interface DocumentoCotizacion {
  id: string;
  numero: string;
  titulo: string;
  detalle?: string;
  contextual?: string;
}

/**
 * Bandeja de cotizaciones (evento A0). Rol VENTAS.
 *
 * Arriba la línea del proceso —cuatro nodos con el trabajo que falta—, abajo la
 * tabla para buscar una cotización concreta. El gesto de la línea es de dos
 * pasos: elegir la cotización, después la acción.
 */
interface CotizacionesViewProps {
  /** Las pestañas del módulo, pintadas bajo el título. */
  pestanas?: ReactNode;
}

export function CotizacionesView({ pestanas }: CotizacionesViewProps) {

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<EstadoCotizacionVisible | "TODAS">("TODAS");
  /* La cotización abierta. Id y número, porque se abre desde la tabla y desde
     el selector del proceso, y ahí no hay fila a la mano. */
  const [viendo, setViendo] = useState<{ id: string; numero?: string } | null>(null);
  const [venta, setVenta] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Cotizacion | null>(null);
  const [convirtiendo, setConvirtiendo] = useState<Cotizacion | null>(null);
  const [nodoAbierto, setNodoAbierto] = useState<IdNodoCotizacion | null>(null);

  const { data, isLoading, isError, refetch } = useGetCotizaciones({
    limite: 100,
    ...(estado !== "TODAS" ? { estado } : {}),
  });
  const terceros = useMapaTerceros();
  const cambiarEstado = useCambiarEstadoCotizacion();
  const convertir = useConvertirCotizacion();

  const cotizaciones = useMemo(() => {
    const items = data?.datos ?? [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return items;
    return items.filter((cotizacion) => {
      const cliente = terceros.tercero(cotizacion.terceroId);
      return (
        cotizacion.numero.includes(termino) ||
        cliente?.nombre.toLowerCase().includes(termino) ||
        cliente?.numeroDocumento.includes(termino)
      );
    });
  }, [data, busqueda, terceros]);

  /* La línea cuenta sobre TODAS las cotizaciones, no sobre el filtro: es el
     trabajo pendiente del proceso, no lo que la persona está mirando. */
  const { data: todas } = useGetCotizaciones({ limite: 200 });
  const universo = useMemo(() => todas?.datos ?? [], [todas]);
  const conteos = useMemo(() => contar(universo), [universo]);
  const convertidas = useMemo(
    () => universo.filter((c) => c.ventaId !== null).length,
    [universo],
  );

  /* Cuántas hay en cada estado, para que el panel de filtros lo diga sin que
     haya que probar uno por uno. Sale del mismo universo que la línea del
     proceso, no de lo que esté filtrado. */
  const porEstado = useMemo(() => {
    const mapa = new Map<EstadoCotizacionVisible, number>();
    for (const cotizacion of universo) {
      mapa.set(cotizacion.estadoVisible, (mapa.get(cotizacion.estadoVisible) ?? 0) + 1);
    }
    return mapa;
  }, [universo]);

  const TITULO_NODO: Record<IdNodoCotizacion, string> = {
    cotizar: "Nueva cotización",
    enviar: "Cotizaciones sin enviar",
    respuesta: "Esperando respuesta del cliente",
    convertir: "Listas para vender",
  };

  const grupos = useMemo((): GrupoSelector<DocumentoCotizacion>[] => {
    if (!nodoAbierto || nodoAbierto === "cotizar") return [];

    const comoDocumento = (cotizacion: Cotizacion): DocumentoCotizacion => ({
      id: cotizacion.id,
      numero: cotizacion.numero,
      titulo: terceros.nombre(cotizacion.terceroId),
      detalle: formatCOP(Number(cotizacion.total)),
      contextual: cotizacion.vencida
        ? `venció el ${formatFecha(cotizacion.validoHasta)}`
        : `vence el ${formatFecha(cotizacion.validoHasta)}`,
    });

    const de = (sub: string) =>
      universo.filter((c) => subbandejaDe(c) === sub).map(comoDocumento);

    const abrir = {
      label: "Abrir",
      onElegir: (documento: DocumentoCotizacion) => {
        setNodoAbierto(null);
        setViendo({ id: documento.id, numero: documento.numero });
      },
    };

    if (nodoAbierto === "enviar") {
      return [
        {
          id: "borrador",
          label: "Sin enviar",
          documentos: de("borrador"),
          accion: {
            label: "Marcar enviada",
            onElegir: (documento) => {
              setNodoAbierto(null);
              cambiarEstado.mutate({ id: documento.id, estado: "ENVIADA" });
            },
          },
        },
      ];
    }

    if (nodoAbierto === "respuesta") {
      return [
        // La vencida va primero: es la que necesita una decisión hoy.
        { id: "vencida", label: "Vencidas", tono: "traba", documentos: de("vencida"), accion: abrir },
        {
          id: "esperando",
          label: "Esperando respuesta",
          tono: "espera",
          documentos: de("esperando"),
          accion: abrir,
        },
      ];
    }

    return [
      {
        id: "aceptada",
        label: "Listas para vender",
        documentos: de("aceptada"),
        accion: {
          label: "Convertir en venta",
          onElegir: (documento) => {
            const cotizacion = universo.find((c) => c.id === documento.id);
            setNodoAbierto(null);
            if (cotizacion) setConvirtiendo(cotizacion);
          },
        },
      },
    ];
  }, [nodoAbierto, universo, terceros, cambiarEstado]);

  const columnas = useMemo(
    () =>
      crearColumnasCotizaciones({
        onVer: (c) => setViendo({ id: c.id, numero: c.numero }),
        onEditar: (c) => setEditando(c),
        onEnviar: (c) => cambiarEstado.mutate({ id: c.id, estado: "ENVIADA" }),
        onRechazar: (c) => cambiarEstado.mutate({ id: c.id, estado: "RECHAZADA" }),
        onConvertir: (c) => setConvirtiendo(c),
        nombreCliente: terceros.nombre,
      }),
    [cambiarEstado, terceros.nombre],
  );

  return (
    <div className="space-y-6">
      <PageHeader titulo="Cotizaciones" />

      <ProcesoCotizacionLinea
        pestanas={pestanas}
        acciones={
          <Button className="gap-2" onClick={() => setCreando(true)}>
            <Plus size={16} strokeWidth={1.75} />
            Nueva cotización
          </Button>
        }
        conteos={conteos}
        convertidas={convertidas}
        onAccion={(nodo) => (nodo === "cotizar" ? setCreando(true) : setNodoAbierto(nodo))}
        operables={{ cotizar: true, enviar: true, respuesta: true, convertir: true }}
      />

      <SelectorDocumentoModal<DocumentoCotizacion>
        open={nodoAbierto !== null && nodoAbierto !== "cotizar"}
        onOpenChange={(abierto) => !abierto && setNodoAbierto(null)}
        titulo={nodoAbierto ? TITULO_NODO[nodoAbierto] : ""}
        grupos={grupos}
        singular="cotización"
        plural="cotizaciones"
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
      />

      <DataTable
        columns={columnas}
        data={cotizaciones}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(cotizacion) =>
          setViendo({ id: cotizacion.id, numero: cotizacion.numero })
        }
        mensajeVacio="No hay cotizaciones todavía."
        barra={
          /* El estado es un filtro de ESTA tabla, así que vive en su barra y no
             como una fila de pastillas suelta entre el panel y la lista.
             `VENCIDA` filtra por la fecha, no por la columna: es un estado
             derivado y no existe en la base. Lo resuelve el backend. */
          <BarraListado
            filtros={[
              grupoUnico<EstadoCotizacionVisible | "TODAS">({
                id: "estado",
                titulo: "Estado",
                todos: "TODAS",
                etiquetaTodos: "Todas",
                valor: estado,
                onChange: setEstado,
                opciones: ESTADOS_FILTRO.map((opcion) => ({
                  valor: opcion.id,
                  label: opcion.label,
                  apunte: porEstado.get(opcion.id) ?? 0,
                })),
              }),
            ]}
            busqueda={{
              valor: busqueda,
              onChange: setBusqueda,
              placeholder: "Buscar por número o cliente…",
            }}
          />
        }
      />

      <CotizacionDetalleModal
        cotizacionId={viendo?.id ?? null}
        numero={viendo?.numero}
        open={viendo !== null}
        onOpenChange={(abierto) => !abierto && setViendo(null)}
      />

      {/* La venta que sale de convertir: se muestra encima del listado en vez
          de saltar al módulo de ventas. */}
      <VentaDetalleModal
        ventaId={venta}
        open={venta !== null}
        onOpenChange={(abierto) => !abierto && setVenta(null)}
      />

      <FormDialog open={creando} onOpenChange={setCreando} titulo="Nueva cotización">
        <CotizacionFormView
          enModal
          onExito={(id) => {
            setCreando(false);
            setViendo({ id });
          }}
          onCerrar={() => setCreando(false)}
        />
      </FormDialog>

      <FormDialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
        titulo={`Editar cotización ${editando?.numero ?? ""}`}
      >
        {editando && (
          <CotizacionFormView
            cotizacionId={editando.id}
            enModal
            onExito={() => setEditando(null)}
            onCerrar={() => setEditando(null)}
          />
        )}
      </FormDialog>

      <ConvertirCotizacionModal
        open={convirtiendo !== null}
        onOpenChange={(abierto) => !abierto && setConvirtiendo(null)}
        numero={convirtiendo?.numero}
        loading={convertir.isPending}
        onConfirmar={(condicion) => {
          if (!convirtiendo) return;
          convertir.mutate(
            { id: convirtiendo.id, data: { condicion } },
            {
              onSuccess: (venta) => {
                setConvirtiendo(null);
                setVenta(venta.id);
              },
            },
          );
        }}
      />
    </div>
  );
}
