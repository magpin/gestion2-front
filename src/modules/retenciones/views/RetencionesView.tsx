"use client";

import { RetencionesSeccion } from "./RetencionesSeccion";

/**
 * Contabilidad → Retenciones, entrada propia del menú. Es la misma sección que
 * antes vivía como pestaña del Libro: renta, IVA e ICA tienen su propio tema
 * —tarifas de la ley, perfiles de terceros, recálculo— y no son parte de
 * registrar asientos.
 */
export function RetencionesView() {
  return (
    <div className="w-full">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          <span className="size-2 rounded-full bg-brand" />
          Contabilidad
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Retenciones<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lo que practica y lo que le practican: tarifas de la ley, perfiles de terceros y cambios de norma.
        </p>
      </header>

      <RetencionesSeccion />
    </div>
  );
}
