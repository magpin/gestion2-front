"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, History, Loader2, Package, Plus, Settings2, Tag } from "lucide-react";

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
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { FormularioProducto, type DatosProducto } from "../components/FormularioProducto";
import { productosApi } from "../services/inventario.service";
import { ConfiguracionSeccion } from "./ConfiguracionSeccion";
import { KardexSeccion } from "./KardexSeccion";
import { PreciosSeccion } from "./PreciosSeccion";
import { ProductosSeccion } from "./ProductosSeccion";

type Seccion = "Productos" | "Precios" | "Kardex" | "Configuración";

const SECCIONES: Array<[Seccion, typeof Package]> = [
  ["Productos", Package],
  ["Precios", Tag],
  ["Kardex", History],
  ["Configuración", Settings2],
];

const ID_FORMULARIO = "formulario-nuevo-producto";

/**
 * Productos e inventario — módulo #3 de `docs/decisiones/secuencia-modulos.md`.
 *
 * Cuatro pestañas en una sola ruta, mismo criterio que `ContabilidadView`:
 * son cuatro vistas del mismo catálogo, y quien lleva la bodega salta entre
 * ellas todo el día. El botón "Nuevo producto" vive en el encabezado y no
 * dentro de la pestaña Productos: es la acción de la pantalla entera.
 */
export function InventarioView() {
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("INVENTARIO", "DIRECTOR");

  const [seccion, setSeccion] = useState<Seccion>("Productos");
  const [creando, setCreando] = useState(false);
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);
  const [cuentaCosto, setCuentaCosto] = useState<CuentaEmpresa | null>(null);
  const [cuentaIngreso, setCuentaIngreso] = useState<CuentaEmpresa | null>(null);

  const crear = useMutation({
    mutationFn: (
      d: DatosProducto & { cuentaCostoVentaId?: string; cuentaIngresoId?: string },
    ) =>
      productosApi.crear({
        codigo: d.codigo,
        nombre: d.nombre,
        unidadMedida: d.unidadMedida,
        ivaTarifa: d.ivaTarifa,
        cuentaInventarioId: d.cuentaInventarioId,
        cuentaCostoVentaId: d.cuentaCostoVentaId,
        cuentaIngresoId: d.cuentaIngresoId,
        precioVenta: d.precioVenta,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
      aviso.exito("Producto registrado");
      setCreando(false);
      setCuenta(null);
      setCuentaCosto(null);
      setCuentaIngreso(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Inventario / Catálogo
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Inventario<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Controla existencias, costos y precios de venta en un solo lugar.
          </p>
        </div>

        <Button
          onClick={() => setCreando(true)}
          disabled={!puedeCrear}
          className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
            <Plus className="size-4" />
          </span>
          Nuevo producto
        </Button>
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Productos" && <ProductosSeccion />}
      {seccion === "Precios" && <PreciosSeccion />}
      {seccion === "Kardex" && <KardexSeccion />}
      {seccion === "Configuración" && <ConfiguracionSeccion />}

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
        <Archive className="size-3.5 text-success" />
        Los productos no se eliminan: se desactivan para conservar su trazabilidad.
      </p>

      <Dialog open={creando} onOpenChange={(a) => !a && setCreando(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Nuevo producto</DialogTitle>
              <DialogDescription>El precio de venta inicial va junto: un producto sin precio no tiene sentido.</DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioProducto
              id={ID_FORMULARIO}
              cuenta={cuenta}
              onCuenta={setCuenta}
              cuentaCosto={cuentaCosto}
              onCuentaCosto={setCuentaCosto}
              cuentaIngreso={cuentaIngreso}
              onCuentaIngreso={setCuentaIngreso}
              alGuardar={(d) => crear.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => {
                setCreando(false);
                setCuenta(null);
                setCuentaCosto(null);
                setCuentaIngreso(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORMULARIO} className="h-12 rounded-xl px-6" disabled={crear.isPending}>
              {crear.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
