"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, MoreHorizontal } from "lucide-react";

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
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DialogoNuevaCuentaBancaria } from "../components/DialogosAltaTesoreria";
import { cuentasBancariasApi } from "../services/bancos.service";
import { NOMBRE_TIPO_CUENTA_BANCARIA } from "../types/bancos.types";
import type { CuentaBancariaResumen } from "../types/bancos.types";

const CLAVE = ["cuentas-bancarias"];

/**
 * El maestro. Nada de "editar" acá —la única acción real es activar/
 * desactivar—, mismo criterio que `CajasSeccion`. El alta ("Nueva cuenta
 * bancaria") vive en `CajaBancosView`; acá solo se abre desde el vacío.
 */
export function CuentasBancariasSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CAJA", "DIRECTOR");

  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [seleccionada, setSeleccionada] = useState<CuentaBancariaResumen | null>(
    null,
  );
  const [confirmando, setConfirmando] = useState(false);

  const [creando, setCreando] = useState(false);

  const { data: cuentas, isError, error, refetch } = useQuery({
    queryKey: [...CLAVE, incluirInactivas],
    queryFn: () => cuentasBancariasApi.listar({ incluirInactivas }),
    meta: SILENCIOSO,
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: CLAVE });

  const desactivar = useMutation({
    mutationFn: (id: string) => cuentasBancariasApi.desactivar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Cuenta bancaria desactivada");
      setConfirmando(false);
    },
    onError: (e: unknown) => aviso.falla(e),
  });
  const activar = useMutation({
    mutationFn: (id: string) => cuentasBancariasApi.activar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Cuenta bancaria reactivada");
      setConfirmando(false);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <section className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {cuentas !== undefined && (
            <>
              <strong className="font-semibold text-foreground">{cuentas.length}</strong> cuenta{cuentas.length === 1 ? "" : "s"} bancaria{cuentas.length === 1 ? "" : "s"}
            </>
          )}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={incluirInactivas}
            onChange={(e) => setIncluirInactivas(e.target.checked)}
            className="size-4 rounded border-border"
          />
          Incluir inactivas
        </label>
      </section>

      {cuentas === undefined ? (
        isError ? (
          <ErrorCarga error={error} titulo="No se pudieron leer las cuentas bancarias" onReintentar={refetch} />
        ) : (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )
      ) : cuentas.length === 0 ? (
        incluirInactivas ? (
          <EmptyState
            icon={Landmark}
            titulo="Todavía no hay cuentas bancarias"
            descripcion="Agregue las cuentas de banco de la empresa con el saldo que tienen hoy: así cuadra cada extracto contra el libro."
            accion={puedeOperar ? { label: "Agregar cuenta bancaria", onClick: () => setCreando(true) } : undefined}
          />
        ) : (
          <EmptyState
            icon={Landmark}
            titulo="No hay cuentas bancarias activas"
            descripcion="Agregue las cuentas de banco de la empresa con el saldo que tienen hoy, o mire las inactivas por si hay una para reactivar."
            accion={puedeOperar ? { label: "Agregar cuenta bancaria", onClick: () => setCreando(true) } : undefined}
            accionSecundaria={{ label: "Ver inactivas", onClick: () => setIncluirInactivas(true) }}
          />
        )
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Banco", "Número", "Tipo", "Saldo", "Últ. movimiento", "Estado", "Acciones"].map((x) => (
                    <th key={x} scope="col" className={`px-5 py-4 ${x === "Acciones" ? "text-right" : ""}`}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cuentas.map((c) => (
                  <tr key={c.id} className={c.activa ? "" : "opacity-60"}>
                    <td className="px-5 py-5 text-sm font-semibold">{c.banco}</td>
                    <td className="px-5 py-5 font-mono text-sm">{c.numero_cuenta}</td>
                    <td className="px-5 py-5">
                      <span className="rounded-full border border-border px-3 py-1.5 text-xs">{NOMBRE_TIPO_CUENTA_BANCARIA[c.tipo_cuenta]}</span>
                    </td>
                    {/* En rojo si está en negativo: el banco admite sobregiro
                        y un saldo negativo tiene que verse como lo que es. */}
                    <td
                      className={`px-5 py-5 font-mono text-sm font-semibold ${
                        Number(c.saldo) < 0 ? "text-danger" : ""
                      }`}
                    >
                      {formatCOP(Number(c.saldo))}
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {c.ultimo_movimiento === null
                        ? "sin movimientos"
                        : formatFecha(c.ultimo_movimiento)}
                    </td>
                    <td className="px-5 py-5">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                        <span className={`size-2 rounded-full ${c.activa ? "bg-success" : "bg-muted-foreground"}`} />
                        {c.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones de ${c.banco}`}
                        disabled={!puedeOperar}
                        onClick={() => {
                          setSeleccionada(c);
                          setConfirmando(true);
                        }}
                        className="rounded-xl text-muted-foreground hover:bg-danger/10 hover:text-danger"
                      >
                        <MoreHorizontal />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <DialogoNuevaCuentaBancaria abierto={creando} onCerrar={() => setCreando(false)} />

      <AlertDialog open={confirmando} onOpenChange={(a) => !a && setConfirmando(false)}>
        <AlertDialogContent className="gap-6 p-6 sm:max-w-md!">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning/10 text-warning">
              <Landmark />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-lg">
              {seleccionada?.activa ? "¿Desactivar esta cuenta bancaria?" : "¿Activar esta cuenta bancaria?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              {seleccionada?.activa
                ? "La cuenta deja de aparecer en nuevas operaciones, pero conserva todo su libro."
                : "La cuenta vuelve a estar disponible para operaciones."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-6 -mb-6 p-6">
            <AlertDialogCancel className="h-11 rounded-xl px-6">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl px-6"
              disabled={desactivar.isPending || activar.isPending}
              onClick={() => {
                if (!seleccionada) return;
                if (seleccionada.activa) desactivar.mutate(seleccionada.id);
                else activar.mutate(seleccionada.id);
              }}
            >
              {(desactivar.isPending || activar.isPending) && <Loader2 className="size-4 animate-spin" />}
              {seleccionada?.activa ? "Desactivar" : "Activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
