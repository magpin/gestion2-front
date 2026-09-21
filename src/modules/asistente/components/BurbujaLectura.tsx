"use client";

import { cn } from "@/lib/utils";
import type { LecturaEnVivo } from "../lib/lecturaEnVivo";
import { tiempoTranscurrido } from "../lib/lecturaEnVivo";
import type { Documento } from "../types/asistente.types";
import { NOMBRE_DOCUMENTO, TITULO_DOCUMENTO } from "../types/asistente.types";
import styles from "../asistente.module.css";
import { BotonTarjeta } from "./Piezas";
import { comoTexto } from "./Tarjetas";

/** Las barras del ecualizador: la última naranja, como en el prototipo. */
const BARRAS = [0, 110, 220, 330, 440];

/** Los renglones del documento en miniatura. Es un dibujo: no son del archivo. */
const RENGLONES = [60, 40, 90, 85, 70, 88, 50, 30, 75];

/** Dónde cae cada marca sobre la miniatura: una por dato encontrado, hasta tres. */
const MARCAS = [10, 56, 104];

/**
 * La burbuja de carga de una lectura en curso. Paso 2 de
 * `docs/planes/asistente-conversacion.md`, sobre el prototipo de
 * `docs/componentes-asistente/Carga.dc.html`.
 *
 * **Lo que dice sale de los eventos del backend, no de un temporizador.** El
 * prototipo movía todo con un reloj; acá cada pieza tiene su fuente:
 *
 * - el rótulo es el `mensaje` del último evento;
 * - los campos son los `datos` que trajo cada `EXTRAYENDO`, y se escriben una
 *   vez, cuando llegan;
 * - el tiempo cuenta desde `creadoEn`, cuando el documento entró a la cola;
 * - «EN VIVO» aparece solo con el flujo abierto;
 * - las marcas sobre la miniatura son tantas como datos llegaron, hasta tres.
 *
 * **Lo que no sale de ningún evento no se dibuja:** ni el porcentaje, ni
 * «verificando 3 de 5», ni los pasos hechos y pendientes. Una barra al 60 % es
 * una afirmación que nadie midió.
 *
 * El botón **Detener** vive acá. Antes estaba en la fila de la tarjeta de
 * documentos, junto a una barra indeterminada; es lo único de esa fila que
 * hacía algo, y funciona.
 */
