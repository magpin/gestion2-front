"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { Maria } from "@/modules/asistente/components/Maria";
import { periodosApi } from "@/modules/contabilidad/services/contabilidad.service";
import { Marca } from "@/modules/landing/components/Marca";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { RUTA_PASO } from "../components/rutas";
import { configuracionService } from "../services/configuracion.service";
import { empresaApi } from "../services/nucleo.service";
import type { EstadoConfiguracion } from "../types/configuracion.types";
import styles from "../bienvenida.module.css";

/**
 * El cierre del asistente: la bienvenida de María. Sale de los artboards de
 * `bienvenida-maria/bienvenida/` —claro, oscuro y móvil— y de su `LEEME.md`.
 *
 * **Se muestra una sola vez por empresa** (0072). Al llegar:
 * - con la configuración a medias → al paso que falta;
 * - completa y ya vista → al tablero, directo;
 * - completa y sin ver → la bienvenida, y se marca vista **en ese momento**,
 *   no al tocar el botón: una recarga no tiene que volver a darla.
 *
 * Reemplaza lo decidido el 23 sep —terminar llevaba derecho al Inicio con un
 * aviso—: el dueño pidió esta pantalla el 25 sep.
 *
 * No es un paso más: sin recorrido, sin «atrás» ni «siguiente». Es la salida.
 */
export function ConfiguracionListaView() {
  const router = useRouter();
  const { data } = useEstadoConfiguracion();

  // La decisión se toma una vez, con el estado con el que se llegó. Marcarla
  // vista refresca el estado, y si se decidiera con el de cada momento la
  // pantalla se iría sola al tablero en cuanto el backend contestara.
  const [llegada, setLlegada] = useState<EstadoConfiguracion | null>(null);
  if (data !== undefined && llegada === null) setLlegada(data);

  const mostrar = llegada !== null && llegada.completa && !llegada.bienvenidaVista;

  useEffect(() => {
    if (llegada === null) return;
    if (!llegada.completa) {
      if (llegada.siguiente) router.replace(RUTA_PASO[llegada.siguiente]);
      return;
    }
    if (llegada.bienvenidaVista) {
      router.replace("/dashboard");
      return;
    }
    // Si falla, la bienvenida se ve igual: lo peor que pasa es verla otra vez.
    void configuracionService.marcarBienvenidaVista().catch(() => undefined);
  }, [llegada, router]);

  if (!mostrar) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return <Bienvenida pasos={llegada.pasos.filter((p) => p.estado === "LISTO").map((p) => p.nombre)} />;
}

