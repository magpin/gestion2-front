"use client";

import { useTieneRol } from "@/core/store/authStore";
import { VentasAnterioresSeccion } from "./VentasAnterioresSeccion";

/**
 * Configurar empresa → Datos anteriores: las facturas de venta del sistema
 * anterior, leídas por María, para armar la cartera de arranque.
 *
 * Antes era una pestaña de Ventas. Se hace una vez, al empezar, y no es parte
 * de vender: por eso salió del recorrido de todos los días. La hacen los mismos
 * que cargan el histórico por Excel.
 */
export function DatosAnterioresView() {
  const puedeCargar = useTieneRol("DIRECTOR", "CONTADOR");

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          <span className="size-2 rounded-full bg-brand" />
          Configurar empresa
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Datos anteriores<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Las ventas del sistema anterior que todavía te deben: María las lee y vos las cargás.
        </p>
      </header>

      {puedeCargar ? (
        <VentasAnterioresSeccion />
      ) : (
        <p className="text-sm text-muted-foreground">
          Cargar datos anteriores lo hace la dirección o el contador de la empresa.
        </p>
      )}
    </div>
  );
}
