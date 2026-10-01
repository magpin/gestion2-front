"use client";

import { useEffect, useRef, useState } from "react";

import type { EstadoMaria } from "@/modules/asistente/components/Maria";
import { Maria } from "@/modules/asistente/components/Maria";
import { Rotulo, TituloSeccion } from "./Marca";
import styles from "../landing.module.css";

/**
 * «01 — Conocé a María»: cuatro pasos atados al scroll.
 *
 * A la izquierda, un escenario fijo con María; a la derecha, los pasos. El que
 * cruza el centro de la pantalla es el activo, y María cambia a su estado:
 * reposo → leyendo (con la cuenta «Van n de 12») → trabajando → te toca a vos.
 * En el celular el escenario es una tarjeta horizontal pegada arriba.
 *
 * Los estados y las frases son las del producto: María no registra, propone;
 * lo que aparta llega con la razón.
 */
interface Paso {
  titulo: string;
  texto: string;
  estado: EstadoMaria;
  chip: string;
  tono: "neutro" | "ambar";
  mensaje: string;
  meta?: string;
}

const PASOS: Paso[] = [
  {
    titulo: "Recibe",
    texto:
      "Facturas de compra, cuentas de cobro y pedidos de sus clientes, en PDF o foto. Usted se los entrega en el chat, uno o varios a la vez.",
    estado: "reposo",
    chip: "En reposo",
    tono: "neutro",
    mensaje:
      "Súbame las facturas y yo las leo; le pregunto solo lo que los papeles no dicen.",
  },
  {
    titulo: "Lee",
    texto:
      "Lee cada documento y le muestra el avance real: cuántos lleva y cuántos faltan. Nada de ruedas girando sin fin.",
    estado: "leyendo",
    chip: "Leyendo",
    tono: "neutro",
    mensaje: "Estoy leyendo las 12 facturas…",
  },
  {
    titulo: "Propone",
    texto:
      "Cruza cada renglón con su catálogo, comprueba que las sumas cuadren y le deja la factura lista, con su soporte. Lo que no sabe, se lo pregunta.",
    estado: "trabajando",
    chip: "Trabajando",
    tono: "neutro",
    mensaje: "9 están listas para que las apruebe. Aparté 3 que necesitan que usted decida algo.",
    meta: "9 listas · 3 apartadas",
  },
  {
    titulo: "Usted aprueba",
    texto:
      "Lo que aparta llega con la razón escrita; lo listo usted lo aprueba con un clic. Nada entra a sus libros sin su visto bueno.",
    estado: "espera",
    chip: "Le toca a usted",
    tono: "ambar",
    mensaje:
      "La FT-9012 parece repetida: ya hay una igual registrada el 2 sep. No la registro hasta que usted me indique.",
    meta: "3 esperan su revisión",
  },
];

const TOTAL = 12;

export function ConoceAMaria() {
  const [activo, setActivo] = useState(0);
  const [leidas, setLeidas] = useState(0);
  const pasos = useRef<Array<HTMLLIElement | null>>([]);

  // El paso que cruza la franja central de la pantalla es el activo.
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setActivo(Number((e.target as HTMLElement).dataset.paso));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of pasos.current) if (el) observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // «Van n de 12»: la cuenta corre mientras el paso «Lee» está activo, y
  // arranca de cero cada vez que se vuelve a él.
  useEffect(() => {
    if (activo !== 1) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let n = reducido ? TOTAL : 0;
    const primero = setTimeout(() => setLeidas(n), 0);
    if (reducido) return () => clearTimeout(primero);
    const reloj = setInterval(() => {
      n = Math.min(TOTAL, n + 1);
      setLeidas(n);
      if (n === TOTAL) clearInterval(reloj);
    }, 230);
    return () => {
      clearTimeout(primero);
      clearInterval(reloj);
    };
  }, [activo]);

  const paso = PASOS[activo]!;
  const leyendo = paso.estado === "leyendo";
  const mensaje =
    leyendo && leidas === TOTAL ? "Leí las 12. Ahora las reviso." : paso.mensaje;
  const meta = leyendo ? `Van ${leidas} de ${TOTAL}` : paso.meta;
  const progreso = leyendo ? leidas / TOTAL : undefined;

  const chip = (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${
        paso.tono === "ambar"
          ? "border-warning/40 bg-warning/10 text-foreground"
          : "border-border bg-secondary text-foreground"
      }`}
    >
      {paso.chip}
    </span>
  );

  return (
    <section id="como" className={`${styles.ancla} border-b border-border bg-card py-18 sm:py-24 lg:py-32`}>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-10 px-6 lg:gap-16">
        <div className={`${styles.rv} flex max-w-[760px] flex-col gap-4.5`}>
          <Rotulo>01 — Conozca a María</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
            María hace la digitación. <span className="italic">Usted, el último paso.</span>
          </TituloSeccion>
          <p className="m-0 max-w-[620px] text-[17px] leading-relaxed text-muted-foreground">
            Es la asistente de IA del sistema. Habla como una colega: breve, con su vocabulario
            contable, y pregunta cuando algo no está en el papel.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-20">
          {/* El escenario. Escritorio: columna fija centrada. Celular: tarjeta
              horizontal pegada arriba mientras se recorren los pasos. */}
          <div className="sticky top-3 z-10 self-start lg:top-8" aria-live="polite">
            <div className="hidden flex-col items-center gap-3 rounded-[1.05rem] border border-border bg-background px-8 py-12 text-center lg:flex">
              <div className="flex h-[260px] items-center justify-center">
                <Maria estado={paso.estado} tamano={128} progreso={progreso} />
              </div>
              <span className="text-lg font-semibold">María</span>
              <span className="text-xs text-muted-foreground">
                Asistente de IA · nada se asienta sin su aprobación
              </span>
              {chip}
              <p className="m-0 mt-2 max-w-[380px] rounded-xl border border-border bg-card px-5 py-3 text-[15px] leading-relaxed">
                {mensaje}
              </p>
              <span className="min-h-4 font-mono text-xs text-muted-foreground">{meta}</span>
            </div>

            <div
              className={`${styles.sombraTarjeta} flex items-center gap-4 rounded-[1.05rem] border border-border bg-card px-4 py-3.5 lg:hidden`}
            >
              <Maria estado={paso.estado} tamano={52} progreso={progreso} className="m-1.5" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  {chip}
                  {meta && (
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {meta}
                    </span>
                  )}
                </div>
                <p className="m-0 text-[13px] leading-snug">{mensaje}</p>
              </div>
            </div>
          </div>

          <ol className="m-0 flex list-none flex-col p-0">
            {PASOS.map((p, i) => {
              const esActivo = i === activo;
              const esUltimo = i === PASOS.length - 1;
              return (
                <li
                  key={p.titulo}
                  data-paso={i}
                  ref={(el) => {
                    pasos.current[i] = el;
                  }}
                  className="flex min-h-[46vh] flex-col justify-center gap-3 lg:min-h-[62vh]"
                >
                  <div
                    className={`h-0.5 transition-colors duration-500 ${
                      esActivo ? (esUltimo ? "bg-brand" : "bg-foreground") : "bg-border"
                    }`}
                  />
                  <span
                    className={`font-serif text-[52px] leading-none italic transition-colors duration-500 ${
                      esActivo ? (esUltimo ? "text-brand-text" : "text-foreground") : "text-input"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className={`m-0 text-[22px] font-semibold tracking-[-0.4px] transition-colors duration-500 ${
                      esActivo ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {p.titulo}
                  </h3>
                  <p className="m-0 max-w-[440px] text-base leading-relaxed text-muted-foreground">
                    {p.texto}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
