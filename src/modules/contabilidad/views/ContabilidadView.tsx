"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  FileText,
  Percent,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { FormularioAsiento } from "../components/FormularioAsiento";
import { periodosApi } from "../services/contabilidad.service";
import { AsientosSeccion } from "./AsientosSeccion";
import { RetencionesSeccion } from "@/modules/retenciones/views/RetencionesSeccion";
import { LibrosSeccion } from "./LibrosSeccion";
import { PeriodosSeccion } from "./PeriodosSeccion";

type Seccion = "Asientos" | "Períodos" | "Libros" | "Retenciones";

const SECCIONES: Array<[Seccion, typeof FileText]> = [
  ["Asientos", FileText],
  ["Períodos", CalendarDays],
  ["Libros", BookOpen],
  ["Retenciones", Percent],
];

/**
 * El libro contable.
 *
 * Tres secciones en una sola ruta y no tres rutas: son tres vistas del mismo
 * material, y quien lleva la contabilidad salta entre ellas todo el día —registra
 * un asiento, revisa el mayor, vuelve a registrar—. Separarlas en rutas agrega
 * una navegación completa a cada salto.
 */
export function ContabilidadView() {
  // Solo el contador escribe asientos manuales (`@Roles('CONTADOR')` en el
  // backend). Mostrarle el botón a un director es una puerta cerrada.
  const puedeAsentar = useTieneRol("CONTADOR");
  const [seccion, setSeccion] = useState<Seccion>("Asientos");
  const [creando, setCreando] = useState(false);

  // El año del período abierto, no el del reloj: una empresa que todavía está
  // cerrando diciembre no trabaja en el año que dice el calendario.
  const { data: actual } = useQuery({
    queryKey: ["periodos", "actual"],
    queryFn: periodosApi.actual,
  });

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Contabilidad / {actual?.anio ?? new Date().getFullYear()}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Contabilidad<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registra, revisa y cierra la historia financiera de tu empresa.
          </p>
        </div>

        {puedeAsentar && (
          <Button
            onClick={() => setCreando(true)}
            className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
              <Plus className="size-4" />
            </span>
            Nuevo asiento
          </Button>
        )}
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
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

      {seccion === "Asientos" && <AsientosSeccion />}
      {seccion === "Períodos" && <PeriodosSeccion />}
      {seccion === "Libros" && <LibrosSeccion />}
      {seccion === "Retenciones" && <RetencionesSeccion />}

      {/* La regla que explica por qué no hay botón de editar en ninguna fila. */}
      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
        <ShieldCheck className="size-3.5 text-success" />
        Los asientos registrados son inmutables. Para corregirlos, crea un
        contra-asiento.
      </p>

      {/* El botón del encabezado abre el mismo formulario desde cualquier
          sección: registrar un asiento es la acción de la pantalla entera, no
          solo de la lista. */}
      <FormularioAsiento
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onCreado={() => setSeccion("Asientos")}
      />
    </div>
  );
}
