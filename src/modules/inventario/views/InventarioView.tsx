"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  History,
  Package,
  PackageX,
  Plus,
  Tag,
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { configuracionApi } from "../services/inventario.service";
import { DialogoProducto } from "../components/DialogoProducto";
import { FaltantesSeccion } from "./FaltantesSeccion";
import { KardexSeccion } from "./KardexSeccion";
import { PreciosSeccion } from "./PreciosSeccion";
import { CategoriasSeccion } from "./CategoriasSeccion";
import { ProductosSeccion } from "./ProductosSeccion";

type Seccion =
  | "Productos"
  | "Categorías"
  | "Precios"
  | "Kardex"
  | "Faltantes";

const SECCIONES: Array<[Seccion, typeof Package]> = [
  ["Productos", Package],
  ["Categorías", Tags],
  ["Precios", Tag],
  ["Kardex", History],
  ["Faltantes", PackageX],
];

/**
 * Productos e inventario — módulo #3 de `docs/decisiones/secuencia-modulos.md`.
 *
 * Cuatro pestañas en una sola ruta, mismo criterio que `ContabilidadView`:
 * son cuatro vistas del mismo catálogo, y quien lleva la bodega salta entre
 * ellas todo el día. El botón "Nuevo producto" vive en el encabezado y no
 * dentro de la pestaña Productos: es la acción de la pantalla entera.
 */
export function InventarioView() {
  const puedeCrear = useTieneRol("INVENTARIO", "DIRECTOR");
  const puedePreparar = useTieneRol("CONTADOR", "DIRECTOR", "ADMIN_TENANT");
  const queryClient = useQueryClient();

  // Deja inventario listo para operar: crea las cuentas automáticas que
  // falten (inventario, ingreso, costo, sobrante y faltantes) y las asigna.
  // Lo mismo corre al crear el plan de cuentas; acá llega también a las
  // empresas que ya lo tenían. Idempotente, pero basta una vez por visita.
  const preparado = useRef(false);
  const preparar = useMutation({
    mutationFn: configuracionApi.preparar,
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ["inventario", "configuracion"] });
      if (r.cuentasCreadas.length > 0) {
        aviso.exito(`Inventario listo para operar. Se creó: ${r.cuentasCreadas.join(", ")}`);
      }
    },
  });
  useEffect(() => {
    if (!puedePreparar || preparado.current) return;
    preparado.current = true;
    preparar.mutate();
  }, [puedePreparar, preparar]);

  const [seccion, setSeccion] = useState<Seccion>("Productos");
  const [creando, setCreando] = useState(false);

  return (
    <div className="w-full">
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
          className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-primary/90"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-foreground/15">
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
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Productos" && <ProductosSeccion />}
      {seccion === "Categorías" && <CategoriasSeccion />}
      {seccion === "Precios" && <PreciosSeccion />}
      {seccion === "Kardex" && <KardexSeccion />}
      {seccion === "Faltantes" && <FaltantesSeccion />}

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
        <Archive className="size-3.5 text-success" />
        Los productos no se eliminan: se desactivan para conservar su
        trazabilidad.
      </p>

      <DialogoProducto
        editando={creando ? "nuevo" : null}
        onCerrar={() => setCreando(false)}
      />
    </div>
  );
}
