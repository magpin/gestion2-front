"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { periodosApi } from "../services/contabilidad.service";
import type { Periodo } from "../types/contabilidad.types";

const CLAVE = ["periodos"];

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type Accion = "abrir" | "cerrar" | "reabrir";

/** Qué dice cada confirmación. Reabrir es la que más explicación necesita. */
const TEXTO: Record<Accion, { titulo: string; cuerpo: string; boton: string }> =
  {
    abrir: {
      titulo: "Abrir el período",
      cuerpo:
        "Queda listo para recibir asientos con fecha de ese mes. No se puede saltar meses: el saldo inicial de uno sale del saldo final del anterior.",
      boton: "Abrir",
    },
    cerrar: {
      titulo: "Cerrar el período",
      cuerpo:
        "Se congelan los saldos de todas las cuentas y el mes deja de aceptar asientos. Es una promesa: los estados financieros que salgan de acá no van a cambiar. Exige que el mes anterior ya esté cerrado.",
      boton: "Cerrar",
    },
    reabrir: {
      titulo: "Reabrir el período",
      cuerpo:
        "Se borran los saldos congelados y el mes vuelve a aceptar asientos. Los asientos no se tocan. Solo se puede si ningún mes posterior está cerrado, y solo lo puede hacer el director.",
      boton: "Reabrir",
    },
  };

/**
 * El calendario contable del año, mes por mes.
 *
 * Doce tarjetas y no una lista: un año se mira de un vistazo, y lo que importa
 * —cuál está abierto, cuál falta cerrar— se ve por el color, no leyendo.
 */
export function PeriodosSeccion() {
  const queryClient = useQueryClient();
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [confirmar, setConfirmar] = useState<{
    accion: Accion;
    mes: number;
    periodo?: Periodo;
  } | null>(null);

  const { data: periodos = [], isLoading } = useQuery({
    queryKey: [...CLAVE, anio],
    queryFn: () => periodosApi.listar(anio),
  });

  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: ["periodos"] });

  const ejecutar = useMutation({
    mutationFn: ({ accion, mes, periodo }: NonNullable<typeof confirmar>) => {
      if (accion === "abrir") return periodosApi.abrir(anio, mes);
      if (accion === "cerrar") return periodosApi.cerrar(periodo!.id);
      return periodosApi.reabrir(periodo!.id);
    },
    onSuccess: async (_r, v) => {
      await refrescar();
      // También el balance: sus números cambian según el período esté abierto o
      // cerrado, porque son dos consultas distintas.
      await queryClient.invalidateQueries({ queryKey: ["balance-prueba"] });
      aviso.exito(
        v.accion === "abrir"
          ? "Período abierto"
          : v.accion === "cerrar"
            ? "Período cerrado y saldos congelados"
            : "Período reabierto",
      );
      setConfirmar(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const porMes = new Map(periodos.map((p) => [p.mes, p]));

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          aria-label="Año anterior"
          className="size-11 rounded-xl"
          onClick={() => setAnio((a) => a - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-24 text-center text-2xl font-semibold tabular-nums">
          {anio}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Año siguiente"
          className="size-11 rounded-xl"
          onClick={() => setAnio((a) => a + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MESES.map((nombre, i) => {
          const mes = i + 1;
          const periodo = porMes.get(mes);
          const estado = periodo?.estado;

          return (
            <div
              key={nombre}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <CalendarDays className="size-5 text-brand" />
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    estado === "ABIERTO"
                      ? "bg-success/15 text-success"
                      : estado === "CERRADO"
                        ? "bg-muted text-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {estado === "ABIERTO"
                    ? "Abierto"
                    : estado === "CERRADO"
                      ? "Cerrado"
                      : "Sin abrir"}
                </span>
              </div>

              <h2 className="mt-8 text-xl font-semibold">
                {nombre} {anio}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {estado === "ABIERTO"
                  ? "Listo para registrar movimientos"
                  : estado === "CERRADO"
                    ? "Saldos congelados"
                    : "Aún no acepta asientos"}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {estado === undefined && (
                  <Button
                    variant="ghost"
                    className="h-11 rounded-xl px-4 text-brand-text"
                    onClick={() => setConfirmar({ accion: "abrir", mes })}
                  >
                    Abrir período →
                  </Button>
                )}
                {estado === "ABIERTO" && (
                  <Button
                    variant="ghost"
                    className="h-11 rounded-xl px-4 text-brand-text"
                    onClick={() =>
                      setConfirmar({ accion: "cerrar", mes, periodo })
                    }
                  >
                    Cerrar período →
                  </Button>
                )}
                {estado === "CERRADO" && (
                  <Button
                    variant="ghost"
                    className="h-11 rounded-xl px-4 text-muted-foreground"
                    onClick={() =>
                      setConfirmar({ accion: "reabrir", mes, periodo })
                    }
                  >
                    Reabrir período →
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={confirmar !== null}
        onOpenChange={(a) => !a && setConfirmar(null)}
      >
        <AlertDialogContent className="gap-6 p-6 sm:max-w-lg!">
          {confirmar && (
            <>
              <AlertDialogHeader>
                <AlertDialogMedia
                  className={
                    confirmar.accion === "reabrir"
                      ? "bg-warning/15 text-warning"
                      : "bg-muted"
                  }
                >
                  <CalendarDays />
                </AlertDialogMedia>
                <AlertDialogTitle className="text-lg">
                  {TEXTO[confirmar.accion].titulo} — {MESES[confirmar.mes - 1]}{" "}
                  {anio}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[15px] leading-6">
                  {TEXTO[confirmar.accion].cuerpo}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="-mx-6 -mb-6 p-6">
                <AlertDialogCancel className="h-11 rounded-xl px-6">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  className="h-11 rounded-xl px-6"
                  disabled={ejecutar.isPending}
                  onClick={() => ejecutar.mutate(confirmar)}
                >
                  {ejecutar.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {TEXTO[confirmar.accion].boton}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
