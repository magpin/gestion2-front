"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NodoProcesoProps {
  /** El trabajo que falta, no el estado del documento: «Facturar», no «Facturada». */
  label: string;
  /** Lo que va dentro del círculo: la cifra del nodo, o un icono si es una puerta. */
  indicador: ReactNode;
  /** Líneas de apoyo: las subbandejas con su conteo, o qué se hace acá. */
  descripciones?: string[];
  /**
   * Lo frenado dentro de este nodo. Es un SUBCONJUNTO de su cifra, no un
   * sumando: se comunica como «7, de ellas 2 sin firma».
   */
  alarma?: string;
  /** Hay carga acá: el nodo se pinta encendido aunque no se pueda operar. */
  activo: boolean;
  /** Ausente ⇒ el nodo se ve pero no se opera. Es el caso del rol sin permiso. */
  onAccion?: () => void;
  /** Para leer el nodo completo de una: label, cifra, alarma y si es de solo lectura. */
  etiqueta: string;
  /** El «→» entre tarjetas. No va en la última. */
  conFlecha: boolean;
}

/**
 * Un nodo de una línea de proceso, como tarjeta.
 *
 * Las líneas de proceso —venta, cotización, caja— comparten forma y reglas: los
 * nodos están todos vivos a la vez, ninguno se marca «completado» y el clic no
 * avanza nada, abre el trabajo. Tenerlos en un solo componente evita que las
 * tres se separen visualmente con el tiempo.
 *
 * Operable es `<button>`; no operable es texto plano y no `<button disabled>`,
 * que no recibe foco y desaparece para un lector de pantalla.
 */
export function NodoProceso({
  label,
  indicador,
  descripciones = [],
  alarma,
  activo,
  onAccion,
  etiqueta,
  conFlecha,
}: NodoProcesoProps) {
  const contenido = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-full text-sm font-bold tabular-nums",
            activo
              ? "bg-accent text-accent-foreground ring-2 ring-primary/20"
              : "bg-muted text-muted-foreground",
          )}
        >
          {indicador}
        </span>
        {conFlecha && (
          <span aria-hidden="true" className="hidden text-muted-foreground md:block">
            →
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-foreground">{label}</p>

      {/* La alarma es una palabra, no un punto de color: se lee igual en escala
          de grises. */}
      {alarma && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
          {alarma}
        </p>
      )}

      {descripciones.map((linea) => (
        <p key={linea} className="mt-1 text-xs leading-5 text-muted-foreground">
          {linea}
        </p>
      ))}

      {!onAccion && activo && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">solo lectura</p>
      )}
    </>
  );

  const base = "group relative rounded-xl border p-4 text-left transition-all";

  if (!onAccion) {
    return <div className={cn(base, "border-border")}>{contenido}</div>;
  }

  return (
    <button
      type="button"
      onClick={onAccion}
      aria-label={etiqueta}
      className={cn(
        base,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        activo
          ? "border-primary bg-secondary shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted/40",
      )}
    >
      {contenido}
    </button>
  );
}

/**
 * El marco de un módulo: pestañas y acciones arriba, título y resumen debajo, y
 * lo que sea el cuerpo.
 *
 * Es lo que le da identidad a la pantalla y, sobre todo, lo que evita que los
 * botones queden flotando sueltos entre el título y la tabla. Lo usan las líneas
 * de proceso y cualquier módulo que no tenga proceso pero sí acciones.
 */
export function PanelModulo({
  titulo,
  descripcion,
  resumen,
  tituloOculto = false,
  pestanas,
  acciones,
  children,
  pie,
}: {
  titulo: string;
  descripcion?: string;
  resumen?: string;
  /**
   * Esconde el encabezado a la vista, no al lector de pantalla: el `titulo`
   * sigue nombrando la sección. Para el panel cuyo contenido ya se explica solo
   * y al que el título le sobra.
   */
  tituloOculto?: boolean;
  pestanas?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
}) {
  // Con el título oculto y sin descripción ni resumen no queda nada que pintar:
  // el bloque se va entero, con su margen, o deja un vacío arriba de los nodos.
  const hayEncabezado = !tituloOculto || Boolean(descripcion) || Boolean(resumen);

  return (
    <section
      aria-label={titulo}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7"
    >
      {(pestanas || acciones) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          {pestanas}
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </div>
      )}

      {hayEncabezado ? (
        <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={cn("font-semibold text-foreground", tituloOculto && "sr-only")}>
              {titulo}
            </h2>
            {descripcion && (
              <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
            )}
          </div>
          {resumen && (
            <span className="text-xs tabular-nums text-muted-foreground">{resumen}</span>
          )}
        </div>
      ) : (
        <h2 className="sr-only">{titulo}</h2>
      )}

      {children}
      {pie}
    </section>
  );
}

/** Una línea de proceso: el marco de arriba, con la rejilla de nodos dentro. */
export function LineaProceso({
  titulo,
  descripcion,
  resumen,
  tituloOculto,
  columnas = 3,
  pestanas,
  acciones,
  children,
  pie,
}: {
  titulo: string;
  descripcion?: string;
  resumen?: string;
  /** El título solo para el lector de pantalla. Ver `PanelModulo`. */
  tituloOculto?: boolean;
  /** Cuántos nodos tiene el proceso. Cotización tiene cuatro; caja, tres; venta, dos. */
  columnas?: 2 | 3 | 4;
  /**
   * Las pestañas del módulo y sus acciones, DENTRO del panel.
   *
   * Sueltas entre el título y el panel quedaban flotando sin pertenecer a nada.
   * Acá se leen como lo que son: de qué proceso se está hablando y qué se puede
   * hacer con él.
   */
  pestanas?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <PanelModulo
      titulo={titulo}
      descripcion={descripcion}
      resumen={resumen}
      tituloOculto={tituloOculto}
      pestanas={pestanas}
      acciones={acciones}
      pie={pie}
    >
      {/* Las columnas son exactamente los nodos: una rejilla fija de tres con dos
          nodos dejaría un hueco a la derecha, y el hueco se lee como un paso
          que falta. */}
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          columnas === 4 && "lg:grid-cols-4",
          columnas === 3 && "md:grid-cols-3",
        )}
      >
        {children}
      </div>
    </PanelModulo>
  );
}
