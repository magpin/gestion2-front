"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatFecha } from "@/lib/utils";

export type PresetRango = "hoy" | "mes" | "30d" | "90d" | "anio";

export interface Rango {
  desde: string;
  hasta: string;
}

const PRESETS: { id: PresetRango; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "mes", label: "Mes en curso" },
  { id: "30d", label: "Últimos 30 días" },
  { id: "90d", label: "Últimos 90 días" },
  { id: "anio", label: "Año en curso" },
];

// Reason: fechas en hora LOCAL para no correr un día en zonas UTC-negativas.
function iso(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** El inverso de `iso`. `new Date("2026-06-24")` se parsea en UTC y retrocede un día. */
function aFechaLocal(valor: string | undefined): Date | undefined {
  if (!valor) return undefined;
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return undefined;
  return new Date(anio, mes - 1, dia);
}

// Traduce un preset a un rango {desde, hasta} en formato ISO "YYYY-MM-DD".
export function rangoDePreset(preset: PresetRango): Rango {
  const hoy = new Date();
  const hasta = iso(hoy);
  switch (preset) {
    // Un solo día: `desde` y `hasta` en la misma fecha. Los filtros del backend
    // comparan contra `fecha::date`, así que el día entra completo.
    case "hoy":
      return { desde: hasta, hasta };
    case "30d":
      return { desde: iso(new Date(hoy.getTime() - 30 * 86_400_000)), hasta };
    case "90d":
      return { desde: iso(new Date(hoy.getTime() - 90 * 86_400_000)), hasta };
    case "anio":
      return { desde: iso(new Date(hoy.getFullYear(), 0, 1)), hasta };
    case "mes":
    default:
      return {
        desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        hasta,
      };
  }
}

/** Cómo se lee un rango de un vistazo: «20 ago 2026» si es un día, «a → b» si no. */
export function etiquetaDeRango({ desde, hasta }: Rango): string {
  return desde === hasta
    ? formatFecha(desde)
    : `${formatFecha(desde)} → ${formatFecha(hasta)}`;
}

/**
 * El filtro de fechas de los listados: un botón «Calendario» que abre UN mes en
 * modo rango, con los atajos al lado.
 *
 * Un solo calendario y no dos: el rango se arma con dos clics sobre el mismo
 * mes, y el navegador de meses alcanza para cruzar de un mes a otro. Dos
 * calendarios lado a lado ocupaban el doble para el mismo gesto.
 *
 * Los atajos no desaparecieron, se movieron adentro: como fila de pastillas
 * ocupaban el ancho de la pantalla para una decisión que se toma una vez.
 */
export function RangoSelector({
  rango,
  onRangoChange,
}: {
  rango: Rango;
  onRangoChange: (rango: Rango) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  /* Lo que está pintado en el calendario mientras se elige. Sin este borrador,
     el primer clic —que deja el rango a medias— ya dispararía la consulta. */
  const [borrador, setBorrador] = useState<DateRange | undefined>();

  const seleccion: DateRange | undefined = borrador ?? {
    from: aFechaLocal(rango.desde),
    to: aFechaLocal(rango.hasta),
  };

  // Cuál de los atajos describe el rango actual, si alguno. Se compara el rango
  // resuelto y no un id guardado: así el atajo se enciende también cuando las
  // fechas elegidas a mano coinciden con él.
  const presetActivo = useMemo(() => {
    return PRESETS.find((opcion) => {
      const candidato = rangoDePreset(opcion.id);
      return candidato.desde === rango.desde && candidato.hasta === rango.hasta;
    })?.id;
  }, [rango.desde, rango.hasta]);

  const cerrarCon = (nuevo: Rango) => {
    setBorrador(undefined);
    onRangoChange(nuevo);
    setAbierto(false);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Qué está filtrado ahora mismo. El botón dice siempre «Calendario», así
          que sin esto la pantalla no diría qué periodo está mirando. */}
      <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
        {etiquetaDeRango(rango)}
      </span>

      <Popover
        open={abierto}
        onOpenChange={(valor) => {
          setAbierto(valor);
          // Salir con el rango a medias no deja nada aplicado: se descarta.
          if (!valor) setBorrador(undefined);
        }}
      >
        {/* Sólido como «Cerrar caja» o «Nueva cotización»: es el gesto de la
            pantalla, no un control secundario, y en outline era el único botón
            claro de la fila. */}
        <PopoverTrigger
          render={
            <Button className="gap-2">
              <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
              Calendario
            </Button>
          }
        />

        <PopoverContent align="end" className="w-auto gap-0 p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="p-3">
              <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                {borrador?.from && !borrador.to
                  ? "Elija la fecha final"
                  : etiquetaDeRango(rango)}
              </p>

              <Calendar
                mode="range"
                locale={es}
                numberOfMonths={1}
                selected={seleccion}
                defaultMonth={aFechaLocal(rango.desde)}
                onSelect={(elegido) => {
                  setBorrador(elegido);
                  // Solo se aplica con las dos puntas puestas.
                  if (elegido?.from && elegido.to) {
                    cerrarCon({ desde: iso(elegido.from), hasta: iso(elegido.to) });
                  }
                }}
              />
            </div>

            <div className="flex flex-row flex-wrap gap-1 border-t border-border p-2 sm:w-44 sm:flex-col sm:flex-nowrap sm:border-t-0 sm:border-l">
              {PRESETS.map((opcion) => {
                const activo = opcion.id === presetActivo;
                return (
                  <button
                    key={opcion.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => cerrarCon(rangoDePreset(opcion.id))}
                    className={cn(
                      "rounded-md px-3 py-2 text-left text-sm transition-colors",
                      activo
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {opcion.label}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
