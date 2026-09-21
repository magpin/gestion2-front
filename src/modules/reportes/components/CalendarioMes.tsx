"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { nombreMes } from "../lib/fechas";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const dos = (n: number) => String(n).padStart(2, "0");

/**
 * Un mes para elegir un día, de lunes a domingo.
 *
 * Los días posteriores a `maximo` no se pueden elegir: una cartera «al 30 de
 * octubre» pedida el 21 de septiembre sería la de hoy con otra fecha impresa.
 */
export function CalendarioMes({
  valor,
  maximo,
  onElegir,
}: {
  valor: string | null;
  maximo: string;
  onElegir: (iso: string) => void;
}) {
  const base = valor ?? maximo;
  const [mostrado, setMostrado] = useState(() => {
    const [a, m] = base.split("-").map(Number);
    return { anio: a, mes: m };
  });
  const { anio, mes } = mostrado;

  const primero = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();
  const huecos = (primero + 6) % 7; // lunes = 0
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const [ma, mm] = maximo.split("-").map(Number);
  const hayMesSiguiente = anio < ma || (anio === ma && mes < mm);

  const mover = (delta: number) =>
    setMostrado(({ anio: a, mes: m }) => {
      const total = a * 12 + (m - 1) + delta;
      return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
    });

  const titulo = `${nombreMes(mes)[0].toUpperCase()}${nombreMes(mes).slice(1)} ${anio}`;

  return (
    <div className="flex flex-col gap-1.5 rounded-[0.6rem] border border-border p-2.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => mover(-1)}
          className="inline-flex size-[26px] items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
        <span className="text-xs font-semibold" aria-live="polite">
          {titulo}
        </span>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => mover(1)}
          disabled={!hayMesSiguiente}
          className="inline-flex size-[26px] items-center justify-center rounded-md hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {DIAS.map((d, i) => (
          <span key={i} className="text-center font-mono text-[10px] text-muted-foreground">
            {d}
          </span>
        ))}
        {Array.from({ length: huecos }, (_, i) => (
          <span key={`h${i}`} />
        ))}
        {Array.from({ length: dias }, (_, i) => {
          const dia = i + 1;
          const iso = `${anio}-${dos(mes)}-${dos(dia)}`;
          const elegido = iso === valor;
          return (
            <button
              key={iso}
              type="button"
              aria-label={`${dia} de ${nombreMes(mes)}`}
              aria-pressed={elegido}
              disabled={iso > maximo}
              onClick={() => onElegir(iso)}
              className={`h-[30px] rounded-[0.4rem] font-mono text-xs disabled:opacity-30 ${
                elegido
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
