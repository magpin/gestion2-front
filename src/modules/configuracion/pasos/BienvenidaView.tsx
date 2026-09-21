"use client";

import Link from "next/link";
import { ArrowRight, Check, FileText, Loader2, Pencil } from "lucide-react";
import type { ReactNode } from "react";

import { Destello } from "@/modules/landing/components/Marca";
import { useAuthStore } from "@/core/store/authStore";
import { RUTA_MODO_IA } from "../components/AsistenteShell";
import { Recorrido } from "../components/Recorrido";
import { RUTA_PASO } from "../components/rutas";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useDisponible } from "../hooks/useModoIa";
import styles from "../asistente.module.css";

/**
 * La primera pantalla del asistente: elegir cómo llenarlo.
 *
 * Solo la ve quien no ha hecho nada. Quien ya empezó entra directo al paso que
 * sigue —volver a preguntar el modo a alguien que ya eligió es hacerle repetir
 * una decisión que ya tomó—, y por eso el enlace fijo de la barra lateral y el
 * «Continuar» del tablero no pasan por acá.
 *
 * Las dos tarjetas son **enlaces, no opciones de un formulario**. No hay que
 * elegir y después confirmar: un clic lleva al modo. Y ninguno de los dos es
 * irreversible, que es lo que dice la línea del final.
 */

const PUNTOS_IA = [
  "Tú solo subes el RUT, la Cámara de Comercio y la resolución DIAN",
  "Cada dato te dice de qué documento salió",
  "Revisas y confirmas antes de guardar",
];

const PUNTOS_MANUAL = [
  "Cinco formularios, en orden",
  "Pausa y vuelve cuando quieras",
  "Entra directo a cualquier paso",
];

const DOCUMENTOS = [
  "RUT actualizado",
  "Certificado de Cámara de Comercio",
  "Resolución de facturación DIAN",
];

export function BienvenidaView() {
  const { data, isLoading } = useEstadoConfiguracion();
  const { data: modoIa } = useDisponible();
  const empresas = useAuthStore((s) => s.empresas);
  const empresaId = useAuthStore((s) => s.empresaId);
  const empresa = empresas.find((e) => e.id === empresaId);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const rutaManual = data.siguiente ? RUTA_PASO[data.siguiente] : RUTA_PASO.EMPRESA;

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div
        className={`${styles.sombraTarjeta} mx-auto flex h-full max-h-[calc(100dvh-64px)] w-full max-w-[1240px] overflow-hidden rounded-[1.05rem] border border-border bg-card`}
      >
        {/* El riel va completo desde el primer momento: los cinco pasos en
            pendiente y 0 %. Enseñar el recorrido antes de empezar es la mitad
            de lo que esta pantalla hace. */}
        <Recorrido
          pasos={data.pasos}
          actual={null}
          completados={data.completados}
          porcentaje={data.porcentaje}
          razonSocial={empresa?.razonSocial ?? "Tu empresa"}
        />

        <section className="flex min-w-0 grow flex-col gap-9 overflow-y-auto px-6 pt-14 pb-10 sm:px-16">
          <div className={`${styles.up} flex flex-col gap-4`}>
            <span className="font-mono text-[11px] uppercase tracking-[1.2px] text-muted-foreground">
              Bienvenido · Configuración inicial
            </span>
            <h1 className="m-0 font-serif text-[clamp(2.25rem,4.5vw,3.375rem)] leading-[1.02] tracking-[-1.2px]">
              Antes de facturar, dejemos lista <span className="italic">tu empresa.</span>
            </h1>
            <p className="m-0 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">
              Son cinco pasos. Puedes llenarlos tú o dejar que la IA los complete a partir de
              tus documentos. En los dos casos, nada se guarda sin que lo confirmes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TarjetaModo
              oscura
              retraso={styles.d1}
              icono={<Destello size={22} className="text-brand" />}
              insignia="Recomendado"
              titulo="Con "
              tituloCursiva="IA"
              texto="Sube tus documentos. La IA lee, llena los pasos y te pregunta solo lo que los papeles no dicen."
              puntos={PUNTOS_IA}
              accion="Empezar con IA"
              href={RUTA_MODO_IA}
              /* La tarjeta se muestra siempre —es la mitad de la decisión que
                 esta pantalla explica— pero solo se puede apretar si el
                 servidor dice que el modo está disponible. Mientras se
                 pregunta, `undefined`: se queda deshabilitada, que es lo
                 conservador. */
              deshabilitado={modoIa !== true}
            />

            <TarjetaModo
              retraso={styles.d2}
              icono={<Pencil className="size-[22px] text-foreground" strokeWidth={1.6} />}
              titulo="A "
              tituloCursiva="mano"
              texto="Llena cada paso tú mismo, con los formularios de siempre. Ideal si ya tienes los datos a mano."
              puntos={PUNTOS_MANUAL}
              accion="Configurar a mano"
              href={rutaManual}
            />
          </div>

          <div className={`${styles.up} ${styles.d3} flex flex-col gap-3.5 border-t border-border pt-7`}>
            <span className="text-[15px] font-semibold">Conviene tener a mano</span>
            <div className="flex flex-wrap gap-2.5">
              {DOCUMENTOS.map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-2 rounded-md bg-background px-3 py-2 text-[13px]"
                >
                  <FileText className="size-[15px] shrink-0 text-muted-foreground" strokeWidth={1.8} />
                  {d}
                </span>
              ))}
            </div>
            <p className="m-0 text-[13px] text-muted-foreground">
              Puedes cambiar de modo cuando quieras. Lo que ya guardaste se conserva.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Una de las dos formas de llenar el asistente.
 *
 * La de IA va sobre riel con trama y la manual sobre tarjeta clara. No es
 * decoración: son dos caminos distintos, no dos variantes del mismo, y el peso
 * visual lo dice antes que la etiqueta "Recomendado".
 */
