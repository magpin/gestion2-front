"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, ChevronLeft, ChevronRight, FileChartColumn, FileSpreadsheet, FileText, Loader2, Printer, Scale } from "lucide-react";

import { AccionesDropdown } from "@/components/shared/AccionesDropdown";
import { SelectField } from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { mesDeHoy, moverMes, nombreMes } from "@/modules/gastos/lib/mes";
import { BalanceGeneralTab } from "../components/BalanceGeneralTab";
import { EstadoPeriodo } from "../components/Comun";
import { EstadoResultadosTab } from "../components/EstadoResultadosTab";
import { FlujoCajaTab, type VistaFlujo } from "../components/FlujoCajaTab";
import { opcionesComparar } from "../lib/estados";
import { estadosApi } from "../services/estados.service";
import type { FormatoEstado, TipoEstado } from "../types/estados.types";

type Estado = "balance" | "resultados" | "flujo";

const ESTADOS: Array<{ id: Estado; nombre: string; icono: typeof Scale; tipo: TipoEstado }> = [
  { id: "balance", nombre: "Balance general", icono: Scale, tipo: "BALANCE" },
  { id: "resultados", nombre: "Estado de resultados", icono: FileChartColumn, tipo: "RESULTADOS" },
  { id: "flujo", nombre: "Flujo de caja", icono: Banknote, tipo: "FLUJO" },
];

/**
 * Análisis → Estados financieros: balance general, estado de resultados y
 * flujo de caja, al corte del mes que se elija.
 *
 * No guardan nada propio: salen del libro —las líneas de asiento
 * registradas—, así que cuadran con el balance de prueba. El PDF y el Excel
 * los arma el servidor, con el membrete, y quedan en las corridas de reportes.
 */
export function EstadosFinancierosView() {
  const [estado, setEstado] = useState<Estado>("resultados");
  const [mes, setMes] = useState(mesDeHoy());
  // «Comparar con» sigue al mes: por defecto, el anterior. `null` es «sin comparar».
  const [comparar, setComparar] = useState<string | null>(moverMes(mesDeHoy(), -1));
  const [vistaFlujo, setVistaFlujo] = useState<VistaFlujo>("real");
  const [bajando, setBajando] = useState(false);

  const cambiarMes = (nuevo: string) => {
    if (comparar !== null) setComparar(moverMes(nuevo, -1));
    setMes(nuevo);
  };
  const tipo = ESTADOS.find((e) => e.id === estado)!.tipo;
  const conComparar = estado !== "flujo";
  const conMes = estado !== "flujo" || vistaFlujo === "real";

  const descargar = async (formato: FormatoEstado) => {
    setBajando(true);
    try {
      await estadosApi.descargar(tipo, formato, mes, conComparar ? (comparar ?? undefined) : undefined);
    } catch (e) {
      aviso.falla(e, "cargar");
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="w-full">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Análisis
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Estados financieros<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Balance general, estado de resultados y flujo de caja, al corte que elijás. Salen del libro.
          </p>
        </div>
        <AccionesDropdown
          align="end"
          trigger={
            <Button variant="outline" className="h-12 gap-2 rounded-xl px-5 font-semibold" disabled={bajando}>
              {bajando ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Imprimir o descargar
            </Button>
          }
          acciones={[
            { label: "PDF, para imprimir", icon: FileText, onSelect: () => void descargar("PDF") },
            { label: "Excel", icon: FileSpreadsheet, onSelect: () => void descargar("XLSX") },
          ]}
        />
      </header>

      <nav className="mb-6 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:grid-cols-3">
        {ESTADOS.map(({ id, nombre, icono: Icono }) => (
          <button
            key={id}
            type="button"
            aria-current={estado === id ? "page" : undefined}
            onClick={() => setEstado(id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              estado === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {estado === "flujo" && (
            <div className="flex gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
              {(
                [
                  ["real", "Del mes"],
                  ["proyectado", "Próximas semanas"],
                ] as const
              ).map(([id, nombre]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={vistaFlujo === id}
                  onClick={() => setVistaFlujo(id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    vistaFlujo === id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {nombre}
                </button>
              ))}
            </div>
          )}
          {conMes && (
            <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
              <Button type="button" variant="ghost" className="size-9 rounded-xl p-0" aria-label="Mes anterior" onClick={() => cambiarMes(moverMes(mes, -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-40 text-center text-sm font-semibold">{nombreMes(mes)}</span>
              <Button
                type="button"
                variant="ghost"
                className="size-9 rounded-xl p-0"
                aria-label="Mes siguiente"
                disabled={mes >= mesDeHoy()}
                onClick={() => cambiarMes(moverMes(mes, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
          {conComparar && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Comparar con</span>
              <div className="w-60">
                <SelectField
                  value={comparar ?? ""}
                  onChange={(v) => setComparar(v === "" ? null : v)}
                  options={opcionesComparar(mes)}
                />
              </div>
            </div>
          )}
        </div>
        {conMes && <PeriodoDelMes mes={mes} />}
      </div>

      {estado === "resultados" && <EstadoResultadosTab mes={mes} comparar={comparar ?? undefined} />}
      {estado === "balance" && <BalanceGeneralTab mes={mes} comparar={comparar ?? undefined} />}
      {estado === "flujo" && <FlujoCajaTab mes={mes} vista={vistaFlujo} />}
    </div>
  );
}

/**
 * Si el período está abierto o cerrado y cuántos asientos tiene. Lo trae la
 * misma consulta del flujo —la más liviana de las tres— y React Query la
 * comparte con la pestaña cuando está abierta.
 */
function PeriodoDelMes({ mes }: { mes: string }) {
  const { data } = useQuery({
    queryKey: ["estados-financieros", "flujo", mes],
    queryFn: () => estadosApi.flujo(mes),
  });
  return data ? <EstadoPeriodo periodo={data.periodo} /> : null;
}
