"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { FormDialog } from "@/components/shared/FormDialog";
import {
  BarraListado,
  grupoUnico,
  interruptor,
} from "@/components/shared/BarraListado";
import { useAuthStore } from "@/core/store/authStore";
import { useGetProductos } from "../hooks/useProductos";
import {
  useDesactivarProducto,
  useActualizarMargenMinimo,
} from "../hooks/useProductoMutations";
import { crearColumnasProductos } from "../components/productosColumns";
import { PrecioMinimoModal } from "../components/PrecioMinimoModal";
import { ProductoFormView } from "./ProductoFormView";
import { ProductoDetalleModal } from "./ProductoDetalleModal";
import { bajoCritico, type Producto } from "../types/productos.types";

/**
 * Los filtros son los que el modelo puede contestar.
 *
 * No hay «venta» ni «repuesto»: `producto` no tiene columna de tipo en el modelo
 * de 32 tablas. Lo que sí distingue es si maneja stock —un servicio no pasa por
 * el kardex— y si ese stock está en el piso.
 *
 * El tipo es un grupo de selección única —con inventario y servicios parten la
 * lista en dos— y «inventario bajo» es un interruptor aparte, porque no es otro
 * tipo sino un recorte del que ya esté puesto.
 */
type FiltroTipo = "TODOS" | "INVENTARIO" | "SERVICIO";

export function ProductosView() {
  const roles = useAuthStore((state) => state.roles);
  // Desactivar un producto es del DIRECTOR o de INVENTARIO.
  const puedeEliminar =
    roles.includes("DIRECTOR") || roles.includes("INVENTARIO");
  // El taller llega con su módulo (el 7).
  const puedeUsarTaller = false;

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("TODOS");
  const [soloBajo, setSoloBajo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [viendo, setViendo] = useState<Producto | null>(null);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [editandoPrecio, setEditandoPrecio] = useState<Producto | null>(null);
  const [usandoTaller, setUsandoTaller] = useState<Producto | null>(null);
  const [verAplicaciones, setVerAplicaciones] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState<Producto | null>(null);

  const { data, isLoading, isError, refetch } = useGetProductos({
    pagina: 1,
    limite: 100,
  });
  const precioMinimo = useActualizarMargenMinimo(editandoPrecio?.id ?? "");
  const eliminar = useDesactivarProducto();

  const todos = useMemo(() => data?.datos ?? [], [data]);

  /* Los que están en el piso. `bajoCritico` compara contra el umbral que se le
     pase; sin `stockMinimo` en el modelo, el piso es cero. */
  const conInventario = useMemo(
    () => todos.filter((p) => p.manejaInventario),
    [todos],
  );

  const servicios = useMemo(
    () => todos.filter((p) => !p.manejaInventario),
    [todos],
  );

  const productos = useMemo(() => {
    let items = todos;
    if (tipo === "INVENTARIO") items = items.filter((p) => p.manejaInventario);
    if (tipo === "SERVICIO") items = items.filter((p) => !p.manejaInventario);
    // Un servicio nunca está bajo: no pasa por el kardex.
    if (soloBajo) items = items.filter((p) => p.manejaInventario && bajoCritico(p));

    const termino = busqueda.trim().toLowerCase();
    if (termino) {
      items = items.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(termino) ||
          producto.codigo.toLowerCase().includes(termino),
      );
    }
    return items;
  }, [todos, busqueda, tipo, soloBajo]);

  const columnas = useMemo(
    () =>
      crearColumnasProductos({
        onVer: (producto) => setViendo(producto),
        onEditar: (producto) => setEditando(producto),
        onPrecioMinimo: (producto) => setEditandoPrecio(producto),
        onUsarTaller: (producto) => setUsandoTaller(producto),
        onVerAplicaciones: (producto) => setVerAplicaciones(producto),
        onEliminar: (producto) => setEliminando(producto),
        puedeEliminar,
        puedeUsarTaller,
      }),
    [puedeEliminar, puedeUsarTaller],
  );

  return (
    <div className="space-y-6">
      <PageHeader titulo="Inventario" />

      <DataTable
        columns={columnas}
        data={productos}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(producto) => setViendo(producto)}
        barra={
          <BarraListado
            filtros={[
              grupoUnico<FiltroTipo>({
                id: "tipo",
                titulo: "Tipo de producto",
                todos: "TODOS",
                valor: tipo,
                onChange: setTipo,
                opciones: [
                  {
                    valor: "INVENTARIO",
                    label: "Con inventario",
                    apunte: conInventario.length,
                  },
                  { valor: "SERVICIO", label: "Servicios", apunte: servicios.length },
                ],
              }),
              interruptor({
                id: "bajo",
                titulo: "Existencias",
                texto: "Solo inventario bajo",
                chip: "Inventario bajo",
                valor: soloBajo,
                onChange: setSoloBajo,
              }),
            ]}
            busqueda={{
              valor: busqueda,
              onChange: setBusqueda,
              placeholder: "Buscar por nombre o código…",
            }}
            accion={{
              label: "Nuevo producto",
              icon: Plus,
              onClick: () => setCreando(true),
            }}
          />
        }
        mensajeVacio="No hay productos con este filtro."
      />

      <FormDialog
        open={creando}
        onOpenChange={setCreando}
        titulo="Nuevo producto"
      >
        <ProductoFormView
          enModal
          onExito={() => setCreando(false)}
          onCerrar={() => setCreando(false)}
        />
      </FormDialog>

      <FormDialog
        open={editando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setEditando(null);
          }
        }}
        titulo="Editar producto"
      >
        {editando && (
          <ProductoFormView
            key={editando.id}
            productoId={editando.id}
            enModal
            onExito={() => setEditando(null)}
            onCerrar={() => setEditando(null)}
          />
        )}
      </FormDialog>

      <ProductoDetalleModal
        productoId={viendo?.id ?? null}
        open={viendo !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setViendo(null);
          }
        }}
      />

      <PrecioMinimoModal
        open={editandoPrecio !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setEditandoPrecio(null);
          }
        }}
        precioActual={Number(editandoPrecio?.margenMinimoPct ?? 0)}
        loading={precioMinimo.isPending}
        onConfirmar={(valor) => {
          if (!editandoPrecio) {
            return;
          }
          precioMinimo.mutate(valor, {
            onSuccess: () => setEditandoPrecio(null),
          });
        }}
      />

      <Modal
        open={eliminando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setEliminando(null);
          }
        }}
        titulo="Eliminar producto"
        descripcion={`¿Eliminar "${eliminando?.nombre ?? ""}"? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        confirmarDestructivo
        confirmarLoading={eliminar.isPending}
        onConfirmar={() => {
          if (!eliminando) {
            return;
          }
          eliminar.mutate(eliminando.id, {
            onSuccess: () => setEliminando(null),
          });
        }}
      />
    </div>
  );
}
