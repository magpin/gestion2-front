"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { BarraListado, grupoUnico, interruptor } from "@/components/shared/BarraListado";
import { useAuthStore } from "@/core/store/authStore";
import { formatCOP } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { AnularCompraModal } from "../components/AnularCompraModal";
import { crearColumnasCompras } from "../components/comprasColumns";
import { useGetCompras } from "../hooks/useCompras";
import { useAnularCompra } from "../hooks/useCompraMutations";
import { CarteraProveedoresModal } from "./CarteraProveedoresModal";
import { CompraFormView } from "./CompraFormView";
import type { Compra, CondicionPago } from "../types/compras.types";

/**
 * Los filtros son los que el modelo puede contestar.
 *
 * El estado de una compra se DERIVA del saldo —no hay columna que lo guarde—,
 * así que pendientes y pagadas se parten acá con lo que ya está en memoria. Las
 * anuladas son otra cosa: el backend las excluye salvo que se le pidan, por eso
 * son un interruptor que viaja en la consulta y no una opción más del grupo.
 */
type FiltroEstado = "TODAS" | "PENDIENTE" | "PAGADA";
type FiltroCondicion = "TODAS" | CondicionPago;

/**
 * Registro de la factura del proveedor (evento A1). Rol COMPRAS.
 *
 * Una petición y tres módulos: la compra acá, la entrada al kardex en
 * inventario y el asiento en contabilidad. No hay línea de proceso como en
 * venta porque no hay proceso que seguir: la compra nace y queda hecha. Lo
 * único que sigue vivo después es su saldo, y ese se cobra desde Caja.
 */
