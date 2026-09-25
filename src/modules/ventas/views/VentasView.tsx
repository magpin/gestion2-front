"use client";

import { useState } from "react";
import {
  FileMinus,
  FilePlus,
  FileText,
  History,
  ReceiptText,
  ScanLine,
} from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { useTieneRol } from "@/core/store/authStore";
import { CotizacionesSeccion } from "./CotizacionesSeccion";
import { FacturasSeccion } from "./FacturasSeccion";
import { NotasCreditoSeccion } from "./NotasCreditoSeccion";
import { NotasDebitoSeccion } from "./NotasDebitoSeccion";
import { PedidosSeccion } from "./PedidosSeccion";
import { VentasAnterioresSeccion } from "./VentasAnterioresSeccion";

export type Seccion =
  | "Cotizaciones"
  | "Facturas"
  | "Notas crédito"
  | "Notas débito"
  | "Pedidos leídos"
  | "Ventas anteriores";

const SECCIONES: Array<[Seccion, typeof FileText]> = [
  ["Cotizaciones", FileText],
  ["Facturas", ReceiptText],
  ["Notas crédito", FileMinus],
  ["Notas débito", FilePlus],
  ["Pedidos leídos", ScanLine],
  ["Ventas anteriores", History],
];

/** Qué crea el botón de la cabecera en cada pestaña. Pedidos leídos no tiene: se sube el archivo. */
const ETIQUETA_NUEVO: Partial<Record<Seccion, string>> = {
  Cotizaciones: "Nueva cotización",
  Facturas: "Nueva factura",
  "Notas crédito": "Nueva nota crédito",
  "Notas débito": "Nueva nota débito",
};

/**
 * Ventas: cuatro vistas del mismo documento —cabecera y líneas de
 * producto/cantidad—, no cuatro pantallas separadas. Una cotización no
 * asienta ni mueve inventario; una factura sí, de un solo golpe; una nota
 * crédito reversa una factura —entera o por línea— y una nota débito le
 * cobra de más sobre una que ya existe. El precio de cada línea es el de
 * lista vigente del producto; la excepción es la nota débito, donde lo que
 * se cobra es un importe nuevo y se digita.
 */
export function VentasView({ inicial = "Cotizaciones" }: { inicial?: Seccion } = {}) {
  const [seccion, setSeccion] = useState<Seccion>(inicial);
  // El estado de "estoy creando" vive acá y no en cada sección: el botón está
  // en la cabecera, arriba de las pestañas, y desde ahí no alcanzaría.
  const [creando, setCreando] = useState(false);
  const puedeCrear = useTieneRol("VENTAS", "DIRECTOR");
  // Cargar las ventas del sistema anterior es armar la cartera de arranque:
  // lo hacen los mismos que cargan el histórico por Excel.
  const puedeCargarAnteriores = useTieneRol("DIRECTOR", "CONTADOR");
  const cerrarCreacion = () => setCreando(false);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Ventas
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Ventas<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cotiza, factura y corrige — todo contra el catálogo y los precios
            vigentes.
          </p>
        </div>

        {puedeCrear && ETIQUETA_NUEVO[seccion] !== undefined && (
          <BotonNuevo
            etiqueta={ETIQUETA_NUEVO[seccion]!}
            onClick={() => setCreando(true)}
          />
        )}
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.filter(
          ([nombre]) => nombre !== "Ventas anteriores" || puedeCargarAnteriores,
        ).map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => {
              setSeccion(nombre);
              setCreando(false);
            }}
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

      {seccion === "Cotizaciones" && (
        <CotizacionesSeccion
          creando={creando}
          onCerrarCreacion={cerrarCreacion}
        />
      )}
      {seccion === "Facturas" && (
        <FacturasSeccion creando={creando} onCerrarCreacion={cerrarCreacion} />
      )}
      {seccion === "Notas crédito" && (
        <NotasCreditoSeccion
          creando={creando}
          onCerrarCreacion={cerrarCreacion}
        />
      )}
      {seccion === "Notas débito" && (
        <NotasDebitoSeccion
          creando={creando}
          onCerrarCreacion={cerrarCreacion}
        />
      )}
      {seccion === "Pedidos leídos" && <PedidosSeccion />}
      {seccion === "Ventas anteriores" && puedeCargarAnteriores && (
        <VentasAnterioresSeccion />
      )}
    </div>
  );
}
