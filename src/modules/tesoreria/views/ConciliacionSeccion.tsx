"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { SelectorCuentaBancaria } from "../components/SelectorCuentaBancaria";
import { extractosApi, movimientosBancoApi } from "../services/bancos.service";
import type { CuentaBancariaResumen } from "../types/bancos.types";

/**
 * La conciliación: dos columnas, el libro a la izquierda y el extracto a
 * la derecha. Lo ya apareado se atenúa en vez de desaparecer, para ver
 * el avance — un clic en un movimiento y una línea sueltos, más
 * "Aparear", llama `conciliarManual`. "Conciliar automático" corre el
 * emparejamiento exacto de una sola vez.
 */
export function ConciliacionSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CONTADOR", "DIRECTOR");

  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [extractoId, setExtractoId] = useState<string | null>(null);
  const [movimientoElegido, setMovimientoElegido] = useState<string | null>(null);
  const [lineaElegida, setLineaElegida] = useState<string | null>(null);

  const { data: extractos } = useQuery({
    queryKey: ["extractos", cuenta?.id],
    queryFn: () => extractosApi.listar(cuenta!.id),
    enabled: cuenta !== null,
  });
  const abiertos = extractos?.datos.filter((e) => e.estado === "ABIERTO") ?? [];

  const claveDetalle = ["extractos", "detalle", extractoId];
  const { data: detalle, isLoading: cargandoDetalle } = useQuery({
    queryKey: claveDetalle,
    queryFn: () => extractosApi.porId(extractoId!),
    enabled: extractoId !== null,
  });

  const claveMovimientos = ["cuentas-bancarias", "movimientos", cuenta?.id];
  const { data: movimientos, isLoading: cargandoMovimientos } = useQuery({
    queryKey: claveMovimientos,
    queryFn: () => movimientosBancoApi.listar(cuenta!.id),
    enabled: cuenta !== null,
  });

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: claveDetalle });
    await queryClient.invalidateQueries({ queryKey: claveMovimientos });
    setMovimientoElegido(null);
    setLineaElegida(null);
  };

  const automatico = useMutation({
    mutationFn: () => extractosApi.conciliarAutomatico(extractoId!),
    onSuccess: async (resumen) => {
      await refrescar();
      aviso.exito(
        `${resumen.pares} apareado${resumen.pares === 1 ? "" : "s"} · ${resumen.lineasSinAparear} línea${resumen.lineasSinAparear === 1 ? "" : "s"} y ${resumen.movimientosSinAparear} movimiento${resumen.movimientosSinAparear === 1 ? "" : "s"} siguen sueltos`,
      );
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const manual = useMutation({
    mutationFn: () =>
      extractosApi.conciliarManual(extractoId!, {
        lineaId: lineaElegida!,
        movimientoId: movimientoElegido!,
      }),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Apareados");
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const cerrar = useMutation({
    mutationFn: () => extractosApi.cerrar(extractoId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["extractos", cuenta?.id] });
      await refrescar();
      aviso.exito("Extracto conciliado");
      setExtractoId(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const movimientosDeLaCuenta = movimientos?.datos ?? [];
  const lineasDelExtracto = detalle?.lineas ?? [];
  const quedanSueltos =
    movimientosDeLaCuenta.some((m) => !m.conciliado) ||
    lineasDelExtracto.some((l) => l.banco_movimiento_id === null);

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Cuenta bancaria</span>
          <SelectorCuentaBancaria
            valor={cuenta}
            onElegir={(c) => {
              setCuenta(c);
              setExtractoId(null);
            }}
          />
        </div>

        {cuenta && (
          <label className="flex min-h-12 min-w-[260px] flex-col justify-center rounded-2xl border border-border bg-card px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Extracto abierto</span>
            <Select value={extractoId ?? ""} onValueChange={setExtractoId}>
              <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-sm font-semibold shadow-none">
                <SelectValue placeholder="Elegí un extracto" />
              </SelectTrigger>
              <SelectContent>
                {abiertos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {formatFecha(e.fecha_desde)} – {formatFecha(e.fecha_hasta)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {extractoId && puedeOperar && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={automatico.isPending}
              onClick={() => automatico.mutate()}
              className="h-auto min-h-12 gap-2 rounded-2xl px-5 text-sm font-semibold"
            >
              {automatico.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Conciliar automático
            </Button>

            <Button
              type="button"
              disabled={cerrar.isPending || quedanSueltos}
              onClick={() => cerrar.mutate()}
              className="h-auto min-h-12 gap-2 rounded-2xl px-5 text-sm font-semibold"
            >
              {cerrar.isPending && <Loader2 className="size-4 animate-spin" />}
              Cerrar extracto
            </Button>
          </>
        )}
      </section>

      {!extractoId ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-20 text-center">
          <CheckCircle2 className="size-8 text-muted-foreground" />
          <p className="font-semibold">
            {cuenta ? "Elegí un extracto abierto para conciliar" : "Elegí una cuenta bancaria para empezar"}
          </p>
        </div>
      ) : (
        <>
          {puedeOperar && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-muted p-4 text-sm">
              <span className="text-muted-foreground">
                Elegí un movimiento y una línea, del mismo valor, para aparearlos a mano.
              </span>
              <Button
                type="button"
                disabled={!movimientoElegido || !lineaElegida || manual.isPending}
                onClick={() => manual.mutate()}
                className="h-10 rounded-xl px-5 text-sm"
              >
                {manual.isPending && <Loader2 className="size-4 animate-spin" />}
                Aparear
              </Button>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="border-b border-border p-5">
                <h3 className="font-semibold">Libro (movimientos)</h3>
              </div>
              {cargandoMovimientos ? (
                <div className="flex justify-center py-16 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {movimientosDeLaCuenta.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={m.conciliado || !puedeOperar}
                        onClick={() => setMovimientoElegido(m.id === movimientoElegido ? null : m.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors",
                          m.conciliado
                            ? "opacity-40"
                            : m.id === movimientoElegido
                              ? "bg-brand/10"
                              : "hover:bg-accent",
                        )}
                      >
                        <span>
                          <span className="block font-medium">{formatFecha(m.fecha)}</span>
                          <span className="block text-xs text-muted-foreground">{m.concepto}</span>
                        </span>
                        <span className="font-mono font-semibold">{formatCOP(Number(m.valor))}</span>
                      </button>
                    </li>
                  ))}
                  {movimientosDeLaCuenta.length === 0 && (
                    <li className="px-5 py-8 text-center text-sm text-muted-foreground">Sin movimientos.</li>
                  )}
                </ul>
              )}
            </section>

            <section className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="border-b border-border p-5">
                <h3 className="font-semibold">Extracto (líneas)</h3>
              </div>
              {cargandoDetalle ? (
                <div className="flex justify-center py-16 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {lineasDelExtracto.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        disabled={l.banco_movimiento_id !== null || !puedeOperar}
                        onClick={() => setLineaElegida(l.id === lineaElegida ? null : l.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors",
                          l.banco_movimiento_id !== null
                            ? "opacity-40"
                            : l.id === lineaElegida
                              ? "bg-brand/10"
                              : "hover:bg-accent",
                        )}
                      >
                        <span>
                          <span className="block font-medium">{formatFecha(l.fecha)}</span>
                          <span className="block text-xs text-muted-foreground">{l.descripcion}</span>
                        </span>
                        <span className="font-mono font-semibold">
                          {l.tipo === "DEBITO" ? "-" : ""}
                          {formatCOP(Number(l.valor))}
                        </span>
                      </button>
                    </li>
                  ))}
                  {lineasDelExtracto.length === 0 && (
                    <li className="px-5 py-8 text-center text-sm text-muted-foreground">Sin líneas.</li>
                  )}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
