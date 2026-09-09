"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Package, Search } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCOP, formatFecha } from "@/lib/utils";
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { FormularioPrecio, type DatosPrecio } from "../components/FormularioPrecio";
import { kardexApi, precioApi, productosApi } from "../services/inventario.service";
import { NOMBRE_MOVIMIENTO, NOMBRE_UNIDAD } from "../types/inventario.types";
import type { ProductoResumen } from "../types/inventario.types";

const CLAVE = ["productos"];
type Estado = "Todos" | "Activo" | "Inactivo";
type Modal = "detalle" | "precio" | "toggle" | null;
const ID_FORMULARIO_PRECIO = "formulario-precio-producto";

/**
 * El catálogo. Nada de "editar" acá: la única forma de cambiar algo después
 * de creado un producto es su precio (`FormularioPrecio`, propia fila
 * histórica) o su estado (activar/desactivar). El código y la cuenta de
 * inventario no se tocan — cambiar la cuenta dejaría el kardex viejo
 * apuntando a una cuenta que el producto ya no dice usar.
 */
export function ProductosSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("INVENTARIO", "DIRECTOR");

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<Estado>("Todos");
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<ProductoResumen | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const hayFiltro = busqueda.trim() !== "" || estado !== "Todos";
  const limpiar = () => {
    setBusqueda("");
    setEstado("Todos");
    setPagina(1);
  };

  const { data: resultado, isLoading } = useQuery({
    queryKey: [...CLAVE, busqueda, estado, pagina],
    queryFn: () =>
      productosApi.listar({
        q: busqueda.trim() || undefined,
        incluirInactivos: estado !== "Activo",
        soloInactivos: estado === "Inactivo",
        pagina,
      }),
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: CLAVE });

  const cambiarPrecio = useMutation({
    mutationFn: (d: DatosPrecio) => precioApi.cambiar(seleccionado!.id, d),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Precio actualizado");
      setModal(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const desactivar = useMutation({
    mutationFn: (id: string) => productosApi.desactivar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Producto desactivado");
      setModal(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });
  const activar = useMutation({
    mutationFn: (id: string) => productosApi.activar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Producto reactivado");
      setModal(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const productos = resultado?.datos ?? [];

  return (
    <>
      <section className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <InputGroup className="h-auto min-h-12 rounded-2xl border-border bg-card px-2 shadow-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por código o nombre"
            aria-label="Buscar producto"
            className="h-auto text-sm"
          />
        </InputGroup>

        <Select
          value={estado}
          onValueChange={(v) => {
            setEstado(v as Estado);
            setPagina(1);
          }}
        >
          <SelectTrigger aria-label="Estado" className="min-h-12 min-w-[145px] rounded-2xl border-border bg-card px-4 shadow-sm">
            <span className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Estado</span>
              <SelectValue className="text-sm font-semibold" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {(["Todos", "Activo", "Inactivo"] as const).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={limpiar} className="h-auto min-h-12 rounded-2xl px-4 text-muted-foreground">
          Limpiar
        </Button>
      </section>

      <div className="mb-3 px-1">
        <p className="text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">{productos.length}</strong> de {resultado?.total ?? 0} productos
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : productos.length === 0 ? (
        <Vacio hayFiltro={hayFiltro} />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Producto", "Unidad", "IVA", "Estado", "Acciones"].map((x) => (
                    <th key={x} scope="col" className={`px-5 py-4 ${x === "Acciones" ? "text-right" : ""}`}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productos.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/40">
                    <td className={`px-5 py-5 ${p.activo ? "" : "opacity-60"}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSeleccionado(p);
                          setModal("detalle");
                        }}
                        className="text-left"
                      >
                        <span className="block text-sm font-semibold hover:text-brand-text">{p.nombre}</span>
                        <span className="mt-1 block font-mono text-xs text-muted-foreground">{p.codigo}</span>
                      </button>
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">{NOMBRE_UNIDAD[p.unidad_medida]}</td>
                    <td className="px-5 py-5">
                      <span className="rounded-full border border-border px-3 py-1.5 text-xs">{p.iva_tarifa}%</span>
                    </td>
                    <td className="px-5 py-5">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                        <span className={`size-2 rounded-full ${p.activo ? "bg-success" : "bg-muted-foreground"}`} />
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones de ${p.nombre}`}
                        disabled={!puedeOperar}
                        onClick={() => {
                          setSeleccionado(p);
                          setModal("toggle");
                        }}
                        className="rounded-xl text-muted-foreground hover:bg-danger/10 hover:text-danger"
                      >
                        <MoreHorizontal />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Detalle: datos generales, historial de precio y kardex reciente. */}
      <Dialog open={modal === "detalle"} onOpenChange={(a) => !a && setModal(null)}>
        <DialogContent size="lg">
          {seleccionado && (
            <DetalleProducto
              producto={seleccionado}
              puedeOperar={puedeOperar}
              onCambiarPrecio={() => setModal("precio")}
              onCerrar={() => setModal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cambiar precio, con el producto ya fijo. */}
      <Dialog open={modal === "precio"} onOpenChange={(a) => !a && setModal(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Cambiar precio</DialogTitle>
              <DialogDescription>
                Cierra el precio vigente y abre uno nuevo — el anterior queda en el historial.
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioPrecio
              id={ID_FORMULARIO_PRECIO}
              producto={seleccionado}
              alGuardar={(d) => cambiarPrecio.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO_PRECIO}
              className="h-12 rounded-xl px-6"
              disabled={cambiarPrecio.isPending}
            >
              {cambiarPrecio.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar precio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={modal === "toggle"} onOpenChange={(a) => !a && setModal(null)}>
        <AlertDialogContent className="gap-6 p-6 sm:max-w-md!">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning/10 text-warning">
              <Package />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-lg">
              {seleccionado?.activo ? "¿Desactivar este producto?" : "¿Activar este producto?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              {seleccionado?.activo
                ? "El producto deja de aparecer en nuevas operaciones, pero conserva todo su kardex."
                : "El producto vuelve a estar disponible para operaciones."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-6 -mb-6 p-6">
            <AlertDialogCancel className="h-11 rounded-xl px-6">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl px-6"
              disabled={desactivar.isPending || activar.isPending}
              onClick={() => {
                if (!seleccionado) return;
                if (seleccionado.activo) desactivar.mutate(seleccionado.id);
                else activar.mutate(seleccionado.id);
              }}
            >
              {(desactivar.isPending || activar.isPending) && <Loader2 className="size-4 animate-spin" />}
              {seleccionado?.activo ? "Desactivar" : "Activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetalleProducto({
  producto,
  puedeOperar,
  onCambiarPrecio,
  onCerrar,
}: {
  producto: ProductoResumen;
  puedeOperar: boolean;
  onCambiarPrecio: () => void;
  onCerrar: () => void;
}) {
  const { data: precios = [] } = useQuery({
    queryKey: ["productos", "precios", producto.id],
    queryFn: () => precioApi.historialDe(producto.id),
  });
  const { data: movimientos } = useQuery({
    queryKey: ["productos", "movimientos", producto.id, 1],
    queryFn: () => kardexApi.listar(producto.id, 1),
  });

  const vigente = precios.find((p) => p.fecha_fin === null) ?? precios[0] ?? null;
  const ultimo = movimientos?.datos[0] ?? null;

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>
            {producto.codigo} · {producto.nombre}
          </DialogTitle>
          <DialogDescription>{NOMBRE_UNIDAD[producto.unidad_medida]} · {producto.iva_tarifa}% de IVA</DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted p-4">
            <span className="text-xs text-muted-foreground">Existencias</span>
            <b className="mt-2 block font-mono text-2xl">{ultimo?.saldo_cantidad ?? "0"}</b>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <span className="text-xs text-muted-foreground">Costo promedio</span>
            <b className="mt-2 block font-mono text-xl">{formatCOP(Number(ultimo?.saldo_costo_promedio ?? 0))}</b>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <span className="text-xs text-muted-foreground">Precio vigente</span>
            <b className="mt-2 block font-mono text-xl">{formatCOP(Number(vigente?.precio_venta ?? 0))}</b>
          </div>
        </div>

        <section className="rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold">Historial de precio</h3>
            <Button
              type="button"
              disabled={!puedeOperar}
              onClick={onCambiarPrecio}
              className="h-10 rounded-xl px-4 text-sm"
            >
              Cambiar precio
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-sm">
            {precios.length === 0 ? (
              <p className="text-muted-foreground">Todavía no hay historial.</p>
            ) : (
              precios.slice(0, 5).map((p) => (
                <div key={p.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                  <span className="font-mono font-semibold">{formatCOP(Number(p.precio_venta))}</span>
                  <span className="text-muted-foreground">{formatFecha(p.fecha_inicio)}</span>
                  <span className={p.fecha_fin === null ? "text-success" : "text-muted-foreground"}>
                    {p.fecha_fin === null ? "Vigente" : "Anterior"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border p-5">
          <h3 className="font-semibold">Kardex reciente</h3>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
            {!movimientos || movimientos.datos.length === 0 ? (
              <p>Todavía no tiene movimientos.</p>
            ) : (
              movimientos.datos.slice(0, 5).map((m) => (
                <p key={m.id}>
                  {formatFecha(m.fecha)} · {NOMBRE_MOVIMIENTO[m.tipo]} · <b className="font-mono text-foreground">{m.cantidad} unidades</b>
                </p>
              ))
            )}
          </div>
        </section>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
          Cerrar
        </Button>
      </DialogFooter>
    </>
  );
}

function Vacio({ hayFiltro }: { hayFiltro: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Package className="size-6" />
      </span>
      <p className="text-lg font-semibold">{hayFiltro ? "Ningún producto coincide" : "Todavía no hay productos"}</p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        {hayFiltro ? "Probá con otro texto, o quitá los filtros." : "Creá el primero con el botón «Nuevo producto» de arriba."}
      </p>
    </div>
  );
}