export function ComprasView() {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  const puedeRegistrar = roles.includes("COMPRAS");

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("TODAS");
  const [condicion, setCondicion] = useState<FiltroCondicion>("TODAS");
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);
  const [creando, setCreando] = useState(false);
  const [viendoCartera, setViendoCartera] = useState(false);
  const [anulando, setAnulando] = useState<Compra | null>(null);

  /* `incluirAnuladas` viaja en la consulta y no en el filtrado de acá: el
     backend esconde las anuladas por defecto, así que no hay forma de
     recuperarlas sin volver a pedirlas. */
  const { data, isLoading, isError, refetch } = useGetCompras({
    limite: 100,
    ...(incluirAnuladas ? { incluirAnuladas: true } : {}),
  });
  const terceros = useMapaTerceros();
  const anular = useAnularCompra();

  const todas = useMemo(() => data?.datos ?? [], [data]);

  /* Las cifras del panel: se cuentan sobre todo lo traído, para que digan
     cuántas hay ANTES de poner el filtro y no después. */
  const conteos = useMemo(
    () => ({
      pendientes: todas.filter((c) => !c.anulada && c.saldoPendiente > 0).length,
      pagadas: todas.filter((c) => !c.anulada && c.saldoPendiente <= 0).length,
      contado: todas.filter((c) => c.condicion === "CONTADO").length,
      credito: todas.filter((c) => c.condicion === "CREDITO").length,
    }),
    [todas],
  );

  // El backend busca por número de factura; el nombre del proveedor vive en
  // `terceros`, así que ese filtro se resuelve acá con el mapa que ya se tiene.
  const compras = useMemo(() => {
    let items = todas;

    if (estado === "PENDIENTE") {
      items = items.filter((c) => !c.anulada && c.saldoPendiente > 0);
    } else if (estado === "PAGADA") {
      items = items.filter((c) => !c.anulada && c.saldoPendiente <= 0);
    }

    if (condicion !== "TODAS") {
      items = items.filter((c) => c.condicion === condicion);
    }

    const termino = busqueda.trim().toLowerCase();
    if (termino) {
      items = items.filter((compra) => {
        const proveedor = terceros.tercero(compra.terceroId);
        return (
          compra.numeroFactura.toLowerCase().includes(termino) ||
          proveedor?.nombre.toLowerCase().includes(termino) ||
          proveedor?.numeroDocumento.includes(termino) ||
          compra.fecha.includes(termino)
        );
      });
    }

    return items;
  }, [todas, busqueda, estado, condicion, terceros]);

  /* El pie cuadra con el filtro puesto: suma lo que se está viendo, no lo que
     hay en la base. Una anulada no le debe nada a nadie, así que no trae saldo. */
  const totales = useMemo(
    () =>
      compras.reduce(
        (acumulado, compra) => ({
          saldo: acumulado.saldo + (compra.anulada ? 0 : compra.saldoPendiente),
          total: acumulado.total + compra.total,
        }),
        { saldo: 0, total: 0 },
      ),
    [compras],
  );

  const columnas = useMemo(
    () =>
      crearColumnasCompras({
        onVer: (compra) => router.push(`/dashboard/compras/${compra.id}`),
        onAnular: (compra) => setAnulando(compra),
        nombreProveedor: terceros.nombre,
        puedeAnular: puedeRegistrar,
      }),
    [router, terceros.nombre, puedeRegistrar],
  );

  return (
    <div className="space-y-6">
      <PageHeader titulo="Compras" />

      <DataTable
        columns={columnas}
        data={compras}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(compra) => router.push(`/dashboard/compras/${compra.id}`)}
        mensajeVacio="No hay compras con este filtro."
        barra={
          <BarraListado
            filtros={[
              grupoUnico<FiltroEstado>({
                id: "estado",
                titulo: "Estado de pago",
                todos: "TODAS",
                etiquetaTodos: "Todas",
                valor: estado,
                onChange: setEstado,
                opciones: [
                  { valor: "PENDIENTE", label: "Pendientes", apunte: conteos.pendientes },
                  { valor: "PAGADA", label: "Pagadas", apunte: conteos.pagadas },
                ],
              }),
              grupoUnico<FiltroCondicion>({
                id: "condicion",
                titulo: "Condición",
                todos: "TODAS",
                etiquetaTodos: "Todas",
                valor: condicion,
                onChange: setCondicion,
                opciones: [
                  { valor: "CONTADO", label: "Contado", apunte: conteos.contado },
                  { valor: "CREDITO", label: "Crédito", apunte: conteos.credito },
                ],
              }),
              interruptor({
                id: "anuladas",
                titulo: "Inclusión",
                texto: "Incluir compras anuladas",
                chip: "Con anuladas",
                valor: incluirAnuladas,
                onChange: setIncluirAnuladas,
              }),
            ]}
            busqueda={{
              valor: busqueda,
              onChange: setBusqueda,
              placeholder: "Buscar por factura o proveedor…",
            }}
            /* Registrar la factura del proveedor es el gesto propio del módulo:
               es el que se gana el botón sólido. */
            accion={
              puedeRegistrar
                ? { label: "Nueva compra", icon: Plus, onClick: () => setCreando(true) }
                : undefined
            }
            /* La cartera se mira, no se opera: pagarle al proveedor es de
               tesorería y tiene su pantalla. Por eso baja al «⋯» en vez de
               competir con el botón que sí escribe algo acá. */
            menu={[
              {
                label: "Cartera de proveedores",
                icon: HandCoins,
                onClick: () => setViendoCartera(true),
              },
            ]}
          />
        }
        pie={
          <tr>
            <td colSpan={5} className="text-muted-foreground">
              Totales · {compras.length} {compras.length === 1 ? "compra" : "compras"}
            </td>
            <td className="font-mono tabular-nums text-foreground">{formatCOP(totales.saldo)}</td>
            <td className="font-mono tabular-nums text-foreground">{formatCOP(totales.total)}</td>
            <td />
          </tr>
        }
      />

      <FormDialog open={creando} onOpenChange={setCreando} titulo="Nueva compra">
        <CompraFormView
          enModal
          onExito={(id) => {
            setCreando(false);
            router.push(`/dashboard/compras/${id}`);
          }}
          onCerrar={() => setCreando(false)}
        />
      </FormDialog>

      <CarteraProveedoresModal
        open={viendoCartera}
        onOpenChange={setViendoCartera}
        onVerCompra={(compraId) => {
          setViendoCartera(false);
          router.push(`/dashboard/compras/${compraId}`);
        }}
      />

      <AnularCompraModal
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
