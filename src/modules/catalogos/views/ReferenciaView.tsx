"use client";

import { useState } from "react";
import { Briefcase, Library } from "lucide-react";

import { CiiuView } from "./CiiuView";
import { PucView } from "./PucView";

export type Catalogo = "PUC" | "Actividades CIIU";

const CATALOGOS: Array<[Catalogo, typeof Library]> = [
  ["PUC", Library],
  ["Actividades CIIU", Briefcase],
];

/**
 * Referencia: los catálogos de la norma que se consultan y no se editan. Van
 * juntos en una sola entrada del pie del menú porque se abren poco, pero cada
 * uno sigue siendo su propia pantalla.
 */
export function ReferenciaView({ inicial = "PUC" }: { inicial?: Catalogo }) {
  const [catalogo, setCatalogo] = useState<Catalogo>(inicial);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          <span className="size-2 rounded-full bg-brand" />
          Referencia
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Referencia<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Los catálogos de la norma: se consultan, ninguna empresa los edita.
        </p>
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {CATALOGOS.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={catalogo === nombre ? "page" : undefined}
            onClick={() => setCatalogo(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              catalogo === nombre
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {catalogo === "PUC" && <PucView />}
      {catalogo === "Actividades CIIU" && <CiiuView />}
    </div>
  );
}