export function BurbujaLectura({
  documento,
  lectura,
  enVivo,
  ahora,
  deteniendo,
  alDetener,
}: {
  documento: Documento;
  /** Lo que llegó por el flujo. Falta si la página se abrió con la lectura ya empezada. */
  lectura?: LecturaEnVivo;
  /** Si el flujo de eventos está abierto ahora. */
  enVivo: boolean;
  /** El reloj de la pantalla, en milisegundos. Solo para el tiempo transcurrido. */
  ahora: number;
  deteniendo: boolean;
  alDetener: (id: string) => void;
}) {
  const enCola = (lectura?.etapa ?? documento.estado) === "EN_COLA";
  const datos = lectura?.datos ?? [];
  // Sin evento todavía se dice lo que dice la base, con las mismas palabras
  // que usaría el backend. No se inventa un avance.
  const rotulo =
    lectura?.mensaje ??
    (enCola
      ? `${TITULO_DOCUMENTO[documento.tipo]} está en la cola.`
      : `Leyendo ${NOMBRE_DOCUMENTO[documento.tipo]}…`);

  return (
    <div className="relative overflow-hidden rounded-[1.05rem] bg-border p-px">
      <span className={styles.barrido} aria-hidden="true" />
      <div
        role="status"
        aria-live="polite"
        className="relative flex flex-col gap-4 rounded-[calc(1.05rem-1px)] bg-card px-[18px] py-4"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="inline-flex h-4 items-end gap-[3px]">
              {BARRAS.map((retraso, i) => (
                <span
                  key={retraso}
                  className={cn(
                    styles.ecualizador,
                    "h-4 w-[3px] rounded-sm",
                    i === BARRAS.length - 1 ? "bg-brand" : "bg-foreground",
                  )}
                  style={{ animationDelay: `${retraso}ms` }}
                />
              ))}
            </span>
            <span className={cn(styles.pulso, "truncate text-[15px] font-medium")}>{rotulo}</span>
          </span>

          <span className="flex shrink-0 items-center gap-2.5">
            <span className="font-mono text-[11px] text-muted-foreground">
              {tiempoTranscurrido(documento.creadoEn, ahora)}
            </span>
            {enVivo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-[3px] font-mono text-[10px] tracking-[0.8px] text-muted-foreground">
                <span className={cn(styles.late, "size-1.5 rounded-full bg-brand")} />
                EN VIVO
              </span>
            ) : (
              // Con el flujo cortado se sigue viendo lo último que llegó; no es
              // «en vivo», y el hook vuelve a conectarse solo.
              <span className="font-mono text-[10px] tracking-[0.8px] text-muted-foreground">
                RECONECTANDO
              </span>
            )}
          </span>
        </div>

        <div className="flex items-start gap-[18px]">
          <Miniatura titulo={TITULO_DOCUMENTO[documento.tipo]} leyendo={!enCola} marcas={datos.length} />

          <div className="flex min-w-0 grow flex-col">
            {datos.map((dato, i) => (
              <div
                key={dato.campo}
                className="grid grid-cols-[96px_1fr] items-center gap-3 border-t border-muted py-[7px]"
              >
                <span className="truncate text-xs text-muted-foreground">{dato.etiqueta}</span>
                <span className="flex min-w-0 items-center">
                  <span className={cn(styles.escribe, "truncate font-mono text-xs")}>
                    {comoTexto(dato.valor)}
                  </span>
                  {/* El cursor, solo en lo último que llegó y mientras se sigue leyendo. */}
                  {i === datos.length - 1 && <span className={styles.cursor} aria-hidden="true" />}
                </span>
              </div>
            ))}

            {enCola ? (
              <p className="m-0 border-t border-muted py-[7px] text-xs text-muted-foreground">
                Espera su turno: se lee un documento a la vez.
              </p>
            ) : (
              // Lo que sigue buscando. No dice cuántos campos faltan: nadie lo sabe.
              <div
                aria-hidden="true"
                className="grid grid-cols-[96px_1fr] items-center gap-3 border-t border-muted py-[7px]"
              >
                <span className={cn(styles.esqueleto, "h-2.5 w-16 rounded-full")} />
                <span className={cn(styles.esqueleto, "h-2.5 w-32 rounded-full")} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-dashed border-border pt-3">
          <span className="text-xs text-muted-foreground">
            {datos.length === 0
              ? "Nada se guarda hasta que lo revises."
              : `${datos.length} ${datos.length === 1 ? "dato" : "datos"} hasta ahora. Nada se guarda hasta que lo revises.`}
          </span>
          <BotonTarjeta disabled={deteniendo} onClick={() => alDetener(documento.id)}>
            {deteniendo ? "Deteniendo…" : "Detener"}
          </BotonTarjeta>
        </div>
      </div>
    </div>
  );
}

/**
 * El documento en miniatura, con el haz que lo recorre. Es un dibujo, no el
 * archivo: los renglones son siempre los mismos. Lo único que dice algo son las
 * marcas, una por dato encontrado.
 */
function Miniatura({ titulo, leyendo, marcas }: { titulo: string; leyendo: boolean; marcas: number }) {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-[152px] w-[120px] shrink-0 flex-col gap-2 overflow-hidden rounded-[0.45rem] border border-border bg-card px-2.5 py-3"
    >
      <span className="flex items-center justify-between">
        <span className="h-2 w-[26px] rounded-[2px] bg-foreground" />
        <span className="font-mono text-[7px] text-muted-foreground">{titulo}</span>
      </span>
      {RENGLONES.map((ancho, i) => (
        <span key={i} className="block h-1 rounded-[2px] bg-border" style={{ width: `${ancho}%` }} />
      ))}
      {leyendo && <span className={styles.haz} />}
      {MARCAS.slice(0, marcas).map((arriba) => (
        <span
          key={arriba}
          className={cn(styles.entra, "absolute right-2 left-2 h-[9px] rounded-[3px] border border-brand bg-brand/8")}
          style={{ top: arriba }}
        />
      ))}
    </div>
  );
}
