import type { EstadoMaria } from "../components/Maria";
import type { ClaseDeFalla, EstadoTurno } from "../types/conversacion.types";

/**
 * Cuando algo no se puede.
 *
 * Cuatro casos que hasta ahora se veían todos iguales: un recuadro con el
 * mismo título y el motivo que viniera. Acá cada uno tiene su cara y su
 * frase, según `docs/planes/maria.md`.
 *
 * **Ninguno usa rojo, a propósito: no son errores de quien pregunta.** Y
 * ninguno se queda en decir qué falló: todos dicen qué sigue. Una frase que
 * solo informa del problema deja a la persona en el mismo lugar donde estaba.
 */
export interface Limite {
  /** La cara. Ninguna de las cuatro lleva insignia de alarma. */
  cara: EstadoMaria;
  titulo: string;
  /** Qué hacer ahora. Se usa cuando el backend no manda un motivo propio. */
  salida: string;
}

export const LIMITES = {
  noPude: {
    cara: "noPude",
    titulo: "No pude",
    salida: "Probá de nuevo en un rato y seguimos.",
  },
  sinPermiso: {
    cara: "sinPermiso",
    titulo: "Eso no lo puedo ver",
    salida: "Pedile acceso a quien administra la empresa.",
  },
  periodoCerrado: {
    cara: "periodoCerrado",
    titulo: "Ese período está cerrado",
    salida: "Lo dejo esperando o lo mando al período abierto: vos decidís.",
  },
  noEntendi: {
    cara: "noEntendi",
    titulo: "No te entendí",
    salida: "Contámelo de otra manera y lo intento.",
  },
  dormida: {
    cara: "dormida",
    titulo: "Estoy apagada",
    salida: "La IA está pausada para esta empresa.",
  },
} as const satisfies Record<string, Limite>;

export type ClaveLimite = keyof typeof LIMITES;

/**
 * Qué cara le corresponde a un turno que no salió bien.
 *
 * Solo mira lo que el backend dice **de forma tipada**: el estado del turno y,
 * desde la migración 0057, de qué clase fue la falla. Los motivos son texto
 * libre que escribe el modelo, y adivinar ahí —buscar «permiso» o «cerrado»
 * en una frase— daría una cara equivocada el día que se exprese distinto.
 *
 * `sinPermiso` y `periodoCerrado` siguen sin usarse acá, y no por falta de
 * dato: **no pasan en un turno**. Ocurren al confirmar una propuesta, que es
 * otra operación con su propio error.
 */
export function limiteDelTurno(estado: EstadoTurno, clase?: ClaseDeFalla | null): Limite | null {
  switch (estado) {
    case "FALLO":
      // Una falla del proveedor no es «no pude con esto»: es que no está. Y
      // eso se parece más a estar dormida que a haberlo intentado y fallado.
      return clase === "SIN_CLAVE" || clase === "SIN_SALDO" || clase === "NO_DISPONIBLE"
        ? LIMITES.dormida
        : LIMITES.noPude;
    case "RECHAZADO":
      return LIMITES.noEntendi;
    // Una respuesta cortada sí dijo algo: lo que alcanzó a escribir vale, y
    // la cara no tiene por qué dramatizar el corte.
    case "CORTADO":
    case "COMPLETO":
      return null;
  }
}

/** La cara de un documento que no se pudo leer. */
export const limiteDeLectura = LIMITES.noPude;
