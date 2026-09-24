"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Loader2, Workflow } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatFecha } from "@/lib/utils";
import { configuracionApi as inventarioApi } from "@/modules/inventario/services/inventario.service";
import { configuracionCajaApi } from "@/modules/tesoreria/services/tesoreria.service";
import type {
  ConceptoConfigurado,
  ConfiguracionCuentas,
} from "../types/cuentas-automaticas.types";

const CLAVE_CAJA = ["tesoreria", "configuracion"];
const CLAVE_INVENTARIO = ["inventario", "configuracion"];

/**
 * Las cuentas que el sistema usa solo: el sobrante de un arqueo, la merma de
 * bodega, el costo de venta de un producto nuevo.
 *
 * Nadie tiene que configurarlas: al entrar se crean las que falten y se
 * asignan. Esta sección existe para dos cosas:
 *
 * 1. **Ver** qué cuenta usa cada cosa, y si el sistema ya la está usando
 *    —cuántos movimientos tiene y cuándo fue el último—.
 * 2. **Elegir** cuando hay algo que elegir: si la empresa abrió varios
 *    auxiliares de una de estas cuentas, el sistema no adivina cuál. Es la
 *    única pregunta, y la contesta el contador, no quien opera.
 */
export function CuentasAutomaticas() {
  const queryClient = useQueryClient();
  const puedeElegir = useTieneRol("CONTADOR", "DIRECTOR");

  const caja = useQuery({ queryKey: CLAVE_CAJA, queryFn: configuracionCajaApi.obtener });
  const inventario = useQuery({ queryKey: CLAVE_INVENTARIO, queryFn: inventarioApi.obtener });

  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CLAVE_CAJA }),
      queryClient.invalidateQueries({ queryKey: CLAVE_INVENTARIO }),
      queryClient.invalidateQueries({ queryKey: ["plan-cuentas"] }),
      queryClient.invalidateQueries({ queryKey: ["cajas"] }),
    ]);

  // Una vez por visita: crea lo que falte antes de mostrar. Idempotente.
  const preparado = useRef(false);
  const preparar = useMutation({
    mutationFn: () => Promise.all([configuracionCajaApi.preparar(), inventarioApi.preparar()]),
    onSuccess: async ([c, i]) => {
      await refrescar();
      const creado = [...c.cuentasCreadas, ...i.cuentasCreadas, ...c.cajasCreadas];
      if (creado.length > 0) aviso.exito(`Se creó: ${creado.join(", ")}`);
    },
  });
  useEffect(() => {
    if (!puedeElegir || preparado.current) return;
    preparado.current = true;
    preparar.mutate();
  }, [puedeElegir, preparar]);

  const fijar = useMutation({
    mutationFn: (d: { modulo: "caja" | "inventario"; concepto: string; cuentaId: string }) =>
      d.modulo === "caja"
        ? configuracionCajaApi.fijar(d.concepto as never, d.cuentaId)
        : inventarioApi.fijar(d.concepto as never, d.cuentaId),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Cuenta guardada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const pendientes = [
    ...(caja.data?.conceptos ?? []),
    ...(inventario.data?.conceptos ?? []),
  ].filter((c) => c.cuenta === null).length;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <Workflow className="mt-0.5 size-4 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Cuentas automáticas</h2>
          <p className="text-xs text-muted-foreground">
            Las cuentas que el sistema usa solo. No hay que configurarlas: solo se pide elegir cuando una tiene
            varios auxiliares.
          </p>
        </div>
        {pendientes > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            <CircleAlert className="size-3.5" />
            {pendientes} por elegir
          </span>
        ) : (
          !caja.isLoading &&
          !inventario.isLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <CheckCircle2 className="size-3.5" />
              Todo listo
            </span>
          )
        )}
      </div>

      {caja.isLoading || inventario.isLoading || preparar.isPending ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Grupo
            titulo="Caja"
            datos={caja.data}
            puedeElegir={puedeElegir}
            guardando={fijar.isPending ? fijar.variables : undefined}
            alElegir={(concepto, cuentaId) => fijar.mutate({ modulo: "caja", concepto, cuentaId })}
            modulo="caja"
          />
          <Grupo
            titulo="Inventario"
            datos={inventario.data}
            puedeElegir={puedeElegir}
            guardando={fijar.isPending ? fijar.variables : undefined}
            alElegir={(concepto, cuentaId) => fijar.mutate({ modulo: "inventario", concepto, cuentaId })}
            modulo="inventario"
          />
        </div>
      )}
    </section>
  );
}

function Grupo({
  titulo,
  datos,
  modulo,
  puedeElegir,
  guardando,
  alElegir,
}: {
  titulo: string;
  datos: ConfiguracionCuentas | undefined;
  modulo: "caja" | "inventario";
  puedeElegir: boolean;
  guardando: { modulo: string; concepto: string } | undefined;
  alElegir: (concepto: string, cuentaId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{titulo}</h3>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {datos?.conceptos.map((c) => (
          <Concepto
            key={c.concepto}
            c={c}
            puedeElegir={puedeElegir}
            guardando={guardando?.modulo === modulo && guardando.concepto === c.concepto}
            alElegir={(cuentaId) => alElegir(c.concepto, cuentaId)}
          />
        ))}
      </ul>
    </div>
  );
}

function Concepto({
  c,
  puedeElegir,
  guardando,
  alElegir,
}: {
  c: ConceptoConfigurado;
  puedeElegir: boolean;
  guardando: boolean;
  alElegir: (cuentaId: string) => void;
}) {
  // Con una sola opción no hay nada que elegir: la cuenta quedó puesta sola.
  const hayQueElegir = c.opciones.length > 1;

  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{c.etiqueta}</p>
          <p className="text-xs text-muted-foreground">{c.explicacion}</p>
        </div>
        {c.cuenta === null ? (
          <CircleAlert className="size-4 shrink-0 text-warning" aria-label="Falta elegir" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Lista" />
        )}
      </div>

      {hayQueElegir ? (
        <div className="flex items-center gap-2">
          <Select
            items={c.opciones.map((o) => ({ value: o.id, label: `${o.codigo} · ${o.nombre}` }))}
            value={c.cuenta?.id ?? ""}
            onValueChange={(v) => v && alElegir(v)}
            disabled={!puedeElegir || guardando}
          >
            <SelectTrigger
              className="h-9 w-full rounded-lg px-3 text-sm"
              aria-label={`Cuenta para ${c.etiqueta}`}
            >
              <SelectValue placeholder={`${c.codigoPorDefecto} tiene varios auxiliares: elegí uno`} />
            </SelectTrigger>
            <SelectContent>
              {c.opciones.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo} · {o.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {guardando && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>
      ) : c.cuenta !== null ? (
        <p className="font-mono text-xs">
          {c.cuenta.codigo} <span className="font-sans text-muted-foreground">· {c.cuenta.nombre}</span>
        </p>
      ) : (
        <p className="text-xs text-warning">La cuenta {c.codigoPorDefecto} no está en el plan.</p>
      )}

      {/* ¿La está usando el sistema? Sin movimientos también es respuesta:
          asignada, pero todavía no la necesitó ninguna operación. */}
      {c.cuenta !== null && (
        <p className="text-[11px] text-muted-foreground">
          {c.uso.movimientos === 0
            ? "Sin movimientos todavía"
            : `${c.uso.movimientos} movimiento${c.uso.movimientos === 1 ? "" : "s"}${
                c.uso.ultimaFecha ? ` · el último el ${formatFecha(c.uso.ultimaFecha)}` : ""
              }`}
        </p>
      )}
    </li>
  );
}
