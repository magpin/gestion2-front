"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

import { empresaApi } from "@/modules/configuracion/services/nucleo.service";
import { cajasApi } from "../services/tesoreria.service";
import type { CajaResumen } from "../types/tesoreria.types";

/**
 * Cuál es la caja principal: la PRINCIPAL activa de la sede principal; si
 * solo hay una caja principal, esa. Si hay varias y ninguna es de la sede
 * principal, `null`: adivinar sería mandar la plata a otra sede.
 */
export function elegirCajaPrincipal(
  cajas: CajaResumen[],
  sedePrincipalId: string | undefined,
): CajaResumen | null {
  const principales = cajas.filter((c) => c.activa && c.tipo === "PRINCIPAL");
  return (
    principales.find((c) => c.sede_id === sedePrincipalId) ??
    (principales.length === 1 ? principales[0] : null)
  );
}

/**
 * La caja principal de la empresa: la PRINCIPAL activa de la sede principal.
 * Si solo hay una caja principal, esa. `null` mientras carga o si no hay.
 *
 * En Ventas el efectivo entra siempre ahí —decisión del dueño, 25 de
 * septiembre de 2026—: quien factura no elige caja.
 */
export function useCajaPrincipal(): {
  caja: CajaResumen | null;
  cargando: boolean;
} {
  const { data: cajas, isLoading: cargandoCajas } = useQuery({
    queryKey: ["cajas", "selector"],
    queryFn: () => cajasApi.listar(),
    staleTime: 60_000,
  });
  const { data: sedes, isLoading: cargandoSedes } = useQuery({
    queryKey: ["sedes"],
    queryFn: empresaApi.sedes,
    staleTime: 5 * 60_000,
  });

  const caja = elegirCajaPrincipal(
    cajas ?? [],
    (sedes ?? []).find((s) => s.es_principal)?.id,
  );

  return { caja, cargando: cargandoCajas || cargandoSedes };
}

/**
 * En lugar del selector de caja: dice cuál es y la deja elegida. Si la
 * empresa no tiene caja principal, lo dice, y el formulario no deja seguir
 * porque la caja queda vacía.
 */
export function CajaPrincipal({
  valor,
  onElegir,
}: {
  valor: CajaResumen | null;
  onElegir: (caja: CajaResumen) => void;
}) {
  const { caja, cargando } = useCajaPrincipal();

  useEffect(() => {
    if (caja !== null && valor?.id !== caja.id) onElegir(caja);
  }, [caja, valor?.id, onElegir]);

  return (
    <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 text-sm">
      <Wallet className="size-4 shrink-0 text-muted-foreground" />
      {cargando ? (
        <span className="text-muted-foreground">Buscando la caja…</span>
      ) : caja === null ? (
        <span className="text-danger">
          La empresa no tiene una caja principal activa.
        </span>
      ) : (
        <span className="truncate">{caja.nombre}</span>
      )}
    </div>
  );
}
