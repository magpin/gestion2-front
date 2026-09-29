"use client";

import { useState } from "react";
import {
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GitCompareArrows,
  ListFilter,
} from "lucide-react";

import { usePrepararTesoreria } from "../hooks/usePrepararTesoreria";
import { ArqueoSeccion } from "./ArqueoSeccion";
import { ConciliacionSeccion } from "./ConciliacionSeccion";
import { CorteBancoSeccion } from "./CorteBancoSeccion";
import { ExtractosSeccion } from "./ExtractosSeccion";
import { ReglasExtractoSeccion } from "./ReglasExtractoSeccion";

type Seccion = "Arqueo" | "Corte diario" | "Extractos" | "Conciliación" | "Reglas";

const SECCIONES: Array<[Seccion, typeof ClipboardCheck]> = [
  ["Arqueo", ClipboardCheck],
  ["Corte diario", CalendarCheck],
  ["Extractos", FileText],
  ["Conciliación", GitCompareArrows],
  ["Reglas", ListFilter],
];

/**
 * Dinero → Control: la mitad de lo que era Tesorería que no mueve plata sino
 * que la cuadra. El arqueo venía de Caja; corte, extractos, conciliación y
 * reglas, de Bancos. Las mismas secciones, en una sola fila.
 */
export function ControlView() {
  usePrepararTesoreria();
  const [seccion, setSeccion] = useState<Seccion>("Arqueo");

  return (
    <div className="w-full">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          <span className="size-2 rounded-full bg-brand" />
          Dinero
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Control<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El cuadre de la plata: arqueo de cajas, corte diario, extractos y conciliación con el banco.
        </p>
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Arqueo" && <ArqueoSeccion />}
      {seccion === "Corte diario" && <CorteBancoSeccion />}
      {seccion === "Extractos" && <ExtractosSeccion />}
      {seccion === "Conciliación" && <ConciliacionSeccion />}
      {seccion === "Reglas" && <ReglasExtractoSeccion />}
    </div>
  );
}
