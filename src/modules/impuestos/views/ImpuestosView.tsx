"use client";

import { useState } from "react";
import { Building2, CalendarDays, FileText, Percent, Receipt, Scale } from "lucide-react";

import { funcionActiva, type Funcion } from "@/core/config/funciones";
import { hoyEnColombia } from "@/lib/utils";
import { moverMes } from "@/modules/gastos/lib/mes";
import { RetencionesSeccion } from "@/modules/retenciones/views/RetencionesSeccion";
import { CalendarioTab } from "../components/CalendarioTab";
import { IcaTab } from "../components/IcaTab";
import { IvaTab } from "../components/IvaTab";
import { PagarDeclaracionDialog } from "../components/PagarDeclaracionDialog";
import { PresentarDialog } from "../components/PresentarDialog";
import { RentaTab } from "../components/RentaTab";
import { RetencionTab } from "../components/RetencionTab";
import { fechaCorta } from "../lib/impuestos";
import type { FilaCalendario } from "../types/impuestos.types";

export type Pestana = "calendario" | "retencion" | "iva" | "renta" | "ica" | "tarifas";

const PESTANAS: Array<{ id: Pestana; nombre: string; icono: typeof Percent; funcion?: Funcion }> = [
  { id: "calendario", nombre: "Calendario", icono: CalendarDays },
  { id: "retencion", nombre: "Retención (350)", icono: Percent },
  { id: "iva", nombre: "IVA (300)", icono: Receipt, funcion: "iva" },
  { id: "renta", nombre: "Renta (110)", icono: FileText, funcion: "renta" },
  { id: "ica", nombre: "ICA y ReteICA", icono: Building2, funcion: "ica" },
  { id: "tarifas", nombre: "Tarifas y terceros", icono: Scale },
];

/**
 * Contabilidad → Impuestos (Fase 1 de las pantallas complementarias): lo que
 * se le debe a la DIAN y al municipio, cuándo vence y en qué va cada
 * declaración. «Tarifas y terceros» es lo que antes era Retenciones (PC6).
 * Cada pestaña nueva va detrás de su interruptor.
 */
export function ImpuestosView({ inicial = "calendario" }: { inicial?: Pestana }) {
  const hoy = hoyEnColombia();
  const mesActual = hoy.slice(0, 7);
  const [pestana, setPestana] = useState<Pestana>(inicial);
  // El 350 que toca presentar es el del mes pasado.
  const [mes, setMes] = useState(moverMes(mesActual, -1));
  const [presentando, setPresentando] = useState<FilaCalendario | null>(null);
  const [pagando, setPagando] = useState<FilaCalendario | null>(null);
  const visibles = PESTANAS.filter((p) => p.funcion === undefined || funcionActiva(p.funcion));

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          <span className="size-2 rounded-full bg-brand" />
          Contabilidad / Impuestos · {fechaCorta(hoy)}
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Impuestos<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lo que se le debe a la DIAN y al municipio, cuándo vence y en qué va cada declaración.
        </p>
      </header>

      <nav
        className="mb-7 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:[grid-template-columns:var(--columnas)]"
        style={{ "--columnas": `repeat(${visibles.length}, minmax(0, 1fr))` } as React.CSSProperties}
      >
        {visibles.map(({ id, nombre, icono: Icono }) => (
          <button
            key={id}
            type="button"
            aria-current={pestana === id ? "page" : undefined}
            onClick={() => setPestana(id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              pestana === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {pestana === "calendario" && (
        <CalendarioTab
          onPresentar={setPresentando}
          onPagar={setPagando}
          onVerRetencion={(m) => {
            setMes(m);
            setPestana("retencion");
          }}
        />
      )}
      {pestana === "retencion" && (
        <RetencionTab mes={mes} onMes={setMes} mesMaximo={mesActual} onPresentar={setPresentando} onPagar={setPagando} />
      )}
      {pestana === "iva" && <IvaTab onPresentar={setPresentando} onPagar={setPagando} />}
      {pestana === "renta" && <RentaTab onPresentar={setPresentando} onPagar={setPagando} />}
      {pestana === "ica" && <IcaTab onPresentar={setPresentando} onPagar={setPagando} />}
      {pestana === "tarifas" && <RetencionesSeccion />}

      <PresentarDialog fila={presentando} onCerrar={() => setPresentando(null)} />
      <PagarDeclaracionDialog fila={pagando} onCerrar={() => setPagando(null)} />
    </div>
  );
}
