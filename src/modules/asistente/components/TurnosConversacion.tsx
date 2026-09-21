import { cn } from "@/lib/utils";
import type { TurnoEnVivo } from "../hooks/useConversacion";
import type { TurnoConversacion } from "../types/conversacion.types";
import styles from "../asistente.module.css";
import { Turno } from "./Mensajes";
import { TextoRico } from "./Piezas";
import { TarjetaFalla } from "./Tarjetas";

/**
 * Un turno guardado de la conversación, según cómo terminó.
 *
 * Lo que el backend guardó es lo que se dibuja: un turno cortado muestra lo
 * que alcanzó a escribirse y lo dice; uno rechazado o fallido no tiene texto,
 * tiene un motivo, y va en la tarjeta de aviso que ya usa la lectura.
 */
export function TurnoGuardado({ turno }: { turno: TurnoConversacion }) {
  if (turno.autor === "PERSONA") {
    return <Turno turno={{ id: turno.id, autor: "PERSONA", texto: turno.texto }} />;
  }

  switch (turno.estado) {
    case "COMPLETO":
      return <Turno turno={{ id: turno.id, autor: "ASISTENTE", texto: turno.texto }} />;
    case "CORTADO":
      return (
        <Turno
          turno={{
            id: turno.id,
            autor: "ASISTENTE",
            texto: turno.texto === "" ? undefined : turno.texto,
          }}
          tarjeta={
            <span className="text-xs text-muted-foreground">
              {turno.motivo ?? "La respuesta se cortó antes de terminar."}
            </span>
          }
        />
      );
    case "RECHAZADO":
      return (
        <Turno
          turno={{ id: turno.id, autor: "ASISTENTE" }}
          tarjeta={
            <TarjetaFalla
              titulo="No contesté esa pregunta"
              detalle={turno.motivo ?? "Probá preguntarlo de otra manera."}
            />
          }
        />
      );
    case "FALLO":
      return (
        <Turno
          turno={{ id: turno.id, autor: "ASISTENTE" }}
          tarjeta={
            <TarjetaFalla
              titulo="No pude contestar"
              detalle={turno.motivo ?? "Probá de nuevo en un rato."}
            />
          }
        />
      );
  }
}

/**
 * La pregunta recién mandada y su respuesta mientras llega.
 *
 * Dos momentos, y cada uno dice lo que pasa de verdad: **pensando** son tres
 * puntos hasta que llega el primer pedazo; **escribiendo** es el texto con el
 * cursor al final. No hay un mínimo de tiempo para los puntos: si la respuesta
 * ya empezó, se muestra.
 */
export function TurnoRespondiendo({ enVivo }: { enVivo: TurnoEnVivo }) {
  return (
    <>
      <Turno turno={{ id: "pregunta-en-vivo", autor: "PERSONA", texto: enVivo.pregunta }} />
      <Turno
        turno={{ id: "respuesta-en-vivo", autor: "ASISTENTE" }}
        pensando
        tarjeta={
          enVivo.texto === "" ? (
            <span
              role="status"
              aria-label="Pensando"
              className="flex h-[26px] items-center gap-1"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(styles.punto, "size-1.5 rounded-full bg-muted-foreground")}
                />
              ))}
            </span>
          ) : (
            <p
              aria-live="polite"
              className="m-0 text-[15px] leading-relaxed break-words whitespace-pre-line"
            >
              <TextoRico texto={enVivo.texto} />
              <span className={styles.cursor} aria-hidden="true" />
            </p>
          )
        }
      />
    </>
  );
}