/** El retardo de entrada de cada pieza, en milisegundos (LEEME §3). */
const retardo = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function Bienvenida({ pasos }: { pasos: string[] }) {
  const { data: empresa } = useQuery({
    queryKey: ["empresa", "actual"],
    queryFn: empresaApi.actual,
  });
  const { data: periodo } = useQuery({
    queryKey: ["periodos", "actual"],
    queryFn: periodosApi.actual,
  });

  const lineaEmpresa = [
    empresa?.razonSocial,
    empresa && `NIT ${conPuntos(empresa.nit)}${empresa.dv ? `-${empresa.dv}` : ""}`,
  ].filter(Boolean);
  const lineaPeriodo =
    periodo && periodo.estado === "ABIERTO"
      ? `período ${periodo.anio}-${String(periodo.mes).padStart(2, "0")} abierto`
      : null;

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-x-hidden bg-background px-6 pt-9 pb-7 text-foreground sm:pt-11">
      <div aria-hidden="true" className={`${styles.renglones} pointer-events-none absolute inset-0`} />
      <div
        aria-hidden="true"
        className={`${styles.halo} pointer-events-none absolute top-14 left-1/2 h-[420px] w-[470px] -translate-x-1/2 sm:top-[92px] sm:h-[560px] sm:w-[780px]`}
      />

      <div className={`${styles.sube} relative`} style={retardo(150)}>
        <Marca tamano={24} />
      </div>

      {/* María, tal cual la identidad: reposo, aura en calma, mirando
          alrededor despacio. 200 px en escritorio, 150 en el teléfono. */}
      <div
        aria-hidden="true"
        className="relative mt-2.5 flex size-[290px] items-center justify-center sm:mt-8 sm:size-[400px]"
      >
        <span
          className={`${styles.onda} absolute size-[150px] rounded-full border border-brand sm:size-[200px]`}
          style={retardo(700)}
        />
        <span
          className={`${styles.onda} absolute size-[150px] rounded-full border border-muted-foreground/50 sm:size-[200px]`}
          style={retardo(1100)}
        />
        <span className={`${styles.pop} relative`}>
          <Maria estado="reposo" intensidad="calma" tamano={200} recorre className="hidden sm:inline-block" />
          <Maria estado="reposo" intensidad="calma" tamano={150} recorre className="sm:hidden" />
        </span>
      </div>

      <div
        className={`${styles.sube} relative -mt-[54px] flex items-center gap-2 sm:-mt-[18px] sm:gap-[9px]`}
        style={retardo(1050)}
      >
        <span className="text-[17px] font-semibold tracking-[-0.02em] sm:text-[19px]">María</span>
        <span aria-hidden="true" className="size-[3px] rounded-full bg-brand" />
        <span className="font-mono text-[9.5px] tracking-[1.5px] text-muted-foreground uppercase sm:text-[10.5px] sm:tracking-[1.7px]">
          asistente<span className="hidden sm:inline"> del sistema</span>
        </span>
      </div>

      <h1
        className={`${styles.sube} relative m-0 mt-[18px] text-center text-[31px] leading-[1.12] font-semibold tracking-[-0.9px] sm:mt-6 sm:text-[46px] sm:leading-[1.1] sm:tracking-[-1.2px]`}
        style={retardo(1200)}
      >
        Ya quedó lista
        <br className="sm:hidden" /> tu contabilidad.
      </h1>

      {/* La frase es fija: es identidad, no contenido. No la escribe el modelo. */}
      <p
        className={`${styles.sube} relative m-0 mt-3.5 max-w-[540px] text-center text-[14.5px] leading-[1.55] text-muted-foreground sm:mt-[18px] sm:text-[17px] sm:leading-[1.6]`}
        style={retardo(1400)}
      >
        <span className="hidden sm:inline">
          Ya conozco tu empresa y tu plan de cuentas. Desde ahora tú facturas y yo voy detrás
          armando los asientos; lo que no me cuadre, te lo paso.
        </span>
        <span className="sm:hidden">
          Tú facturas y yo voy detrás armando los asientos. Lo que no me cuadre, te lo paso.
        </span>
      </p>

      {/* Lo que quedó: solo los pasos listos. Uno que no aplica no aparece, ni
          gris ni con advertencia: la lista dice lo que hay. */}
      <ul className="relative m-0 mt-6 flex list-none flex-wrap items-center justify-center gap-x-[18px] gap-y-2.5 p-0 sm:mt-9 sm:gap-x-0">
        {pasos.map((nombre, i) => (
          <li
            key={nombre}
            className={`${styles.sube} flex items-center gap-1.5 sm:gap-[7px] sm:before:mx-[11px] sm:before:h-[13px] sm:before:w-px sm:before:bg-border sm:first:before:hidden`}
            style={{ ...retardo(1750 + i * 90), animationDuration: "420ms" }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className={`${styles.marca} size-[13px] shrink-0 sm:size-3.5`}
              style={retardo(1790 + i * 90)}
            >
              <circle cx="8" cy="8" r="8" className="fill-success" />
              <path
                d="M4.8 8.3l2.1 2.1 4.3-4.6"
                fill="none"
                stroke="var(--neutral-0)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[12.5px] text-foreground/85 sm:text-[13.5px]">{nombre}</span>
          </li>
        ))}
      </ul>

      {lineaEmpresa.length > 0 && (
        <p
          className={`${styles.sube} relative m-0 mt-4 text-center font-mono text-[10.5px] leading-normal text-muted-foreground/80 sm:mt-3.5 sm:text-[11.5px]`}
          style={retardo(2260)}
        >
          {lineaEmpresa.join(" · ")}
          {lineaPeriodo && (
            <>
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> · </span>
              {lineaPeriodo}
            </>
          )}
        </p>
      )}

      {/* Neutro, no naranja: el naranja de esta vista es de María. */}
      <Link
        href="/dashboard"
        className={`${styles.sube} relative mt-[26px] inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[0.6rem] bg-primary px-7 text-[15px] font-medium text-primary-foreground no-underline sm:mt-[38px] sm:w-auto`}
        style={retardo(2420)}
      >
        Empezar a operar
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>

      <p
        className={`${styles.sube} relative m-0 mt-3 text-center text-[12.5px] text-muted-foreground/80 sm:mt-4 sm:text-[13px]`}
        style={retardo(2560)}
      >
        <span className="hidden sm:inline">
          Todo lo que quedó configurado se puede cambiar en Ajustes.
        </span>
        <span className="sm:hidden">Se puede cambiar todo en Ajustes.</span>
      </p>
    </main>
  );
}

/** `901234567` → `901.234.567`. */
function conPuntos(numero: string): string {
  return numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
