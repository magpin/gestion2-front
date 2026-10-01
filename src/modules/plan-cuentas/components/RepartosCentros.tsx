"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Power, X } from "lucide-react";

import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccionesDropdown } from "@/components/shared/AccionesDropdown";
import { FormDialog } from "@/components/shared/FormDialog";
import { Campo } from "@/modules/configuracion/components/Campo";
import { planCuentasApi } from "../services/plan-cuentas.service";
import type { CentroCosto, Reparto } from "../types/plan-cuentas.types";
import { CLAVE_REPARTOS, SelectorCentroCosto } from "./SelectorCentroCosto";

interface Parte {
  clave: number;
  centro: string | null;
  porcentaje: string;
}

let siguiente = 1;
const parteVacia = (): Parte => ({ clave: siguiente++, centro: null, porcentaje: "" });

/** La suma de los porcentajes, con cuatro decimales. */
export function sumaPorcentajes(partes: Array<{ porcentaje: string }>): number {
  return Math.round(partes.reduce((s, p) => s + (Number(p.porcentaje) || 0), 0) * 10000) / 10000;
}

/**
 * Los repartos de la empresa: un gasto común (el arriendo, la vigilancia)
 * entre varios centros por porcentajes. Al registrar un gasto se elige
 * «Repartir con…» y el renglón se parte en uno por centro.
 */
export function RepartosCentros({ centros }: { centros: CentroCosto[] }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Reparto | "nuevo" | null>(null);
  const { data: repartos = [] } = useQuery({
    queryKey: CLAVE_REPARTOS,
    queryFn: planCuentasApi.repartos,
  });

  const activar = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => planCuentasApi.fijarRepartoActivo(id, activo),
    onSuccess: async (_, { activo }) => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_REPARTOS });
      aviso.exito(activo ? "Reparto activado" : "Reparto desactivado");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <h3 className="text-sm font-semibold">Repartos</h3>
          <p className="text-xs text-muted-foreground">
            Un gasto común entre varios centros: el arriendo 60 % Norte y 40 % Sur. Anote con qué base
            se calcularon los porcentajes (metros, empleados) para poder justificarlos.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditando("nuevo")} disabled={centros.length < 2}>
          <Plus className="size-4" />
          Nuevo reparto
        </Button>
      </div>

      {repartos.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {repartos.map((r) => (
            <li key={r.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm", !r.activo && "text-muted-foreground")}>
              <span className="min-w-40 font-medium">{r.nombre}</span>
              <span className="flex-1 text-xs text-muted-foreground">
                {r.partes.map((p) => `${p.centroNombre} ${p.porcentaje} %`).join(" · ")}
                {r.base && ` — ${r.base}`}
              </span>
              {!r.activo && <span className="text-xs">Desactivado</span>}
              <AccionesDropdown
                acciones={[
                  { label: "Editar", icon: Pencil, onSelect: () => setEditando(r) },
                  {
                    label: r.activo ? "Desactivar" : "Reactivar",
                    icon: Power,
                    separadorAntes: true,
                    variant: r.activo ? ("destructive" as const) : undefined,
                    onSelect: () => activar.mutate({ id: r.id, activo: !r.activo }),
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      {editando !== null && (
        <DialogoReparto
          reparto={editando === "nuevo" ? null : editando}
          centros={centros}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function DialogoReparto({
  reparto,
  centros,
  onCerrar,
}: {
  reparto: Reparto | null;
  centros: CentroCosto[];
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(reparto?.nombre ?? "");
  const [base, setBase] = useState(reparto?.base ?? "");
  const [partes, setPartes] = useState<Parte[]>(() =>
    reparto
      ? reparto.partes.map((p) => ({ clave: siguiente++, centro: p.centroCostoId, porcentaje: String(p.porcentaje) }))
      : [parteVacia(), parteVacia()],
  );

  const suma = sumaPorcentajes(partes);
  const problema =
    nombre.trim().length < 2
      ? "Póngale un nombre al reparto."
      : partes.length < 2
        ? "Un reparto va entre al menos dos centros."
        : partes.some((p) => p.centro === null)
          ? "Elija el centro de cada parte."
          : partes.some((p) => !(Number(p.porcentaje) > 0))
            ? "Cada parte lleva un porcentaje mayor que cero."
            : new Set(partes.map((p) => p.centro)).size !== partes.length
              ? "Un centro aparece dos veces: sume sus porcentajes en uno."
              : Math.abs(suma - 100) >= 0.001
                ? `Los porcentajes suman ${suma} %: tienen que sumar 100 %.`
                : null;

  const guardar = useMutation({
    mutationFn: () => {
      const datos = {
        nombre: nombre.trim(),
        ...(base.trim() !== "" && { base: base.trim() }),
        partes: partes.map((p) => ({ centroCostoId: p.centro!, porcentaje: Number(p.porcentaje) })),
      };
      return reparto ? planCuentasApi.editarReparto(reparto.id, datos) : planCuentasApi.crearReparto(datos);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_REPARTOS });
      aviso.exito(reparto ? "Reparto guardado" : "Reparto creado");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const cambiar = (clave: number, cambio: Partial<Parte>) =>
    setPartes((ps) => ps.map((p) => (p.clave === clave ? { ...p, ...cambio } : p)));

  return (
    <FormDialog open onOpenChange={(a) => !a && onCerrar()} titulo={reparto ? `Editar ${reparto.nombre}` : "Nuevo reparto"} ancho={620}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (problema === null) guardar.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="repartoNombre" etiqueta="Nombre">
            <Input id="repartoNombre" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Arriendo del local" />
          </Campo>
          <Campo id="repartoBase" etiqueta="Base (opcional)">
            <Input id="repartoBase" maxLength={200} value={base} onChange={(e) => setBase(e.target.value)} placeholder="Por metros cuadrados" />
          </Campo>
        </div>

        <div className="flex flex-col gap-2">
          {partes.map((p, i) => (
            <div key={p.clave} className="grid items-center gap-2 sm:grid-cols-[1fr_110px_auto]">
              <SelectorCentroCosto value={p.centro} onChange={(centro) => cambiar(p.clave, { centro })} centros={centros} />
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.0001"
                  value={p.porcentaje}
                  onChange={(e) => cambiar(p.clave, { porcentaje: e.target.value })}
                  className="pr-7 text-right font-mono"
                  aria-label={`Porcentaje de la parte ${i + 1}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="size-9 p-0"
                aria-label="Quitar la parte"
                disabled={partes.length <= 2}
                onClick={() => setPartes((ps) => ps.filter((x) => x.clave !== p.clave))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setPartes((ps) => [...ps, parteVacia()])}>
              <Plus className="size-4" /> Otro centro
            </Button>
            <span className={cn("text-sm font-medium", Math.abs(suma - 100) < 0.001 ? "text-muted-foreground" : "text-danger")}>
              Suma {suma} %
            </span>
          </div>
        </div>

        {problema && <p className="text-xs text-muted-foreground">{problema}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={problema !== null || guardar.isPending}>
            {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
