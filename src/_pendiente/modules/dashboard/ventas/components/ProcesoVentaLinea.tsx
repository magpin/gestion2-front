"use client";

import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { LineaProceso, NodoProceso } from "@/components/shared/NodoProceso";
import {
  NODOS,
  SUBBANDEJAS,
  conteoDeNodo,
  frenadasDeNodo,
  type ConteosPorSubbandejaVenta,
  type IdNodoVenta,
} from "../lib/ciclo-venta";

const ETIQUETA_SUBBANDEJA = new Map(SUBBANDEJAS.map((sub) => [sub.id, sub.label]));

interface ProcesoVentaLineaProps {
  conteos: ConteosPorSubbandejaVenta;
  anuladas: number;
  onAccion: (nodo: IdNodoVenta) => void;
  /**
   * Qué nodos puede operar el rol. Un nodo sin permiso se muestra igual: el
   * vendedor necesita ver cuántas ventas están frenadas por una firma aunque no
   * sea él quien firme. Lo que no tiene es el botón.
   */
  operables: Record<IdNodoVenta, boolean>;
  /** Las pestañas del módulo y sus acciones, dentro del panel. */
  pestanas?: ReactNode;
  acciones?: ReactNode;
}

/**
 * La línea del proceso de venta: un nodo por cada trabajo pendiente.
 *
 * No es una barra de progreso ni un asistente: todos están vivos a la vez.
 * Por eso ningún nodo se marca «completado» —un nodo con ventas está lleno, no
 * terminado— y el clic no avanza el proceso: abre el selector para operar una
 * venta concreta.
 */
export function ProcesoVentaLinea({
  conteos,
  anuladas,
  onAccion,
  operables,
  pestanas,
  acciones,
}: ProcesoVentaLineaProps) {
  return (
    <LineaProceso
      // Sin encabezado a la vista: los nodos ya dicen qué es esto y cuánto hay
      // en cada uno. El título queda para el lector de pantalla, que no tiene
      // los nodos delante.
      titulo="Proceso de venta"
      tituloOculto
      columnas={NODOS.length}
      pestanas={pestanas}
      acciones={acciones}
      pie={
        anuladas > 0 ? (
          <p className="mt-6 flex items-center gap-1 border-t border-border pt-4 text-xs tabular-nums text-muted-foreground">
            <X size={12} strokeWidth={2} aria-hidden="true" />
            {anuladas} {anuladas === 1 ? "anulada" : "anuladas"}
          </p>
        ) : undefined
      }
    >
      {NODOS.map((nodo, indice) => {
        const total = conteoDeNodo(nodo, conteos);
        // Vender no agrupa bandejas: es la puerta de entrada, siempre operable
        // y sin cifra que mostrar.
        const esPuerta = nodo.subbandejas.length === 0;
        const abre = (total > 0 || nodo.abreVacio === true) && operables[nodo.id];
        // Las frenadas son un subconjunto del nodo, no un sumando.
        const frenadas = frenadasDeNodo(nodo, conteos);

        // La sublínea solo aparece si el nodo agrupa más de una subbandeja. Las
        // frenadas se omiten: ya salen arriba como alarma.
        const descripciones = esPuerta
          ? ["registrar venta"]
          : nodo.subbandejas.length > 1
            ? nodo.subbandejas
                .filter((sub) => sub !== "sin_autorizar" && conteos[sub] > 0)
                .map((sub) => `${conteos[sub]} ${ETIQUETA_SUBBANDEJA.get(sub) ?? sub}`)
            : [];

        const etiqueta = esPuerta
          ? `${nodo.label}, registrar venta`
          : [
              nodo.label,
              `${total} ${total === 1 ? "venta" : "ventas"}`,
              frenadas > 0 ? `${frenadas} de ellas esperando la firma del director` : null,
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
            alarma={frenadas > 0 ? `${frenadas} sin firma` : undefined}
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
