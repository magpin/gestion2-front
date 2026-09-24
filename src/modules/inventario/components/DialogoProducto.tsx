"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
import { aviso } from "@/lib/avisos";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { useState } from "react";
import { FormularioProducto, type DatosProducto } from "./FormularioProducto";
import { ImagenProducto } from "./ImagenProducto";
import { productosApi } from "../services/inventario.service";
import type { ProductoResumen } from "../types/inventario.types";

const ID_FORMULARIO = "formulario-producto";

/** `"nuevo"` para dar de alta; un producto para corregir su ficha. */
export type ProductoEnEdicion = "nuevo" | ProductoResumen | null;

/**
 * El alta y la corrección de un producto, en un modal que se abre desde donde
 * haga falta: el catálogo, o el selector de producto de una venta o una
 * compra.
 *
 * Al editar, las dos cuentas de venta llegan resueltas del plan de cuentas
 * —el producto guarda ids y los selectores trabajan con la cuenta completa—.
 * Es una consulta que ya está en caché: la misma que usa `SelectorCuenta`.
 */
export function DialogoProducto({
  editando,
  onCerrar,
  alGuardar,
  codigoSugerido,
}: {
  editando: ProductoEnEdicion;
  onCerrar: () => void;
  /** El producto recién guardado, para dejarlo seleccionado. */
  alGuardar?: (producto: ProductoResumen) => void;
  /** Lo que se venía buscando cuando no apareció: se precarga como código. */
  codigoSugerido?: string;
}) {
  const queryClient = useQueryClient();
  const creando = editando === "nuevo";
  const producto = creando || editando === null ? undefined : editando;

  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);
  const [cuentaCosto, setCuentaCosto] = useState<CuentaEmpresa | null>(null);
  const [cuentaIngreso, setCuentaIngreso] = useState<CuentaEmpresa | null>(
    null,
  );

  const { data: auxiliares = [] } = useQuery({
    queryKey: ["plan-cuentas", "auxiliares", undefined],
    queryFn: () => planCuentasApi.listar({ soloAuxiliares: "true" }),
    enabled: producto !== undefined,
    staleTime: 5 * 60_000,
  });
  const cuentaPorId = (id: string | null) =>
    id === null ? null : (auxiliares.find((c) => c.id === id) ?? null);

  const limpiar = () => {
    setCuenta(null);
    setCuentaCosto(null);
    setCuentaIngreso(null);
    onCerrar();
  };

  const guardar = useMutation({
    mutationFn: (
      d: DatosProducto & {
        cuentaCostoVentaId?: string;
        cuentaIngresoId?: string;
      },
    ) => {
      if (producto === undefined) {
        return productosApi.crear({
          codigo: d.codigo,
          nombre: d.nombre,
          unidadMedida: d.unidadMedida,
          ivaTarifa: d.ivaTarifa,
          cuentaInventarioId: d.cuentaInventarioId || undefined,
          cuentaCostoVentaId: d.cuentaCostoVentaId,
          cuentaIngresoId: d.cuentaIngresoId,
          categoriaId: d.categoriaId || undefined,
          codigoBarras: d.codigoBarras || undefined,
          precioVenta: d.precioVenta,
        });
      }
      return productosApi.editar(producto.id, {
        nombre: d.nombre,
        unidadMedida: d.unidadMedida,
        ivaTarifa: d.ivaTarifa,
        cuentaCostoVentaId: d.cuentaCostoVentaId,
        cuentaIngresoId: d.cuentaIngresoId,
        categoriaId: d.categoriaId || undefined,
        codigoBarras: d.codigoBarras || undefined,
      });
    },
    onSuccess: async (guardado) => {
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
      aviso.exito(creando ? "Producto registrado" : "Cambios guardados");
      alGuardar?.(guardado);
      limpiar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog
      open={editando !== null}
      onOpenChange={(abierto) => !abierto && limpiar()}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>
              {creando ? "Nuevo producto" : "Editar producto"}
            </DialogTitle>
            <DialogDescription>
              {creando
                ? "El precio de venta inicial va junto: un producto sin precio no tiene sentido."
                : "El código, la cuenta de inventario y el precio no se cambian acá — el precio tiene su propia pantalla."}
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-6">
          {/* Solo al corregir: la imagen se guarda contra el id del producto,
              y al dar de alta todavía no hay ninguno. */}
          {producto !== undefined && <ImagenProducto producto={producto} />}

          <FormularioProducto
            // Remontar por producto evita que los valores del anterior se
            // queden en el formulario al abrir otro.
            key={producto?.id ?? "nuevo"}
            id={ID_FORMULARIO}
            edicion={producto !== undefined}
            inicial={producto}
            cuenta={cuenta}
            onCuenta={setCuenta}
            cuentaCosto={
              cuentaCosto ??
              cuentaPorId(producto?.cuenta_costo_venta_id ?? null)
            }
            onCuentaCosto={setCuentaCosto}
            cuentaIngreso={
              cuentaIngreso ?? cuentaPorId(producto?.cuenta_ingreso_id ?? null)
            }
            onCuentaIngreso={setCuentaIngreso}
            codigoSugerido={creando ? codigoSugerido : undefined}
            alGuardar={(d) => guardar.mutate(d)}
          />
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-6"
            onClick={limpiar}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_FORMULARIO}
            className="h-12 rounded-xl px-6"
            disabled={guardar.isPending}
          >
            {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
            {creando ? "Guardar producto" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
