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
      return (
        <Turno
          turno={{ id: turno.id, autor: "ASISTENTE", texto: turno.texto }}
          tarjeta={<Fuentes fuentes={turno.fuentes} />}
        />
      );
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
 * De dónde salieron las cifras de la respuesta, debajo de ella: «Según:
 * Cartera · Saldos de caja y bancos». Sin consultas, nada.
 */
function Fuentes({ fuentes }: { fuentes: readonly string[] }) {
  if (fuentes.length === 0) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Según: {fuentes.join(" · ")}
    </span>
  );
}

/** Lo que dice la burbuja mientras se consulta: con palabras de la aplicación. */
export function textoDeConsulta(etiqueta: string): string {
  if (etiqueta === "Búsqueda") return "Buscando cómo está escrito…";
  return `Consultando ${etiqueta.toLowerCase()}…`;
}

/**
 * La pregunta recién mandada y su respuesta mientras llega.
 *
 * Tres momentos, y cada uno dice lo que pasa de verdad: **pensando** son tres
 * puntos hasta que llega el primer pedazo; **consultando** dice qué datos está
 * mirando —«Consultando cartera…»—, porque una consulta tarda segundos y una
 * pantalla quieta parece colgada; **escribiendo** es el texto con el cursor al
 * final. No hay un mínimo de tiempo para ninguno: si la respuesta ya empezó,
 * se muestra.
 */
export function TurnoRespondiendo({ enVivo }: { enVivo: TurnoEnVivo }) {
  return (
    <>
      <Turno turno={{ id: "pregunta-en-vivo", autor: "PERSONA", texto: enVivo.pregunta }} />
      <Turno
        turno={{ id: "respuesta-en-vivo", autor: "ASISTENTE" }}
        pensando
        tarjeta={
          enVivo.consultando !== null ? (
            <div className="flex flex-col gap-2">
              {enVivo.texto !== "" && (
                <p className="m-0 text-[15px] leading-relaxed break-words whitespace-pre-line">
                  <TextoRico texto={enVivo.texto} />
                </p>
              )}
              <span
                role="status"
                className="flex items-center gap-2 text-[13px] text-muted-foreground"
              >
                <span className={cn(styles.late, "size-1.5 rounded-full bg-brand")} />
                {textoDeConsulta(enVivo.consultando)}
              </span>
            </div>
          ) : enVivo.texto === "" ? (
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
