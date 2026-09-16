"use client";

import { useState } from "react";
import { FileMinus, FilePlus, ReceiptText } from "lucide-react";

import { FacturasCompraSeccion } from "./FacturasCompraSeccion";
import { NotasCompraSeccion } from "./NotasCompraSeccion";

type Seccion = "Facturas" | "Notas crédito" | "Notas débito";

const SECCIONES: Array<[Seccion, typeof ReceiptText]> = [
  ["Facturas", ReceiptText],
  ["Notas crédito", FileMinus],
  ["Notas débito", FilePlus],
];

/**
 * Compras: tres vistas del mismo documento —factura del proveedor, y las dos
 * notas con que él corrige—. Hasta el paso 10 era una sola lista sin
 * pestañas, porque toda fila de `compra_documento` era una factura.
 *
 * Se separan y no se mezclan en una lista con columna de tipo: la nota baja o
 * sube lo que se le debe al proveedor, y verlas revueltas con las facturas
 * rompe el "cuánto le debo" que esta pantalla responde de un vistazo. La
 * diferencia con ventas es de dónde sale el número: acá lo pone el proveedor,
 * en los tres documentos.
 */
export function ComprasView() {
  const [seccion, setSeccion] = useState<Seccion>("Facturas");

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          <span className="size-2 rounded-full bg-brand" />
          Compras
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Compras<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Registra la factura del proveedor — asienta y aumenta el kardex al
          guardar — y sus notas, que no tocan el kardex.
        </p>
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

      {seccion === "Facturas" && <FacturasCompraSeccion />}
      {seccion === "Notas crédito" && (
        <NotasCompraSeccion tipo="NOTA_CREDITO" />
      )}
      {seccion === "Notas débito" && <NotasCompraSeccion tipo="NOTA_DEBITO" />}
    </div>
  );
}
