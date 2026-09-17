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
import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { cajasApi } from "../services/tesoreria.service";
import { formatCOP, formatFecha } from "@/lib/utils";
import { NOMBRE_TIPO_CAJA } from "../types/tesoreria.types";
import type { CajaResumen } from "../types/tesoreria.types";

const CLAVE = ["cajas"];

/**
 * El maestro. Nada de "editar tipo/sede/cuenta" acá —el backend solo
 * acepta cambiar el nombre, y ni siquiera eso tiene pantalla propia
 * todavía—: la única acción real es activar/desactivar, mismo criterio
 * que `ProductosSeccion`.
 *
 * El alta ("Nueva caja") vive en `TesoreriaView`, no acá: es la acción de
 * la pantalla entera, igual que "Nuevo producto" en `InventarioView`.
 */
export function CajasSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CAJA", "DIRECTOR");

  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [seleccionada, setSeleccionada] = useState<CajaResumen | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const { data: cajas = [], isLoading } = useQuery({
    queryKey: [...CLAVE, incluirInactivas],
    queryFn: () => cajasApi.listar({ incluirInactivas }),
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: CLAVE });

  const desactivar = useMutation({
    mutationFn: (id: string) => cajasApi.desactivar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Caja desactivada");
      setConfirmando(false);
    },
    onError: (e: unknown) => aviso.falla(e),
  });
  const activar = useMutation({
    mutationFn: (id: string) => cajasApi.activar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Caja reactivada");
      setConfirmando(false);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <section className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">{cajas.length}</strong> caja{cajas.length === 1 ? "" : "s"}
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

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : cajas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Landmark className="size-6" />
          </span>
          <p className="text-lg font-semibold">Todavía no hay cajas</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Creá la primera con el botón «Nueva caja» de arriba.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Caja", "Tipo", "Saldo", "Últ. movimiento", "Estado", "Acciones"].map((x) => (
                    <th key={x} scope="col" className={`px-5 py-4 ${x === "Acciones" ? "text-right" : ""}`}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cajas.map((c) => (
                  <tr key={c.id} className={c.activa ? "" : "opacity-60"}>
                    <td className="px-5 py-5 text-sm font-semibold">{c.nombre}</td>
                    <td className="px-5 py-5">
                      <span className="rounded-full border border-border px-3 py-1.5 text-xs">{NOMBRE_TIPO_CAJA[c.tipo]}</span>
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
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
                        aria-label={`Acciones de ${c.nombre}`}
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

      <AlertDialog open={confirmando} onOpenChange={(a) => !a && setConfirmando(false)}>
        <AlertDialogContent className="gap-6 p-6 sm:max-w-md!">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning/10 text-warning">
              <Landmark />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-lg">
              {seleccionada?.activa ? "¿Desactivar esta caja?" : "¿Activar esta caja?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              {seleccionada?.activa
                ? "La caja deja de aparecer en nuevas operaciones, pero conserva todo su libro."
                : "La caja vuelve a estar disponible para operaciones."}
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
