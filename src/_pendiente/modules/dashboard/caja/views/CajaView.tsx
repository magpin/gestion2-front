"use client";

import { useMemo, useState, type ReactNode } from "react";
import { HandCoins, Lock, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import {
  RangoSelector,
  rangoDePreset,
  type Rango,
} from "@/components/shared/RangoSelector";
import {
  AccionesListado,
  BarraListado,
  grupoUnico,
  interruptor,
  type AccionListado,
} from "@/components/shared/BarraListado";
import {
  SelectorDocumentoModal,
  type GrupoSelector,
} from "@/components/shared/SelectorDocumentoModal";
import { useAuthStore } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import type { AbonoFormData, ArqueoFormData } from "@/lib/validators";
import { AbonoFormModal } from "../components/AbonoFormModal";
import { AnularAbonoModal } from "../components/AnularAbonoModal";
import { ArquearModal } from "../components/ArquearModal";
import { crearColumnasAbonos } from "../components/abonosColumns";
import { VentaDetalleModal } from "@/modules/dashboard/ventas/views/VentaDetalleModal";
import { CompraDetalleModal } from "@/modules/dashboard/compras/views/CompraDetalleModal";
import {
  estadoDelCierre,
  subbandejaDe,
  ubicar,
  type DocumentoUbicable,
} from "../lib/ciclo-caja";
import {
  useGetAbonos,
  useGetArqueosRecientes,
  useGetCartera,
  useGetSaldoCaja,
} from "../hooks/useCaja";
import { useAnularAbono, useArquear, useCobrar, usePagar } from "../hooks/useCajaMutations";
import { tocaLaCaja, type Abono, type SentidoAbono } from "../types/caja.types";

/** Un documento como lo lista el selector: cuatro textos ya resueltos. */
interface DocumentoEnSelectorCaja {
  id: string;
  numero: string;
  titulo: string;
  detalle?: string;
  contextual?: string;
}

interface CajaViewProps {
  /** Las pestañas del área. Van bajo el título, no dentro de la barra. */
  pestanas?: ReactNode;
}

/**
 * La caja: lo que se cobró y lo que se pagó, con los tres gestos a la mano.
 *
 * La tabla es el hecho —cada abono, con cualquier medio de pago— y en su barra
 * viven los tres gestos que la hacen crecer. Uno solo está a la vista: cerrar
 * la caja es lo que no se puede olvidar al terminar el día, y es lo que define
 * el módulo. Cobrar y pagar viven en el menú de al lado, a un clic.
 *
 * No hay panel de proceso porque acá no hay etapas que recorrer: son tres
 * acciones sueltas sobre un mismo cajón.
 *
 * El saldo del cajón baja a un renglón dentro de la barra. Pierde peso a
 * propósito: el efectivo es UNA de las cinco formas de cobrar, y un titular
 * gigante hacía creer que la caja solo mueve billetes.
 *
 * Cobrar y pagar son un gesto de dos pasos —elegir el documento, después el
 * importe— con el mismo selector genérico que los otros procesos.
 */
export function CajaView({ pestanas }: CajaViewProps) {
  const roles = useAuthStore((state) => state.roles);
  const puedeCobrar = roles.includes("CAJA");
  // Pagarle a un proveedor lo puede hacer quien maneja las compras o quien
  // tiene la plata en la mano: el backend admite los dos roles.
  const puedePagar = roles.includes("CAJA") || roles.includes("COMPRAS");
  const puedeCerrar = roles.includes("CAJA");
  const puedeAnular = puedePagar;

  const [rango, setRango] = useState<Rango>(() => rangoDePreset("mes"));
  const [sentido, setSentido] = useState<"TODOS" | SentidoAbono>("TODOS");
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [eligiendo, setEligiendo] = useState<SentidoAbono | null>(null);
  const [abonando, setAbonando] = useState<{
    documento: DocumentoUbicable;
    sentido: SentidoAbono;
  } | null>(null);
  const [arqueando, setArqueando] = useState(false);
  const [anulando, setAnulando] = useState<Abono | null>(null);
  const [venta, setVenta] = useState<string | null>(null);
  const [compra, setCompra] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetAbonos({
    desde: rango.desde,
    hasta: rango.hasta,
    // El sentido lo filtra el backend: `FiltrosAbono` ya lo acepta, así que no
    // se traen cien filas para descartar la mitad en el navegador.
    sentido: sentido === "TODOS" ? undefined : sentido,
    incluirAnulados: incluirAnulados || undefined,
    limite: 100,
  });

  const { data: saldo = 0 } = useGetSaldoCaja();
  const { data: arqueosRecientes } = useGetArqueosRecientes();
  const {
    data: cartera,
    isLoading: cargandoCartera,
    isError: errorCartera,
    refetch: recargarCartera,
  } = useGetCartera();

  const terceros = useMapaTerceros();
  const cobrar = useCobrar();
  const pagar = usePagar();
  const arquear = useArquear();
  const anular = useAnularAbono();

  const cierre = useMemo(
    () => estadoDelCierre(arqueosRecientes?.datos ?? []),
    [arqueosRecientes],
  );

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

  /* Lo que suma lo que se ve. Los anulados no entran —ese abono no existió— y
     el conteo de efectivo va aparte porque es el único que tocó el cajón. */
  const totales = useMemo(() => {
    const vivos = abonos.filter((abono) => !abono.anulado);
    return {
      importe: vivos.reduce((suma, abono) => suma + abono.importe, 0),
      enEfectivo: vivos.filter((abono) => tocaLaCaja(abono.medioPago)).length,
    };
  }, [abonos]);

  const documentos = useMemo(
    () => ubicar(cartera?.porCobrar ?? [], cartera?.porPagar ?? []),
    [cartera],
  );

  /* Qué se lista al elegir documento. Un solo grupo: el lado que se abrió. */
  const grupos = useMemo((): GrupoSelector<DocumentoEnSelectorCaja>[] => {
    if (eligiendo === null) return [];

    const esCobro = eligiendo === "COBRO";
    const lado = esCobro ? "por_cobrar" : "por_pagar";
    const listados = documentos.filter((documento) => subbandejaDe(documento) === lado);

    return [
      {
        id: lado,
        label: esCobro ? "Ventas con saldo" : "Compras con saldo",
        tono: "espera",
        documentos: listados.map((documento) => ({
          id: documento.id,
          numero: documento.referencia,
          titulo: terceros.nombre(documento.terceroId),
          detalle: formatFecha(documento.fecha),
          contextual: `saldo ${formatCOP(documento.saldoPendiente)}`,
        })),
        accion: {
          label: esCobro ? "Registrar cobro" : "Registrar pago",
          onElegir: (elegido) => {
            const documento = documentos.find((candidato) => candidato.id === elegido.id);
            setEligiendo(null);
            if (documento) setAbonando({ documento, sentido: esCobro ? "COBRO" : "PAGO" });
          },
        },
      },
    ];
  }, [eligiendo, documentos, terceros]);

  const registrarAbono = (datos: AbonoFormData) => {
    if (!abonando) return;
    const comun = {
      importe: datos.importe,
      medioPago: datos.medioPago,
      fecha: datos.fecha,
      referencia: datos.referencia?.trim() || undefined,
      observacion: datos.observacion?.trim() || undefined,
    };
    const alTerminar = { onSuccess: () => setAbonando(null) };

    if (abonando.sentido === "COBRO") {
      // `OT` entra con el módulo 7: hoy el único origen cobrable es la venta.
      cobrar.mutate({ origenTipo: "VENTA", origenId: abonando.documento.id, ...comun }, alTerminar);
    } else {
      pagar.mutate({ compraId: abonando.documento.id, ...comun }, alTerminar);
    }
  };

  const cerrarCaja = (datos: ArqueoFormData) => {
    arquear.mutate(
      {
        fecha: datos.fecha,
        saldoContado: datos.saldoContado,
        observacion: datos.observacion?.trim() || undefined,
      },
      { onSuccess: () => setArqueando(false) },
    );
  };

  const columnas = useMemo(
    () =>
      crearColumnasAbonos({
        /* La venta o la compra se abren encima de la caja: quien está cuadrando
           el cajón no quiere perder el rango que tiene puesto. */
        onVerDocumento: (abono) =>
          abono.origenTipo === "VENTA"
            ? setVenta(abono.origenId)
            : setCompra(abono.origenId),
        onAnular: (abono) => setAnulando(abono),
        nombreTercero: terceros.nombre,
        puedeAnular,
      }),
    [terceros.nombre, puedeAnular],
  );

  /* Registrar un cobro o un pago sigue siendo el gesto de todos los días, pero
     no es lo que distingue a esta pantalla: eso es cerrar el cajón. Van al
     menú, en el orden en que se usan. */
  const menu: AccionListado[] = [
    ...(puedeCobrar
      ? [
          {
            label: "Registrar cobro",
            icon: HandCoins,
            onClick: () => setEligiendo("COBRO"),
          },
        ]
      : []),
    ...(puedePagar
      ? [
          {
            label: "Registrar pago",
            icon: Wallet,
            onClick: () => setEligiendo("PAGO"),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Caja"
        acciones={<RangoSelector rango={rango} onRangoChange={setRango} />}
      />

      <DataTable
        pestanas={pestanas}
        /* Buscar, cerrar caja y «⋯» suben a la fila de pestañas: no acotan la
           lista, actúan sobre el módulo entero. Abajo quedan solo los filtros. */
        acciones={
          <AccionesListado
            busqueda={{
              valor: busqueda,
              onChange: setBusqueda,
              placeholder: "Buscar por tercero…",
            }}
            accion={
              puedeCerrar
                ? { label: "Cerrar caja", icon: Lock, onClick: () => setArqueando(true) }
                : undefined
            }
            menu={menu}
          />
        }
        columns={columnas}
        data={abonos}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        mensajeVacio="No hay cobros ni pagos en este rango."
        pageSize={25}
        barra={
          <div className="space-y-3">
            <BarraListado
              filtros={[
                grupoUnico<"TODOS" | SentidoAbono>({
                  id: "sentido",
                  titulo: "Sentido",
                  todos: "TODOS",
                  valor: sentido,
                  onChange: setSentido,
                  opciones: [
                    { valor: "COBRO", label: "Cobros" },
                    { valor: "PAGO", label: "Pagos" },
                  ],
                }),
                interruptor({
                  id: "anulados",
                  titulo: "Incluir",
                  texto: "Movimientos anulados",
                  chip: "Anulados",
                  valor: incluirAnulados,
                  onChange: setIncluirAnulados,
                }),
              ]}
            />

            {/* El renglón del cajón: cuánto efectivo hay y si ya se contó hoy.
                Va acá y no en una tarjeta aparte porque es el contexto de los
                botones que tiene encima, no un indicador del módulo. */}
            <p className="text-sm text-muted-foreground">
              Efectivo en caja{" "}
              <strong className="font-mono text-base font-semibold text-foreground">
                {formatCOP(saldo)}
              </strong>{" "}
              ·{" "}
              {cierre.arqueadoHoy ? (
                <span>arqueada hoy</span>
              ) : (
                <span className="text-destructive">
                  sin arquear hoy
                  {cierre.ultimoArqueo
                    ? ` · último cierre ${formatFecha(cierre.ultimoArqueo)}`
                    : " · nunca se ha cerrado"}
                </span>
              )}
            </p>
          </div>
        }
        pie={
          <tr>
            <td colSpan={4} className="text-muted-foreground">
              Totales · {abonos.length} {abonos.length === 1 ? "abono" : "abonos"}
            </td>
            <td className="font-normal text-muted-foreground">
              {totales.enEfectivo > 0 ? `${totales.enEfectivo} en efectivo` : "nada en efectivo"}
            </td>
            <td className="text-right font-mono tabular-nums text-foreground">
              {formatCOP(totales.importe)}
            </td>
            <td />
          </tr>
        }
      />

      <SelectorDocumentoModal<DocumentoEnSelectorCaja>
        open={eligiendo !== null}
        onOpenChange={(abierto) => !abierto && setEligiendo(null)}
        titulo={eligiendo === "PAGO" ? "Documentos por pagar" : "Documentos por cobrar"}
        grupos={grupos}
        singular="documento"
        plural="documentos"
        isLoading={cargandoCartera}
        isError={errorCartera}
        onReintentar={() => void recargarCartera()}
      />

      <AbonoFormModal
        open={abonando !== null}
        onOpenChange={(abierto) => !abierto && setAbonando(null)}
        documento={abonando?.documento ?? null}
        sentido={abonando?.sentido ?? "COBRO"}
        nombreTercero={terceros.nombre}
        loading={cobrar.isPending || pagar.isPending}
        onConfirmar={registrarAbono}
      />

      <ArquearModal
        open={arqueando}
        onOpenChange={setArqueando}
        loading={arquear.isPending}
        onConfirmar={cerrarCaja}
      />

      <AnularAbonoModal
        open={anulando !== null}
        onOpenChange={(abierto) => !abierto && setAnulando(null)}
        loading={anular.isPending}
        onConfirmar={(motivo) => {
          if (!anulando) return;
          anular.mutate({ id: anulando.id, motivo }, { onSuccess: () => setAnulando(null) });
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
