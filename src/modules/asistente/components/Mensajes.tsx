import type { ReactNode } from "react";

import type { Turno as TurnoTipo } from "../types/asistente.types";
import { AvatarAsistente, ChipArchivo, TextoRico } from "./Piezas";
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
  tarjeta,
}: {
  turno: TurnoTipo;
  /** El anillo del avatar gira mientras el backend está leyendo de verdad. */
  pensando?: boolean;
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
        <div className="max-w-[420px] rounded-xl rounded-br-[0.3rem] bg-primary px-4 py-2.5 text-sm leading-normal text-primary-foreground">
          {turno.texto}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.entra} flex items-start gap-3.5`}>
      <AvatarAsistente pensando={pensando} />
      <div className="flex min-w-0 flex-grow flex-col gap-3 pt-1">
        {turno.texto !== undefined && (
          <p className="m-0 text-[15px] leading-relaxed">
            <TextoRico texto={turno.texto} />
          </p>
        )}
        {tarjeta}
      </div>
    </div>
  );
}
