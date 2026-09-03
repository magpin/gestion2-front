"use client";

import type { ReactNode } from "react";

interface Props {
  titulo: string;
  /** Una línea que dice qué se resuelve acá. Va bajo el título, en gris. */
  descripcion?: string;
  /** Marca el bloque cuando el paso está esperando ese dato. */
  pendiente?: boolean;
  /** Algo que va a la derecha del título: un contador, un botón chico. */
  accion?: ReactNode;
  children: ReactNode;
}

/**
 * Un bloque dentro de un paso.
 *
 * Un paso puede resolver más de una cosa —situación legal resuelve tres— y sin
 * separación visible se lee como un formulario largo de quince campos. El
 * encabezado en versalitas y la línea superior son lo que convierte esa pared en
 * partes que se pueden atender de a una.
 *
 * El punto de pendiente va en ámbar y es un elemento gráfico, no texto: el color
 * semántico nunca se pone en tipografía pequeña.
 */
export function Bloque({
  titulo,
  descripcion,
  pendiente,
  accion,
  children,
}: Props) {
  return (
    <section className="flex min-w-0 flex-col gap-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {titulo}
            {pendiente && <span className="size-1.5 rounded-full bg-warning" />}
          </h2>
          {descripcion && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {descripcion}
            </p>
          )}
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </header>

      {children}
    </section>
  );
}

/**
 * Una lista de lo que ya está registrado: etiqueta a la izquierda, dato a la
 * derecha, separadas por una línea.
 *
 * Es la forma en que se lee un resumen —el ojo baja por la columna de etiquetas
 * y salta a la derecha solo donde le interesa— y evita la tarjeta con borde por
 * cada fila, que en cinco filas son cinco bordes compitiendo entre sí.
 */
export function Registradas({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {children}
    </ul>
  );
}

export function Registrada({
  etiqueta,
  mono,
  children,
  accion,
}: {
  /** El papel de la fila: "Principal", "Secundaria", el tipo de documento. */
  etiqueta?: string;
  /** true cuando la etiqueta es un número —un código— y no una palabra. */
  mono?: boolean;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 py-3 text-sm">
      {etiqueta &&
        (mono ? (
          <span className="w-8 shrink-0 pt-0.5 text-right font-mono text-xs text-muted-foreground">
            {etiqueta}
          </span>
        ) : (
          <span className="w-24 shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {etiqueta}
          </span>
        ))}
      <span className="min-w-0 flex-1 overflow-hidden">{children}</span>
      {accion && <span className="shrink-0 pt-0.5">{accion}</span>}
    </li>
  );
}
