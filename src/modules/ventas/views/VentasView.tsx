"use client";

import { useState } from "react";
import { FileMinus, FileText, ReceiptText } from "lucide-react";

import { CotizacionesSeccion } from "./CotizacionesSeccion";
import { FacturasSeccion } from "./FacturasSeccion";
import { NotasCreditoSeccion } from "./NotasCreditoSeccion";

type Seccion = "Cotizaciones" | "Facturas" | "Notas crédito";

const SECCIONES: Array<[Seccion, typeof FileText]> = [
  ["Cotizaciones", FileText],
  ["Facturas", ReceiptText],
  ["Notas crédito", FileMinus],
];

/**
 * Ventas: tres vistas del mismo documento —cabecera y líneas de
 * producto/cantidad—, no tres pantallas separadas. Una cotización no
 * asienta ni mueve inventario; una factura sí, de un solo golpe; una nota
 * crédito reversa una factura completa. El precio de cada línea siempre es
 * el de lista vigente del producto: acá no se negocia por documento.
 */
export function VentasView() {
  const [seccion, setSeccion] = useState<Seccion>("Cotizaciones");

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
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
      </header>

      <nav className="mb-7 flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
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

      {seccion === "Cotizaciones" && <CotizacionesSeccion />}
      {seccion === "Facturas" && <FacturasSeccion />}
      {seccion === "Notas crédito" && <NotasCreditoSeccion />}
    </div>
  );
}
