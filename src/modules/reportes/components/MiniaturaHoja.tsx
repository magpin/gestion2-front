"use client";

import { FileText } from "lucide-react";

import { eleccionPorDefecto } from "../lib/eleccion";
import { useMiniatura } from "../hooks/useReportes";
import type { Reporte } from "../types/reportes.types";
import styles from "../reportes.module.css";
import { HojaIframe } from "./HojaIframe";

/** Carta a 96 puntos por pulgada. */
const CARTA = { ancho: 816, alto: 1056 };
const ESCALA = 0.2;

/**
 * En la tarjeta la hoja va sola —sin el fondo gris ni la sombra de la
 * pantalla— y **solo la primera página**: lo que viene después del primer
 * corte no se muestra.
 */
const SOLO_LA_HOJA =
  "html{background:#fff!important;overflow:hidden!important}body{margin:0!important;box-shadow:none!important}.salto,.salto~*{display:none!important}";

/**
 * La primera página del reporte de verdad, a un quinto de su tamaño.
 *
 * No es un dibujo de cómo se ve: es la hoja, con los datos de este mes. Si la
 * empresa todavía no tiene ventas, la miniatura lo dice antes de abrir nada.
 */
export function MiniaturaHoja({ reporte }: { reporte: Reporte }) {
  const horizontal = reporte.formato.orientacion === "HORIZONTAL";
  const ancho = horizontal ? CARTA.alto : CARTA.ancho;
  const alto = horizontal ? CARTA.ancho : CARTA.alto;
  const { data, isPending, isError } = useMiniatura(
    reporte.clave,
    eleccionPorDefecto(reporte.parametro),
  );
  const variasPaginas = !reporte.formato.paginas.startsWith("1 ");

  const marco = "rounded-[2px] bg-white shadow-[0_18px_50px_rgba(23,23,23,0.18),0_0_0_1px_rgba(23,23,23,0.06)]";

  return (
    <div className="relative">
      {variasPaginas && (
        <div
          aria-hidden
          className={`absolute ${marco}`}
          style={{ width: ancho * ESCALA, height: alto * ESCALA, left: 16, top: 10 }}
        />
      )}
      <div
        className={`relative overflow-hidden ${marco}`}
        style={{ width: ancho * ESCALA, height: alto * ESCALA }}
      >
        {isPending ? (
          <div className="flex h-full flex-col gap-2 p-3" aria-hidden>
            <span className={`${styles.skHoja} h-2.5 w-3/5 rounded`} />
            <span className={`${styles.skHoja} h-6 w-full rounded`} />
            <span className={`${styles.skHoja} h-1.5 w-4/5 rounded`} />
            <span className={`${styles.skHoja} h-1.5 w-11/12 rounded`} />
            <span className={`${styles.skHoja} h-1.5 w-3/4 rounded`} />
          </div>
        ) : isError || !data ? (
          <div className="flex h-full items-center justify-center text-[#b8b8b8]" aria-hidden>
            <FileText className="size-6" />
          </div>
        ) : (
          <HojaIframe
            html={data.html}
            titulo={`Vista previa de ${reporte.etiqueta}`}
            estilo={SOLO_LA_HOJA}
            decorativa
            className="pointer-events-none origin-top-left border-0"
            style={{ width: ancho, height: alto, transform: `scale(${ESCALA})` }}
          />
        )}
      </div>
    </div>
  );
}
