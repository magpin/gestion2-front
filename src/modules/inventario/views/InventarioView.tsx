"use client";

import { useState } from "react";
import {
  Archive,
  History,
  Package,
  PackageX,
  Plus,
  Settings2,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { DialogoProducto } from "../components/DialogoProducto";
import { ConfiguracionSeccion } from "./ConfiguracionSeccion";
import { FaltantesSeccion } from "./FaltantesSeccion";
import { KardexSeccion } from "./KardexSeccion";
import { PreciosSeccion } from "./PreciosSeccion";
import { ProductosSeccion } from "./ProductosSeccion";

type Seccion =
  "Productos" | "Precios" | "Kardex" | "Faltantes" | "Configuración";

const SECCIONES: Array<[Seccion, typeof Package]> = [
  ["Productos", Package],
  ["Precios", Tag],
  ["Kardex", History],
  ["Faltantes", PackageX],
  ["Configuración", Settings2],
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

  const [seccion, setSeccion] = useState<Seccion>("Productos");
  const [creando, setCreando] = useState(false);

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
      {seccion === "Precios" && <PreciosSeccion />}
      {seccion === "Kardex" && <KardexSeccion />}
      {seccion === "Faltantes" && <FaltantesSeccion />}
      {seccion === "Configuración" && <ConfiguracionSeccion />}

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
