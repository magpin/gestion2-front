"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { LineaProceso, NodoProceso } from "@/components/shared/NodoProceso";
import {
  NODOS,
  SUBBANDEJAS,
  conteoDeNodo,
  vencidasDeNodo,
  type ConteosPorSubbandejaCotizacion,
  type IdNodoCotizacion,
} from "../lib/ciclo-cotizacion";

interface ProcesoCotizacionLineaProps {
  conteos: ConteosPorSubbandejaCotizacion;
  convertidas: number;
  onAccion: (nodo: IdNodoCotizacion) => void;
  operables: Record<IdNodoCotizacion, boolean>;
  /** Las pestañas del módulo y sus acciones, dentro del panel. */
  pestanas?: ReactNode;
  acciones?: ReactNode;
}

const ETIQUETA_SUBBANDEJA = new Map(SUBBANDEJAS.map((sub) => [sub.id, sub.label]));

/**
 * La línea del proceso de cotización: cuatro nodos, cada uno con su carga.
 *
 * Los cuatro están vivos a la vez: ningún nodo se marca «completado», porque un
 * nodo con cotizaciones está lleno, no terminado. El clic abre el selector para
 * operar una cotización concreta.
 */
export function ProcesoCotizacionLinea({
  conteos,
  convertidas,
  onAccion,
  operables,
  pestanas,
  acciones,
}: ProcesoCotizacionLineaProps) {
  const abiertas = NODOS.reduce((total, nodo) => total + conteoDeNodo(nodo, conteos), 0);

  return (
    <LineaProceso
      titulo="Proceso de cotización"
      descripcion="Cotizar, enviar, esperar respuesta y convertir en venta."
      resumen={`${abiertas} ${abiertas === 1 ? "cotización abierta" : "cotizaciones abiertas"}`}
      columnas={4}
      pestanas={pestanas}
      acciones={acciones}
      pie={
        /* Lo que cerró bien. Es la cifra que dice si cotizar sirve de algo. */
        convertidas > 0 ? (
          <p className="mt-6 border-t border-border pt-4 text-xs tabular-nums text-muted-foreground">
            {convertidas} {convertidas === 1 ? "convertida en venta" : "convertidas en venta"}
          </p>
        ) : undefined
      }
    >
      {NODOS.map((nodo, indice) => {
        const total = conteoDeNodo(nodo, conteos);
        const vencidas = vencidasDeNodo(nodo, conteos);
        const esPuerta = nodo.subbandejas.length === 0;
        const abre = (total > 0 || nodo.abreVacio === true) && operables[nodo.id];

        // La sublínea solo aparece si el nodo agrupa más de una subbandeja. La
        // vencida se omite: ya sale arriba como alarma.
        const descripciones = esPuerta
          ? ["crear cotización"]
          : nodo.subbandejas.length > 1
            ? nodo.subbandejas
                .filter((sub) => sub !== "vencida" && conteos[sub] > 0)
                .map((sub) => `${conteos[sub]} ${ETIQUETA_SUBBANDEJA.get(sub) ?? sub}`)
            : [];

        const etiqueta = esPuerta
          ? `${nodo.label}, crear cotización`
          : [
              nodo.label,
              `${total} ${total === 1 ? "cotización" : "cotizaciones"}`,
              vencidas > 0 ? `${vencidas} de ellas vencidas` : null,
              abre ? null : "solo lectura",
            ]
              .filter(Boolean)
              .join(", ");

        return (
          <NodoProceso
            key={nodo.id}
            label={nodo.label}
            indicador={
              esPuerta ? <Plus size={16} strokeWidth={2} aria-hidden="true" /> : total
            }
            descripciones={descripciones}
            alarma={
              vencidas > 0
                ? `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`
                : undefined
            }
            activo={total > 0 || esPuerta}
            onAccion={abre ? () => onAccion(nodo.id) : undefined}
            etiqueta={etiqueta}
            conFlecha={indice < NODOS.length - 1}
          />
        );
      })}
    </LineaProceso>
  );
}