function TarjetaModo({
  oscura,
  retraso,
  icono,
  insignia,
  titulo,
  tituloCursiva,
  texto,
  puntos,
  accion,
  href,
  deshabilitado,
}: {
  oscura?: boolean;
  retraso: string;
  icono: ReactNode;
  insignia?: string;
  titulo: string;
  tituloCursiva: string;
  texto: string;
  puntos: string[];
  accion: string;
  href: string;
  deshabilitado?: boolean;
}) {
  const cuerpoBoton = (
    <>
      {deshabilitado ? "Disponible pronto" : accion}
      <ArrowRight className="size-[15px] shrink-0" />
    </>
  );

  const clasesBoton = `mt-auto flex h-12 items-center justify-between rounded-[0.6rem] px-5 text-[15px] font-medium no-underline ${
    oscura
      ? "bg-rail-foreground text-rail"
      : "border border-input bg-card text-foreground hover:bg-secondary"
  } ${deshabilitado ? "cursor-not-allowed opacity-50" : ""}`;

  return (
    <article
      className={`${styles.up} ${retraso} ${oscura ? styles.trama : "border border-border bg-card"} flex flex-col gap-4.5 rounded-[1.05rem] p-7 ${
        oscura ? "text-rail-foreground" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex size-11 items-center justify-center rounded-[0.6rem] ${
            oscura ? "bg-rail-foreground/8" : "bg-secondary"
          }`}
        >
          {icono}
        </span>
        {insignia && (
          <span className="rounded-full border border-muted-foreground px-2.5 py-1 text-xs font-medium text-secondary">
            {insignia}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.05]">
          {titulo}
          <span className="italic">{tituloCursiva}</span>
        </h2>
        <p
          className={`m-0 text-sm leading-[1.55] ${
            oscura ? "text-rail-muted" : "text-muted-foreground"
          }`}
        >
          {texto}
        </p>
      </div>

      <ul
        className={`m-0 flex list-none flex-col gap-2.5 border-t p-0 pt-4 text-sm leading-normal ${
          oscura ? "border-rail-line text-secondary" : "border-border"
        }`}
      >
        {puntos.map((p) => (
          <li key={p} className="flex gap-2.5">
            <Check
              className={`mt-0.5 size-4 shrink-0 ${oscura ? "text-rail-foreground" : "text-foreground"}`}
              strokeWidth={2.2}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      {deshabilitado ? (
        <span className={clasesBoton} aria-disabled="true">
          {cuerpoBoton}
        </span>
      ) : (
        <Link href={href} className={clasesBoton}>
          {cuerpoBoton}
        </Link>
      )}
    </article>
  );
}
