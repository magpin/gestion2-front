import type { ReactNode } from "react";

import type { Turno as TurnoTipo } from "../types/asistente.types";
import { Maria, type EstadoMaria } from "./Maria";
import { ChipArchivo, TextoRico } from "./Piezas";
import styles from "../asistente.module.css";

/**
 * Un turno de la conversación.
 *
 * Los dos lados no se dibujan igual, y es a propósito: lo que hace la persona va
 * en burbuja a la derecha —es corto y es suyo—, y lo que responde el asistente va
 * sin burbuja a la izquierda, con su avatar, porque trae tarjetas y cifras que
 * necesitan el ancho de la columna.
 *
 * La tarjeta la dibuja quien llama: depende del estado en vivo —qué documento va
 * en qué— y eso no es asunto de este componente.
 */
export function Turno({
  turno,
  pensando = false,
  cara,
  tarjeta,
}: {
  turno: TurnoTipo;
  /** El anillo del avatar gira mientras el backend está leyendo de verdad. */
  pensando?: boolean;
  /**
   * La cara de este turno, cuando no salió bien. Sin esto, un «no pude» se
   * veía con la misma cara que una respuesta correcta.
   */
  cara?: EstadoMaria;
  tarjeta?: ReactNode;
}) {
  if (turno.autor === "PERSONA") {
    return (
      <div className={`${styles.entra} flex flex-col items-end gap-2`}>
        {turno.archivo !== undefined && (
          <div className="flex max-w-[520px] flex-wrap justify-end gap-1.5">
            <ChipArchivo nombre={turno.archivo} />
          </div>
        )}
        {/* La esquina de abajo a la derecha es la chica: apunta a quien escribió. */}
        <div className="max-w-[420px] rounded-xl rounded-br-[0.3rem] bg-primary px-4 py-2.5 text-sm leading-normal break-words whitespace-pre-line text-primary-foreground">
          {turno.texto}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.entra} flex items-start gap-3.5`}>
      {/* Mientras contesta se agranda para que quepa el aura: por debajo de
          40 px no se dibuja, y es justo el momento en que hace falta ver que
          está trabajando. Al terminar vuelve a su tamaño de siempre, que es el
          que permite tener veinte mensajes sin que la pantalla sea un
          carnaval. */}
      <Maria
        estado={cara ?? (pensando ? "pensando" : "reposo")}
        tamano={pensando ? 40 : 28}
        // En reposo el aura va igual que en el encabezado: la misma forma,
        // apenas presente. Con la intensidad de «calma» a este tamaño no se
        // distingue del borde, y una cara sin aura al lado de otra que sí la
        // tiene se lee como dos personajes distintos.
        intensidad={pensando ? undefined : "suave"}
        className={pensando ? "-my-1.5 -ml-1.5" : undefined}
      />
      <div className="flex min-w-0 flex-grow flex-col gap-3 pt-1">
        {turno.texto !== undefined && (
          <p className="m-0 text-[15px] leading-relaxed break-words whitespace-pre-line">
            <TextoRico texto={turno.texto} />
          </p>
        )}
        {tarjeta}
      </div>
    </div>
  );
}
