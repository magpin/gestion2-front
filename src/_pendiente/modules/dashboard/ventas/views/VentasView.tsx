"use client";

import { useMemo, useState, type ReactNode } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { FormDialog } from "@/components/shared/FormDialog";
import {
  SelectorDocumentoModal,
  type GrupoSelector,
} from "@/components/shared/SelectorDocumentoModal";
import { useAuthStore } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { crearColumnasVentas } from "../components/ventasColumns";
import { AnularVentaModal } from "../components/AnularVentaModal";
import { ProcesoVentaLinea } from "../components/ProcesoVentaLinea";
import {
  contar,
  lineasSinFirmarPorVenta,
  subbandejaDe,
  ubicar,
  type IdNodoVenta,
} from "../lib/ciclo-venta";
import {
  useGetAutorizacionesPendientes,
  useGetVentas,
  useGetVentasFacturadas,
} from "../hooks/useVentas";
import { useAnularVenta, useFacturarVenta } from "../hooks/useVentaMutations";
import { VentaFormView } from "./VentaFormView";
import { VentaDetalleModal } from "./VentaDetalleModal";
import { CarteraClientesModal } from "./CarteraClientesModal";
import type { Venta } from "../types/ventas.types";

/** Una venta como la lista el selector: cuatro textos ya resueltos. */
interface VentaEnSelector {
  id: string;
  numero: string;
  titulo: string;
  detalle?: string;
  contextual?: string;
}

/**
 * Bandeja del mostrador (evento A3). Rol VENTAS.
 *
 * Arriba, la línea del proceso: los nodos con el trabajo que falta. Abajo,
 * la tabla completa para buscar una venta concreta. El gesto de la línea es de
 * dos pasos —elegir la venta, después la acción— y es el mismo componente
 * genérico que usan los otros procesos.
 */
interface VentasViewProps {
  /** Las pestañas del módulo, pintadas bajo el título. */
  pestanas?: ReactNode;
}

