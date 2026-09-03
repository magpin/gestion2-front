"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Bloque } from "./Bloque";
import { useGuardar } from "../hooks/useGuardar";
import { legalApi } from "../services/nucleo.service";

/**
 * Las cuatro preguntas que ningún documento responde.
 *
 * El RUT dice si la empresa cobra IVA y la CIIU de qué son sus ingresos, pero
 * ningún papel dice si tiene empleados. Sin eso el plan de cuentas no puede
 * decidir entre proponer las quince cuentas de nómina o ninguna, y adivinar es
 * peor que preguntar.
 *
 * Cada respuesta dice cuántas cuentas agrega, porque esa es la única razón por
 * la que se pregunta. Sin ese número, cuatro casillas sueltas parecen un
 * formulario más.
 */
const PREGUNTAS = [
  {
    hecho: "TIENE_EMPLEADOS",
    pregunta: "¿Tiene empleados?",
    agrega: "15 cuentas de nómina, prestaciones y aportes",
  },
  {
    hecho: "TIENE_ACTIVOS_FIJOS",
    pregunta: "¿Tiene activos fijos?",
    agrega: "6 de equipos y su depreciación",
  },
  {
    hecho: "TIENE_CREDITO_BANCARIO",
    pregunta: "¿Tiene crédito bancario?",
    agrega: "2: la obligación y sus intereses",
  },
  {
    hecho: "MANEJA_CAJA_MENOR",
    pregunta: "¿Maneja caja menor?",
    agrega: "1: el fondo fijo",
  },
] as const;

export function HechosOperativos() {
  const { data: guardados, isLoading } = useQuery({
    queryKey: ["hechos-operativos"],
    queryFn: legalApi.hechosOperativos,
  });

  // Lo guardado manda mientras nadie toque nada; a partir del primer clic manda
  // lo que la persona está decidiendo. Derivarlo en vez de copiarlo con un
  // efecto evita el render en cascada de sincronizar dos fuentes del mismo dato.
  const [tocado, setTocado] = useState<string[] | null>(null);
  const elegidos = tocado ?? guardados ?? [];

  const guardar = useGuardar<string[]>({
    fn: (hechos) => legalApi.guardarHechosOperativos(hechos),
    exito: "Respuestas guardadas",
    invalidar: [["hechos-operativos"], ["plan-cuentas", "sugerencia"]],
    // Se suelta el estado local: a partir de acá vuelve a mandar lo guardado.
    alTerminar: () => setTocado(null),
  });

  const alternar = (hecho: string) =>
    setTocado(
      elegidos.includes(hecho)
        ? elegidos.filter((h) => h !== hecho)
        : [...elegidos, hecho],
    );

  const cambio =
    tocado !== null &&
    guardados !== undefined &&
    (tocado.length !== guardados.length ||
      tocado.some((h) => !guardados.includes(h)));

  return (
    <Bloque
      titulo="Sobre tu operación"
      descripcion="Cuatro respuestas que ningún documento trae. Deciden qué cuentas se te proponen abajo."
    >
      {isLoading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PREGUNTAS.map((p) => {
              const elegido = elegidos.includes(p.hecho);
              return (
                <button
                  key={p.hecho}
                  type="button"
                  onClick={() => alternar(p.hecho)}
                  aria-pressed={elegido}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    elegido
                      ? "border-input bg-muted"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
                      elegido
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {elegido && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold">
                      {p.pregunta}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      Agrega {p.agrega}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* El botón solo aparece cuando hay algo distinto que guardar: un botón
              siempre activo invita a apretarlo sin haber cambiado nada. */}
          {cambio && (
            <Button
              variant="outline"
              className="self-start"
              onClick={() => guardar.mutate(elegidos)}
              disabled={guardar.isPending}
            >
              {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar respuestas
            </Button>
          )}
        </>
      )}
    </Bloque>
  );
}
