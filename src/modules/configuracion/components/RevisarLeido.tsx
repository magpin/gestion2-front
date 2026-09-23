"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** Un dato para revisar: lo que leyó María, y si la lectura fue segura. */
export interface DatoARevisar {
  campo: string;
  etiqueta: string;
  /** Lo leído, como texto. Una lista va separada por comas. */
  valor: string;
  /** Lectura dudosa, o algo que no se pudo guardar: se resalta. */
  dudoso: boolean;
  /** Por qué no se guardó la vez anterior, si ya se intentó. */
  motivo?: string;
  /** Dónde se leyó: «RUT · casilla 53». */
  fuente?: string;
}

/**
 * Lo que María leyó, **editable** y con la decisión en manos de la persona.
 *
 * Cada dato viene con el valor leído ya puesto. Se puede corregir, y cada uno
 * tiene su casilla de «guardar»: lo dudoso también viene marcado —se toma como
 * se leyó—, pero va resaltado para que se mire, y la persona decide si va o no.
 * Lo que cambió se manda como corrección: queda escrito qué dijo el papel y qué
 * decidió ella.
 */
export function RevisarLeido({
  datos,
  guardando,
  etiquetaBoton = "Guardar",
  alGuardar,
}: {
  datos: DatoARevisar[];
  guardando: boolean;
  etiquetaBoton?: string;
  alGuardar: (campos: string[], correcciones: Record<string, string>) => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(datos.map((d) => [d.campo, d.valor])),
  );
  const [elegidos, setElegidos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(datos.map((d) => [d.campo, true])),
  );

  const guardar = () => {
    const campos = datos.filter((d) => elegidos[d.campo]).map((d) => d.campo);
    const correcciones = Object.fromEntries(
      datos
        .filter((d) => elegidos[d.campo] && (valores[d.campo] ?? "").trim() !== d.valor.trim())
        .map((d) => [d.campo, (valores[d.campo] ?? "").trim()]),
    );
    alGuardar(campos, correcciones);
  };

  const cuantos = datos.filter((d) => elegidos[d.campo]).length;

  return (
    <div className="flex w-full max-w-[680px] flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {datos.map((d) => (
          <li
            key={d.campo}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg px-3 py-2.5",
              d.dudoso ? "border border-warning/40 bg-warning/10" : "border border-transparent",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`leido-${d.campo}`} className="text-[13px] font-medium">
                {d.etiqueta}
                {d.fuente !== undefined && (
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                    {d.fuente}
                  </span>
                )}
              </label>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={elegidos[d.campo] ?? false}
                  onChange={(e) => setElegidos((p) => ({ ...p, [d.campo]: e.target.checked }))}
                  className="size-4 accent-foreground"
                />
                Guardar
              </label>
            </div>
            <input
              id={`leido-${d.campo}`}
              value={valores[d.campo] ?? ""}
              onChange={(e) => setValores((p) => ({ ...p, [d.campo]: e.target.value }))}
              disabled={!elegidos[d.campo]}
              className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[13px] outline-none focus:border-foreground disabled:opacity-50"
            />
            {(d.dudoso || d.motivo !== undefined) && (
              <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                {d.motivo ?? "No lo leí con seguridad: revisalo antes de guardarlo."}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={guardando || cuantos === 0}
          onClick={guardar}
          className="inline-flex h-10 items-center gap-2 rounded-[0.6rem] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {guardando && <Loader2 className="size-4 animate-spin" />}
          {etiquetaBoton} {cuantos === datos.length ? "" : `(${cuantos} de ${datos.length})`}
        </button>
        <span className="text-xs text-muted-foreground">
          Lo que desmarques no se guarda. Lo que falte al final lo completás en su paso.
        </span>
      </div>
    </div>
  );
}
