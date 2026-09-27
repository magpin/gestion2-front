"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * «Pantallas del sistema»: capturas tomadas del sistema en QA, con los datos de
 * la empresa cambiados por datos de ejemplo (razón social, NIT, personas,
 * proveedor y números).
 *
 * Cada una se abre en grande con un clic, con flechas para pasar a la
 * siguiente. El diálogo se cierra con la ✕ o con Esc, no tocando afuera, como
 * todos los del sistema.
 *
 * Scroll-snap en CSS; los botones ‹ › solo en pantallas anchas, y se apagan en
 * los extremos. En el celular cada tarjeta ocupa el 82 % y el carrusel va de
 * borde a borde.
 */
const PANTALLAS = [
  {
    src: "/landing/pantalla-chat.png",
    titulo: "Preguntale a María",
    texto: "Responde con el dato exacto y dice de dónde salió.",
  },
  {
    src: "/landing/pantalla-asiento.png",
    titulo: "Cada asiento, rastreado",
    texto: "Propuesto por María, aprobado por una persona, con su soporte y su huella.",
  },
  {
    src: "/landing/pantalla-config.png",
    titulo: "Configuración en seis pasos",
    texto: "A mano, o que María la llene con tu RUT.",
  },
  {
    src: "/landing/pantalla-inicio.png",
    titulo: "María esta semana",
    texto: "Lo que leyó, lo que aprobaste y lo que espera tu revisión.",
  },
  {
    src: "/landing/pantalla-reportes.png",
    titulo: "Reportes",
    texto: "En pantalla, tal como salen impresos.",
  },
];

export function CarruselPantallas() {
  const pista = useRef<HTMLUListElement>(null);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const ampliada = abierta === null ? null : PANTALLAS[abierta]!;
  const pasar = (sentido: 1 | -1) =>
    setAbierta((i) => (i === null ? i : (i + sentido + PANTALLAS.length) % PANTALLAS.length));

  const actualizar = () => {
    const el = pista.current;
    if (!el) return;
    setAlInicio(el.scrollLeft <= 4);
    setAlFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    actualizar();
    window.addEventListener("resize", actualizar);
    return () => window.removeEventListener("resize", actualizar);
  }, []);

  const mover = (sentido: 1 | -1) => {
    const el = pista.current;
    const item = el?.querySelector("li");
    if (!el || !item) return;
    el.scrollBy({ left: sentido * (item.clientWidth + 16), behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 font-mono text-xs tracking-[1.2px] text-rail-muted uppercase">
          <span className="h-0.5 w-3.5 bg-brand" />
          Pantallas del sistema
        </span>
        <div className="hidden gap-2 sm:flex">
          {([-1, 1] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => mover(s)}
              disabled={s === -1 ? alInicio : alFinal}
              aria-label={s === -1 ? "Pantalla anterior" : "Pantalla siguiente"}
              className="flex size-9 items-center justify-center rounded-full border border-rail-line text-rail-foreground transition-opacity hover:bg-rail-foreground/10 disabled:opacity-30"
            >
              {s === -1 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ))}
        </div>
      </div>

      <ul
        ref={pista}
        onScroll={actualizar}
        className="-mx-6 grid list-none auto-cols-[82%] grid-flow-col gap-4 overflow-x-auto scroll-smooth scroll-px-6 px-6 pb-2 sm:scroll-px-0 [scrollbar-width:none] snap-x snap-mandatory sm:mx-0 sm:auto-cols-[minmax(260px,320px)] sm:px-0"
      >
        {PANTALLAS.map(({ src, titulo, texto }, i) => (
          <li key={src} className="flex snap-start flex-col gap-3">
            <button
              type="button"
              onClick={() => setAbierta(i)}
              aria-label={`Ver en grande: ${titulo}`}
              className="group relative block cursor-zoom-in overflow-hidden rounded-lg border border-rail-line focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <Image
                src={src}
                alt={`Pantalla del sistema: ${titulo}`}
                width={1600}
                height={1000}
                sizes="(max-width: 640px) 82vw, 320px"
                className="aspect-[16/10] h-auto w-full object-cover object-top-left transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-rail/80 text-rail-foreground opacity-80 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <Maximize2 className="size-3.5" aria-hidden="true" />
              </span>
            </button>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-rail-foreground">{titulo}</span>
              <span className="text-[13px] leading-snug text-rail-muted">{texto}</span>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={ampliada !== null} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        <DialogContent
          size="xl"
          className="gap-0 p-0"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") pasar(1);
            if (e.key === "ArrowLeft") pasar(-1);
          }}
        >
          {ampliada && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <DialogTitle className="text-lg">{ampliada.titulo}</DialogTitle>
                  <DialogDescription className="text-[13px] text-muted-foreground">
                    {ampliada.texto} · Datos de ejemplo.
                  </DialogDescription>
                </div>
                <DialogCloseIcon />
              </div>
              <div className="min-h-0 overflow-auto bg-secondary">
                <Image
                  src={ampliada.src}
                  alt={`Pantalla del sistema: ${ampliada.titulo}`}
                  width={1600}
                  height={1000}
                  sizes="(max-width: 1100px) 100vw, 1024px"
                  className="h-auto w-full"
                  priority
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => pasar(-1)}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-secondary"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Anterior
                </button>
                <span className="font-mono text-xs text-muted-foreground">
                  {abierta! + 1} de {PANTALLAS.length}
                </span>
                <button
                  type="button"
                  onClick={() => pasar(1)}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-secondary"
                >
                  Siguiente
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
