"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Tag } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import {
  FormularioPrecio,
  type DatosPrecio,
} from "../components/FormularioPrecio";
import { precioApi } from "../services/inventario.service";
import type { ProductoResumen } from "../types/inventario.types";

const ID_FORMULARIO = "formulario-precio-bitacora";

/**
 * La bitácora de auditoría: todos los cambios de precio, de todos los
 * productos, juntos. Distinta del historial dentro del detalle de un
 * producto —que solo muestra el de ese producto— porque acá se responde
 * "qué ha pasado con los precios", no "qué pasó con este producto".
 */
export function PreciosSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("INVENTARIO", "DIRECTOR");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [producto, setProducto] = useState<ProductoResumen | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["productos", "precios-bitacora", desde, hasta],
    queryFn: () =>
      precioApi.listarTodos({
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  const cambiar = useMutation({
    mutationFn: (d: DatosPrecio) => precioApi.cambiar(producto!.id, d),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
      aviso.exito("Precio actualizado");
      setAbierto(false);
      setProducto(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const filas = resultado?.datos ?? [];

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-6">
        <div>
          <h2 className="text-2xl font-semibold">Bitácora de precios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial auditable de cambios de todos los productos.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Desde
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-11 rounded-xl px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Hasta
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="h-11 rounded-xl px-3"
            />
          </label>
          <Button
            type="button"
            disabled={!puedeOperar}
            onClick={() => {
              setProducto(null);
              setAbierto(true);
            }}
            className="h-11 rounded-2xl px-5 text-sm font-semibold"
          >
            Cambiar precio
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <Tag className="size-8 text-muted-foreground" />
          <p className="font-semibold">Todavía no hay cambios de precio</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Los cambios que registres, en cualquier producto, aparecen acá.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                {[
                  "Producto",
                  "Nuevo precio",
                  "Nota",
                  "Vigente desde",
                  "Estado",
                ].map((x) => (
                  <th key={x} scope="col" className="px-5 py-4">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="px-5 py-5 font-semibold">
                    {f.producto_codigo}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {f.producto_nombre}
                    </span>
                  </td>
                  <td className="px-5 py-5 font-mono font-semibold">
                    {formatCOP(Number(f.precio_venta))}
                  </td>
                  <td className="px-5 py-5 text-sm text-muted-foreground">
                    {f.nota || "—"}
                  </td>
                  <td className="px-5 py-5 text-sm">
                    {formatFecha(f.fecha_inicio)}
                  </td>
                  <td className="px-5 py-5 text-sm">
                    <span
                      className={
                        f.fecha_fin === null
                          ? "text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {f.fecha_fin === null ? "Vigente" : "Anterior"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Cambiar precio</DialogTitle>
              <DialogDescription>
                Elegí el producto y el precio nuevo. El anterior queda en el
                historial.
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioPrecio
              id={ID_FORMULARIO}
              producto={producto}
              onProducto={setProducto}
              alGuardar={(d) => cambiar.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO}
              className="h-12 rounded-xl px-6"
              disabled={cambiar.isPending || !producto}
            >
              {cambiar.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar precio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
