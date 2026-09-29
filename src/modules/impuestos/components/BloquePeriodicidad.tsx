"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { Bloque } from "@/modules/configuracion/components/Bloque";
import { impuestosApi } from "../services/impuestos.service";
import type { PeriodicidadIva } from "../types/impuestos.types";

const PERIODICIDADES: Array<{ id: PeriodicidadIva; nombre: string; detalle: string }> = [
  {
    id: "BIMESTRAL",
    nombre: "Bimestral",
    detalle: "Ingresos del año pasado de 92.000 UVT o más, o gran contribuyente.",
  },
  { id: "CUATRIMESTRAL", nombre: "Cuatrimestral", detalle: "Ingresos del año pasado por debajo de 92.000 UVT." },
];

/**
 * Configurar empresa → Impuestos → «Cada cuánto se declara» (lienzo 15). Lo
 * que el RUT no dice y cambia el calendario: la periodicidad del IVA. El
 * último dígito del NIT sale del NIT, sin el de verificación; la ReteICA, de
 * la ley de cada municipio.
 */
export function BloquePeriodicidad() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["impuestos", "configuracion"], queryFn: impuestosApi.configuracion });
  const guardar = useMutation({
    mutationFn: (p: PeriodicidadIva) => impuestosApi.guardarConfiguracion(p),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["impuestos"] });
      aviso.exito("Periodicidad guardada", "El calendario ya la tiene en cuenta.");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Bloque
      titulo="Cada cuánto se declara"
      descripcion="De aquí salen las fechas del calendario de Impuestos."
      pendiente={data?.responsableIva === true && data.periodicidadIva === null}
    >
      {data === undefined ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium">Retención en la fuente</p>
              <p className="rounded-xl bg-muted px-4 py-2.5 text-sm">
                {data.declaraRetencion ? "Mensual · formulario 350" : "No: el RUT no tiene la responsabilidad 07"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Sin operaciones sujetas a retención en el mes, no se presenta.</p>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Último dígito del NIT</p>
              <p className="rounded-xl bg-muted px-4 py-2.5 font-mono text-sm">
                {data.nit.slice(0, -1)}
                <span className="font-bold text-brand-text">{data.nit.slice(-1)}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Sin contar el dígito de verificación.</p>
            </div>
          </div>

          {data.responsableIva && (
            <div>
              <p className="mb-2 text-sm font-medium">IVA</p>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Periodicidad del IVA">
                {PERIODICIDADES.map((p) => {
                  const elegida = data.periodicidadIva === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={elegida}
                      disabled={guardar.isPending}
                      onClick={() => guardar.mutate(p.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                        elegida ? "border-foreground" : "border-border hover:bg-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                          elegida ? "border-foreground" : "border-muted-foreground",
                        )}
                      >
                        {elegida && <span className="size-2 rounded-full bg-foreground" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{p.nombre}</span>
                        <span className="block text-xs text-muted-foreground">{p.detalle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {data.reteica.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">ReteICA</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {data.reteica.map((m) => (
                  <li key={m.codigo} className="flex justify-between rounded-xl bg-muted px-4 py-2.5">
                    <span>{m.nombre}</span>
                    <span className="text-muted-foreground">{m.periodicidad.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted-foreground">La periodicidad la pone el acuerdo de cada municipio.</p>
            </div>
          )}
        </div>
      )}
    </Bloque>
  );
}
