"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormDialog } from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";

export type TonoGrupo = "normal" | "espera" | "traba";

// Lo mínimo que el selector necesita saber de un documento para listarlo. No
// sabe si es una orden de trabajo, una cotización o una venta: recibe cuatro
// textos ya resueltos.
export interface DocumentoEnSelector {
  id: string;
  numero: string;
  /** Quién: normalmente el cliente. */
  titulo: string;
  /** Qué: el equipo en una reparación, el resumen de líneas en un documento comercial. */
  detalle?: string;
  /** El dato que aporta la bandeja — ver la regla de abajo. */
  contextual?: string;
}

// ⚠️ El dato contextual lo calcula QUIEN ARMA LOS GRUPOS, no el selector.
//
// Antes se resolvía acá adentro con un `switch` sobre la subbandeja de la OT:
// en una trabada mostraba el motivo, en una que espera los días sin respuesta, y
// si no, la fecha de entrega. Con tres procesos ese switch tendría que conocer
// las bandejas de los tres y este componente dejaría de ser genérico para
// volverse un cajón con la lógica de todos.
export interface GrupoSelector<T extends DocumentoEnSelector> {
  id: string;
  label: string;
  tono?: TonoGrupo;
  documentos: T[];
  // Ausente ⇒ grupo informativo: se listan los documentos pero no se pueden
  // operar. Es el caso del rol sin permiso sobre ese subproceso — ver las
  // órdenes que esperan facturación es útil aunque no las facture uno.
  accion?: {
    label: string;
    onElegir: (documento: T) => void;
  };
}

interface SelectorDocumentoModalProps<T extends DocumentoEnSelector> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  grupos: GrupoSelector<T>[];
  /** Cómo se nombra a estos documentos: "orden"/"órdenes", "cotización"/"cotizaciones". */
  singular: string;
  plural: string;
  /** Nodo 1: el botón que dispara el proceso, que existe aunque la bandeja esté vacía. */
  encabezado?: ReactNode;
  /** Qué ofrecer cuando el nodo es una puerta y no hay nada listado. */
  descripcionVaciaConEncabezado?: string;
  isLoading?: boolean;
  isError?: boolean;
  /** El error de la consulta, para decir qué pasó. Sin él se dice lo que se sabe. */
  error?: unknown;
  onReintentar?: () => void;
}

const ICONO_TONO: Record<TonoGrupo, ReactNode> = {
  normal: null,
  espera: <Hourglass size={12} strokeWidth={2} aria-hidden="true" />,
  traba: <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />,
};

// text-destructive da 4.77:1 en claro y 6.45:1 en oscuro; el ámbar de la traba
// no llega a AA sobre `card`, así que el tono de espera se comunica con el icono
// y la palabra, no con color.
const CLASE_TONO: Record<TonoGrupo, string> = {
  normal: "text-muted-foreground",
  espera: "text-muted-foreground",
  traba: "text-destructive",
};

function FilaDocumento<T extends DocumentoEnSelector>({
  documento,
  tono,
  onElegir,
}: {
  documento: T;
  tono: TonoGrupo;
  onElegir?: (documento: T) => void;
}) {
  const contenido = (
    <>
      <span className="font-mono text-sm font-medium text-foreground">
        {documento.numero}
      </span>
      <span className="truncate text-sm text-foreground">{documento.titulo}</span>
      <span className="truncate text-sm text-muted-foreground">
        {documento.detalle ?? ""}
      </span>
      <span
        className={cn(
          "truncate text-right text-xs",
          tono === "traba" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {documento.contextual ?? ""}
      </span>
    </>
  );

  const clases =
    "grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 rounded-lg px-3 py-2 text-left";

  // Regla §4.1: es <button> solo si es operable. Un <button disabled> no recibe
  // foco y desaparece para un lector de pantalla; el texto plano se lee igual.
  if (!onElegir) {
    return <div className={clases}>{contenido}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onElegir(documento)}
      className={cn(
        clases,
        "w-full transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      {contenido}
    </button>
  );
}

// Paso 1 del gesto de dos pasos: elegir el documento dentro de un nodo. El paso
// 2 —la acción— lo abre quien consume este componente.
//
// Un modal por nodo es lo que ve el usuario; por dentro es este mismo componente
// parametrizado, no una copia por proceso.
export function SelectorDocumentoModal<T extends DocumentoEnSelector>({
  open,
  onOpenChange,
  titulo,
  grupos,
  singular,
  plural,
  encabezado,
  descripcionVaciaConEncabezado,
  isLoading = false,
  isError = false,
  error,
  onReintentar,
}: SelectorDocumentoModalProps<T>) {
  // Un grupo en 0 no se imprime: "Trabadas (0)" es ruido, y su ausencia ya dice
  // que no hay ninguna.
  const visibles = grupos.filter((grupo) => grupo.documentos.length > 0);

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} titulo={titulo} ancho={720}>
      {encabezado && <div className="mb-4">{encabezado}</div>}

      {isLoading && <SkeletonTable filas={4} columnas={4} />}

      {!isLoading && isError && (
        <ErrorCarga error={error} titulo={`No se pudieron cargar las ${plural}`} onReintentar={onReintentar} />
      )}

      {!isLoading && !isError && visibles.length === 0 && (
        <EmptyState
          titulo={`No hay ${plural} en esta etapa`}
          descripcion={
            encabezado && descripcionVaciaConEncabezado
              ? descripcionVaciaConEncabezado
              : `Cuando alguna ${singular} llegue aquí, la verá en esta lista.`
          }
        />
      )}

      {!isLoading && !isError && visibles.length > 0 && (
        <div className="space-y-6">
          {visibles.map((grupo) => {
            const tono = grupo.tono ?? "normal";
            return (
              <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`}>
                <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-border pb-1">
                  <h3
                    id={`grupo-${grupo.id}`}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
                      CLASE_TONO[tono],
                    )}
                  >
                    {ICONO_TONO[tono]}
                    {grupo.label} ({grupo.documentos.length})
                  </h3>
                  {grupo.accion && (
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {grupo.accion.label}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border">
                  {grupo.documentos.map((documento) => (
                    <FilaDocumento
                      key={documento.id}
                      documento={documento}
                      tono={tono}
                      onElegir={grupo.accion?.onElegir}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </FormDialog>
  );
}
