"use client";

import type { ReactNode } from "react";
import { Calculator, Check } from "lucide-react";
import { LineaProceso, NodoProceso } from "@/components/shared/NodoProceso";
import { formatFecha } from "@/lib/utils";
import {
  NODOS,
  conteoDeNodo,
  type ConteosPorSubbandejaCaja,
  type EstadoDelCierre,
  type IdNodoCaja,
} from "../lib/ciclo-caja";

interface ProcesoCajaLineaProps {
  conteos: ConteosPorSubbandejaCaja;
  cierre: EstadoDelCierre;
  onAccion: (nodo: IdNodoCaja) => void;
  /**
   * Qué nodos puede operar el rol. Un nodo sin permiso se muestra igual: el
   * director necesita ver cuánto hay por cobrar aunque no cobre. Lo que no
   * tiene es el botón.
   */
  operables: Record<IdNodoCaja, boolean>;
  /** Las pestañas del módulo y sus acciones, dentro del panel. */
  pestanas?: ReactNode;
  acciones?: ReactNode;
}

/**
 * La línea del proceso de caja: tres nodos, cada uno con su carga.
 *
 * Los tres están vivos a la vez —se cobra y se paga toda la jornada, y al final
 * se cuenta—. `Cerrar caja` no lleva cifra porque no agrupa documentos: lo que
 * se arquea es el cajón, y su carga es un estado —arqueada o sin arquear—.
 */
export function ProcesoCajaLinea({
  conteos,
  cierre,
  onAccion,
  operables,
  pestanas,
  acciones,
}: ProcesoCajaLineaProps) {
  const abiertos = NODOS.reduce((total, nodo) => total + conteoDeNodo(nodo, conteos), 0);

  // Más de un día sin arquear es trabajo atrasado, no una espera: el conteo de
  // ayer ya no se puede hacer de memoria. Un solo día es lo normal a primera
  // hora, antes de que el cajero cierre el día anterior.
  const atrasado = (cierre.diasSinArquear ?? 0) > 1;

  return (
    <LineaProceso
      titulo="Proceso de caja"
      descripcion="Cobrar, pagar y contar el cajón al final del día."
      resumen={`${abiertos} ${abiertos === 1 ? "documento con saldo" : "documentos con saldo"}`}
      pestanas={pestanas}
      acciones={acciones}
    >
      {NODOS.map((nodo, indice) => {
        const total = conteoDeNodo(nodo, conteos);
        // Cerrar no agrupa bandejas: es el conteo del cajón, siempre disponible
        // y sin cifra que mostrar.
        const esCierre = nodo.subbandejas.length === 0;
        const abre =
          (total > 0 || nodo.abreVacio === true) &&
          operables[nodo.id] &&
          // Un segundo arqueo del mismo día devuelve 409: dos arqueos serían dos
          // verdades sobre el mismo cajón. Se muestra, no se opera.
          !(esCierre && cierre.arqueadoHoy);

        const descripciones: string[] = [];
        if (esCierre) {
          if (cierre.arqueadoHoy) {
            descripciones.push("arqueada hoy");
          } else if (cierre.ultimoArqueo === null) {
            descripciones.push("nunca se ha arqueado");
          } else {
            descripciones.push(`último cierre ${formatFecha(cierre.ultimoArqueo)}`);
          }
        }

        const etiqueta = esCierre
          ? [
              nodo.label,
              cierre.arqueadoHoy ? "ya arqueada hoy" : "contar el cajón",
              atrasado ? `${cierre.diasSinArquear} días sin arquear` : null,
            ]
              .filter(Boolean)
              .join(", ")
          : [
              nodo.label,
              `${total} ${total === 1 ? "documento" : "documentos"}`,
              abre ? null : "solo lectura",
            ]
              .filter(Boolean)
              .join(", ");

        return (
          <NodoProceso
            key={nodo.id}
            label={nodo.label}
            indicador={
              esCierre ? (
                cierre.arqueadoHoy ? (
                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Calculator size={16} strokeWidth={2} aria-hidden="true" />
                )
              ) : (
                total
              )
            }
            descripciones={descripciones}
            alarma={
              esCierre && atrasado && !cierre.arqueadoHoy
                ? `${cierre.diasSinArquear} días sin arquear`
                : undefined
            }
            activo={total > 0 || esCierre}
            onAccion={abre ? () => onAccion(nodo.id) : undefined}
            etiqueta={etiqueta}
            conFlecha={indice < NODOS.length - 1}
          />
        );
      })}
    </LineaProceso>
  );
}
