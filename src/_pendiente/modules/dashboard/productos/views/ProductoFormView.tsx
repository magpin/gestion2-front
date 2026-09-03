"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { cn } from "@/lib/utils";
import { useGetProducto } from "../hooks/useProductos";
import { useCreateProducto, useUpdateProducto } from "../hooks/useProductoMutations";
import type { CrearProductoPayload } from "../types/productos.types";

interface Props {
  productoId?: string;
  enModal?: boolean;
  onExito?: (id: string) => void;
  onCerrar?: () => void;
}

interface FormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  precioVenta: number;
  margenMinimoPct: number | null;
  porcentajeIva: number | null;
  manejaInventario: boolean;
}

/**
 * Alta y edición de un producto.
 *
 * Siete campos. Salieron del modelo, y cada ausencia tiene su razón:
 *
 *     producto sino por CONCEPTO y por empresa (`empresa_cuenta`). Un catálogo
 *     de 500 productos no necesita 1.000 cuentas: necesita una.
 *     es la receta para que el stock y sus movimientos se contradigan.
 *   · `ultimoCostoCompra` — lo escribe la compra, en `ultimoCostoCompra`. Nadie lo
 *     digita: es el piso del precio y tiene que ser un hecho, no una opinión.
 */
export function ProductoFormView({ productoId, enModal, onExito, onCerrar }: Props) {
  const router = useRouter();
  const esEdicion = Boolean(productoId);
  const cancelar = () => (enModal ? onCerrar?.() : router.back());
  const { data: producto, isLoading: cargando } = useGetProducto(productoId ?? "");

  const crear = useCreateProducto();
  const actualizar = useUpdateProducto(productoId ?? "");
  const mutacion = esEdicion ? actualizar : crear;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      codigo: "",
      nombre: "",
      descripcion: "",
      precioVenta: 0,
      margenMinimoPct: null,
      porcentajeIva: 19,
      manejaInventario: true,
    },
  });

  useEffect(() => {
    if (!producto) return;
    reset({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      precioVenta: Number(producto.precioVenta),
      margenMinimoPct: producto.margenMinimoPct ? Number(producto.margenMinimoPct) : null,
      porcentajeIva: producto.porcentajeIva ? Number(producto.porcentajeIva) : null,
      manejaInventario: producto.manejaInventario,
    });
  }, [producto, reset]);

  const enviar = handleSubmit((datos) => {
    const carga: CrearProductoPayload = {
      codigo: datos.codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion || undefined,
      precioVenta: Number(datos.precioVenta) || 0,
      margenMinimoPct: datos.margenMinimoPct ?? undefined,
      porcentajeIva: datos.porcentajeIva ?? undefined,
      manejaInventario: datos.manejaInventario,
    };
    mutacion.mutate(carga, {
      onSuccess: (guardado) => {
        if (onExito) onExito(guardado.id);
        else router.push("/dashboard/productos");
      },
    });
  });

  if (esEdicion && cargando) return <SkeletonCard />;

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Card className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Código" error={errors.codigo?.message}>
            <Input
              {...register("codigo", { required: "El código es obligatorio" })}
              // El código identifica al producto y hay documentos apuntando.
              disabled={esEdicion}
              className={cn(errors.codigo && "border-destructive")}
            />
          </Campo>
          <Campo label="Nombre" error={errors.nombre?.message}>
            <Input
              {...register("nombre", { required: "El nombre es obligatorio" })}
              className={cn(errors.nombre && "border-destructive")}
            />
          </Campo>
        </div>

        <Campo label="Descripción">
          <Input {...register("descripcion")} />
        </Campo>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h3 className="text-sm font-semibold">Precio</h3>
          <p className="text-muted-foreground text-xs">
            El costo no se digita: lo escribe la compra. Este precio es sugerido — la línea
            de venta puede cambiarlo, y si baja del piso, el DIRECTOR lo autoriza.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Precio de venta">
            <Input type="number" step="0.01" {...register("precioVenta", { valueAsNumber: true })} />
          </Campo>
          <Campo label="Margen mínimo %">
            <Input
              type="number"
              step="0.01"
              placeholder="Hereda el de la empresa"
              {...register("margenMinimoPct", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
            />
          </Campo>
          <Campo label="IVA %">
            <Input
              type="number"
              step="0.01"
              {...register("porcentajeIva", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
            />
          </Campo>
        </div>

        <Controller
          name="manejaInventario"
          control={control}
          render={({ field }) => (
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-medium">Maneja inventario</span>
                <span className="text-muted-foreground block text-xs">
                  Si se apaga, no pasa por el kardex. Es lo que corresponde a un servicio.
                </span>
              </span>
            </label>
          )}
        />
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={cancelar}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={mutacion.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {mutacion.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
