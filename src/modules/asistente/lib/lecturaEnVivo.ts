import type { DatoExtraido, EventoProgreso, TipoDocumento } from "../types/asistente.types";

/**
 * Lo que se sabe de una lectura en curso, armado **solo con los eventos del
 * flujo**. La burbuja de carga se dibuja con esto y nada más: el prototipo
 * movía todo con un temporizador, y un temporizador es inventar.
 */
export interface LecturaEnVivo {
  documentoId: string;
  tipo: TipoDocumento;
  etapa: "EN_COLA" | "LEYENDO" | "EXTRAYENDO";
  /** Lo último que dijo el backend: «Leyendo el RUT…», «Encontré la razón social». */
  mensaje: string;
  /** Lo encontrado hasta ahora, en el orden en que llegó. */
  datos: DatoExtraido[];
}

export type LecturasEnVivo = Record<string, LecturaEnVivo>;

/**
 * Suma un evento a lo que ya se sabía.
 *
 * - `EXTRAYENDO` trae **solo lo nuevo** de ese tramo, y el proveedor avisa que
 *   un dato puede llegar dos veces. Se junta por `campo`: si se repite, gana el
 *   último, en su lugar de siempre.
 * - `LISTO` y `ERROR` cierran la lectura: sale de acá, y lo que queda lo cuenta
 *   el documento, que vive en la base.
 *
 * Pura y sin mutar: la usa un `useState` con el estado anterior.
 */
export function aplicarEvento(previas: LecturasEnVivo, evento: EventoProgreso): LecturasEnVivo {
  if (evento.etapa === "LISTO" || evento.etapa === "ERROR") {
    if (!(evento.documentoId in previas)) return previas;
    const siguientes = { ...previas };
    delete siguientes[evento.documentoId];
    return siguientes;
  }

  const anterior = previas[evento.documentoId];
  const datos = [...(anterior?.datos ?? [])];
  for (const dato of evento.datos) {
    const i = datos.findIndex((d) => d.campo === dato.campo);
    if (i >= 0) datos[i] = dato;
    else datos.push(dato);
  }

  return {
    ...previas,
    [evento.documentoId]: {
      documentoId: evento.documentoId,
      tipo: evento.documento,
      etapa: evento.etapa,
      mensaje: evento.mensaje,
      datos,
    },
  };
}

/**
 * Minutos y segundos desde que se subió el documento: «00:07», «01:32». Sale de
 * `creadoEn`, que es el momento en que entró a la cola, así que sobrevive a
 * recargar la página. Nunca negativo: un reloj del navegador atrasado respecto
 * al servidor daría «-00:02».
 */
export function tiempoTranscurrido(desdeIso: string, ahora: number): string {
  const segundos = Math.max(0, Math.floor((ahora - Date.parse(desdeIso)) / 1000));
  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
