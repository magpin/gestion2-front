"use client";

import { useEffect, useRef, useState } from "react";

import { env } from "@/core/config/env";
import { useAuthStore } from "@/core/store/authStore";
import type { EventoProgreso } from "../types/asistente.types";
import type { EventoLote } from "../types/lote.types";

/** Cuánto se espera antes de volver a colgarse del flujo si se cortó. */
const REINTENTO_MS = 3000;

/**
 * El progreso de las lecturas, en vivo.
 *
 * Va con `fetch` y lectura del cuerpo por partes, no con `EventSource`: el token
 * viaja en `Authorization` y `EventSource` no sabe mandar cabeceras. Es la nota
 * que el backend dejó anotada para este paso.
 *
 * Si el flujo se corta —el servidor se reinició, se perdió la red— se vuelve a
 * colgar a los tres segundos. Nada se pierde con eso: el estado de cada
 * documento vive en la base y la pantalla lo relee; esto es solo el vivo.
 *
 * `alEvento` se guarda en una referencia para que cambiar el callback no reabra
 * la conexión en cada render.
 *
 * Devuelve si el flujo está abierto ahora. Es lo único que puede sostener el
 * sello «EN VIVO» de la burbuja de carga: con el flujo cortado, lo que se ve es
 * lo último que llegó, no lo que está pasando.
 */
export function useProgreso(
  activo: boolean,
  alEvento: (evento: EventoProgreso | EventoLote) => void,
): boolean {
  const token = useAuthStore((s) => s.token);
  const manejador = useRef(alEvento);
  const [conectado, setConectado] = useState(false);

  // La referencia se actualiza en un efecto y no durante el render: escribirla
  // mientras React dibuja es lo que la regla `react-hooks/refs` prohíbe, y con
  // razón —el valor podría quedar de un render que se descartó—.
  useEffect(() => {
    manejador.current = alEvento;
  }, [alEvento]);

  useEffect(() => {
    if (!activo || token === null) return;

    const corte = new AbortController();
    let vivo = true;
    let reintento: ReturnType<typeof setTimeout> | undefined;

    const escuchar = async () => {
      try {
        const respuesta = await fetch(`${env.apiUrl}/configuracion/ia/progreso`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: corte.signal,
        });
        // Un 401 o un 403 no se reintentan: reconectar cada tres segundos contra
        // un endpoint que ya dijo que no sería un bucle sin salida. El cliente de
        // axios ya cierra la sesión cuando el token vence.
        if (!respuesta.ok) {
          vivo = false;
          return;
        }
        if (respuesta.body === null) return;
        setConectado(true);

        const lector = respuesta.body.getReader();
        const decodificador = new TextDecoder();
        let pendiente = "";

        while (vivo) {
          const { done, value } = await lector.read();
          if (done) break;

          pendiente += decodificador.decode(value, { stream: true });
          // Un evento termina en línea vacía. Lo que quede a medias espera al
          // siguiente trozo: cortar un JSON por la mitad es lo que hace que un
          // flujo parezca roto cuando no lo está.
          const bloques = pendiente.split("\n\n");
          pendiente = bloques.pop() ?? "";

          for (const bloque of bloques) {
            const datos = bloque
              .split("\n")
              .filter((linea) => linea.startsWith("data:"))
              .map((linea) => linea.slice(5).trim())
              .join("");
            if (datos === "") continue;
            try {
              manejador.current(JSON.parse(datos) as EventoProgreso | EventoLote);
            } catch {
              // Un evento que no parsea se ignora: el estado real está en la
              // base, y tumbar el flujo por un renglón sería peor.
            }
          }
        }
      } catch {
        // Incluye el aborto al desmontar, que no es un error.
      }
      setConectado(false);

      if (vivo && !corte.signal.aborted) {
        reintento = setTimeout(() => void escuchar(), REINTENTO_MS);
      }
    };

    void escuchar();

    return () => {
      vivo = false;
      if (reintento !== undefined) clearTimeout(reintento);
      corte.abort();
      setConectado(false);
    };
  }, [activo, token]);

  return conectado;
}