export function VentasView({ pestanas }: VentasViewProps) {
  const roles = useAuthStore((state) => state.roles);
  const puedeVender = roles.includes("VENTAS");
  const esDirector = roles.includes("DIRECTOR");

  const [creando, setCreando] = useState(false);
  const [viendoCartera, setViendoCartera] = useState(false);
  const [nodoAbierto, setNodoAbierto] = useState<IdNodoVenta | null>(null);
  /* La venta abierta en el diálogo. Se guarda el id y su título porque se abre
     desde tres sitios —la tabla, el selector del proceso y la cartera— y no
     siempre hay una fila a la mano. */
  const [viendo, setViendo] = useState<{ id: string; titulo?: string } | null>(null);
  const [facturando, setFacturando] = useState<Venta | null>(null);
  const [anulando, setAnulando] = useState<Venta | null>(null);

  const { data, isLoading, isError, refetch } = useGetVentas({ limite: 100 });
  const { data: facturadas } = useGetVentasFacturadas();
  const { data: sinFirmar = [] } = useGetAutorizacionesPendientes();
  const terceros = useMapaTerceros();
  const facturar = useFacturarVenta();
  const anular = useAnularVenta();

  /* Las ventas del listado, con los dos datos que no trae la venta: si ya tiene
     factura —eso vive en `facturacion`— y cuántas líneas esperan firma. */
  const ubicadas = useMemo(() => {
    const facturasPorVenta = new Set(facturadas ? [...facturadas.keys()] : []);
    const pendientesPorVenta = lineasSinFirmarPorVenta(sinFirmar);
    return (data?.datos ?? []).map((venta) =>
      ubicar(venta, facturasPorVenta, pendientesPorVenta),
    );
  }, [data, facturadas, sinFirmar]);

  const conteos = useMemo(() => contar(ubicadas), [ubicadas]);
  const anuladas = useMemo(() => ubicadas.filter((v) => v.anulada).length, [ubicadas]);

  const columnas = useMemo(
    () =>
      crearColumnasVentas({
        onVer: (venta) => setViendo({ id: venta.id, titulo: `Venta del ${formatFecha(venta.fecha)}` }),
        onFacturar: (venta) => setFacturando(venta),
        onAnular: (venta) => setAnulando(venta),
        nombreCliente: terceros.nombre,
        puedeAnular: puedeVender,
      }),
    [puedeVender, terceros.nombre],
  );

  /* Qué se lista dentro de cada nodo, y qué acción ofrece.
     `accion` ausente = grupo informativo: se ve, no se opera. */
  const grupos = useMemo((): GrupoSelector<VentaEnSelector>[] => {
    if (!nodoAbierto || nodoAbierto === "vender") return [];

    const comoDocumento = (venta: (typeof ubicadas)[number]): VentaEnSelector => ({
      id: venta.id,
      numero: facturadas?.get(venta.id) ?? "sin factura",
      titulo: terceros.nombre(venta.terceroId),
      detalle: formatFecha(venta.fecha),
      contextual:
        venta.lineasSinFirmar > 0
          ? `${venta.lineasSinFirmar} ${venta.lineasSinFirmar === 1 ? "línea" : "líneas"} bajo el piso`
          : formatCOP(Number(venta.total)),
    });

    const de = (sub: string) =>
      ubicadas.filter((venta) => subbandejaDe(venta) === sub).map(comoDocumento);

    return [
      // Las frenadas van primero: es la que necesita una llamada, no un clic.
      {
        id: "sin_autorizar",
        label: "Esperando firma del director",
        tono: "traba",
        documentos: de("sin_autorizar"),
        accion: {
          // Firmar es del DIRECTOR y su pantalla es Administración. Desde acá
          // se abre la venta: sirve para ver qué línea es y a quién llamar.
          label: esDirector ? "Abrir para firmar" : "Ver la venta",
          onElegir: (documento) => {
            setNodoAbierto(null);
            setViendo({ id: documento.id });
          },
        },
      },
      {
        id: "sin_facturar",
        label: "Listas para facturar",
        documentos: de("sin_facturar"),
        accion: puedeVender
          ? {
              label: "Emitir factura",
              onElegir: (documento) => {
                const venta = ubicadas.find((v) => v.id === documento.id);
                setNodoAbierto(null);
                if (venta) setFacturando(venta);
              },
            }
          : undefined,
      },
    ];
  }, [nodoAbierto, ubicadas, facturadas, terceros, esDirector, puedeVender]);

  const TITULO_NODO: Record<IdNodoVenta, string> = {
    vender: "Registrar venta",
    facturar: "Ventas por facturar",
  };

  return (
    <div className="space-y-6">
      <PageHeader titulo="Ventas" />

      <ProcesoVentaLinea
        pestanas={pestanas}
        acciones={
          <Button className="gap-2" onClick={() => setViendoCartera(true)}>
            <HandCoins size={16} strokeWidth={1.75} />
            Cobrar
          </Button>
        }
        conteos={conteos}
        anuladas={anuladas}
        onAccion={(nodo) => (nodo === "vender" ? setCreando(true) : setNodoAbierto(nodo))}
        // Facturar se abre aunque el rol no emita: ver qué está frenado por una
        // firma es parte del trabajo de quien va a facturar.
        operables={{ vender: puedeVender, facturar: true }}
      />

      <DataTable
        columns={columnas}
        data={ubicadas}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(venta) =>
          setViendo({ id: venta.id, titulo: `Venta del ${formatFecha(venta.fecha)}` })
        }
        mensajeVacio="No hay ventas registradas todavía."
      />

      <VentaDetalleModal
        ventaId={viendo?.id ?? null}
        titulo={viendo?.titulo}
        open={viendo !== null}
        onOpenChange={(abierto) => !abierto && setViendo(null)}
      />

      <SelectorDocumentoModal<VentaEnSelector>
        open={nodoAbierto !== null && nodoAbierto !== "vender"}
        onOpenChange={(abierto) => !abierto && setNodoAbierto(null)}
        titulo={nodoAbierto ? TITULO_NODO[nodoAbierto] : ""}
        grupos={grupos}
        singular="venta"
        plural="ventas"
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
      />

      <FormDialog open={creando} onOpenChange={setCreando} titulo="Nueva venta">
        <VentaFormView
          enModal
          onExito={(id) => {
            setCreando(false);
            setViendo({ id });
          }}
          onCerrar={() => setCreando(false)}
        />
      </FormDialog>

      <CarteraClientesModal
        open={viendoCartera}
        onOpenChange={setViendoCartera}
        onVerVenta={(ventaId) => {
          setViendoCartera(false);
          setViendo({ id: ventaId });
        }}
      />

      {/* Emitir toma el consecutivo y CONGELA la venta: desde ahí sus líneas no
          se tocan, porque son los renglones del papel que se entrega. */}
      <Modal
        open={facturando !== null}
        onOpenChange={(abierto) => !abierto && setFacturando(null)}
        titulo="Emitir factura"
        descripcion="Toma el siguiente número fiscal y congela la venta: sus líneas dejan de editarse. Corregir después es emitir una nota crédito."
        labelConfirmar="Emitir"
        confirmarLoading={facturar.isPending}
        onConfirmar={() => {
          if (!facturando) return;
          facturar.mutate(facturando.id, { onSuccess: () => setFacturando(null) });
        }}
      />

      <AnularVentaModal
        open={anulando !== null}
        onOpenChange={(abierto) => !abierto && setAnulando(null)}
        loading={anular.isPending}
        onConfirmar={(motivo) => {
          if (!anulando) return;
          anular.mutate({ id: anulando.id, motivo }, { onSuccess: () => setAnulando(null) });
        }}
      />
    </div>
  );
}
