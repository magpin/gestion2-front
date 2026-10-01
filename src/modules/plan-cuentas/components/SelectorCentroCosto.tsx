"use client";

import { useQuery } from "@tanstack/react-query";

import { SelectField } from "@/components/shared/SelectField";
import { planCuentasApi } from "../services/plan-cuentas.service";
import type { CentroCosto, Reparto } from "../types/plan-cuentas.types";

export const CLAVE_CENTROS = ["plan-cuentas", "centros"];
export const CLAVE_MANEJO_CENTROS = ["plan-cuentas", "centros", "manejo"];
export const CLAVE_REPARTOS = ["plan-cuentas", "centros", "repartos"];

/** Sin centro: el valor vacío no lo acepta el Select, va con este centinela. */
const NINGUNO = "__ninguno";

/**
 * Si la empresa maneja centros de costo y cuáles se pueden elegir: activos y
 * del último nivel (un agrupador no recibe movimientos). Con el manejo
 * apagado, los formularios no muestran el selector.
 */
export function useCentrosCosto() {
  const manejo = useQuery({
    queryKey: CLAVE_MANEJO_CENTROS,
    queryFn: planCuentasApi.manejoCentros,
    staleTime: 60_000,
  });
  const centros = useQuery({
    queryKey: CLAVE_CENTROS,
    queryFn: planCuentasApi.centros,
    enabled: manejo.data === true,
    staleTime: 60_000,
  });
  const repartos = useQuery({
    queryKey: CLAVE_REPARTOS,
    queryFn: planCuentasApi.repartos,
    enabled: manejo.data === true,
    staleTime: 60_000,
  });
  const todos = centros.data ?? [];
  return {
    maneja: manejo.data === true,
    elegibles: todos.filter((c) => c.activo && !c.agrupa),
    todos,
    /** Los repartos activos: para «Repartir con…» en un renglón de gasto. */
    repartos: (repartos.data ?? []).filter((r) => r.activo),
    cargando: manejo.isLoading || centros.isLoading,
  };
}

/** El centro que propone el sistema para un documento nuevo (usuario, sede, por defecto). */
export function useCentroPropuesto(sedeId?: string | null) {
  const { maneja } = useCentrosCosto();
  return useQuery({
    queryKey: [...CLAVE_CENTROS, "propuesto", sedeId ?? null],
    queryFn: () => planCuentasApi.centroPropuesto(sedeId ?? undefined),
    enabled: maneja,
    staleTime: 60_000,
  }).data ?? null;
}

const PREFIJO_REPARTO = "reparto:";

/**
 * Un centro, o un reparto entre varios (fase 8). Para los renglones de gasto:
 * el arriendo de dos sedes va con «Repartir con: Arriendo 60/40».
 */
export function SelectorCentroOReparto({
  centro,
  reparto,
  onChange,
  centros,
  repartos,
  textoVacio = "Sin centro",
}: {
  centro: string | null;
  reparto: string | null;
  onChange: (eleccion: { centro: string | null; reparto: string | null }) => void;
  centros: CentroCosto[];
  repartos: Reparto[];
  textoVacio?: string;
}) {
  const opciones = [
    { value: NINGUNO, label: textoVacio },
    ...centros.map((c) => ({ value: c.id, label: etiquetaCentro(c) })),
    ...repartos.map((r) => ({ value: PREFIJO_REPARTO + r.id, label: `Repartir con: ${r.nombre}` })),
  ];
  const valor = reparto !== null ? PREFIJO_REPARTO + reparto : (centro ?? NINGUNO);
  return (
    <SelectField
      value={valor}
      onChange={(v) =>
        v.startsWith(PREFIJO_REPARTO)
          ? onChange({ centro: null, reparto: v.slice(PREFIJO_REPARTO.length) })
          : onChange({ centro: v === NINGUNO || v === "" ? null : v, reparto: null })
      }
      options={opciones}
      placeholder="Centro de costo"
    />
  );
}

export function etiquetaCentro(c: Pick<CentroCosto, "codigo" | "nombre">): string {
  return `${c.codigo} · ${c.nombre}`;
}

/**
 * Un centro de costo para elegir. Muestra solo los que reciben movimientos;
 * si el valor actual ya no está entre ellos (se desactivó), igual se ve.
 */
export function SelectorCentroCosto({
  value,
  onChange,
  centros,
  permitirVacio = false,
  textoVacio = "Sin centro",
  invalido,
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  centros: CentroCosto[];
  permitirVacio?: boolean;
  textoVacio?: string;
  invalido?: boolean;
  disabled?: boolean;
}) {
  const opciones = centros.map((c) => ({ value: c.id, label: etiquetaCentro(c) }));
  if (permitirVacio) opciones.unshift({ value: NINGUNO, label: textoVacio });
  return (
    <SelectField
      value={value ?? (permitirVacio ? NINGUNO : "")}
      onChange={(v) => onChange(v === NINGUNO || v === "" ? null : v)}
      options={opciones}
      placeholder="Centro de costo"
      invalido={invalido}
      disabled={disabled}
    />
  );
}
