"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import {
  FormularioAbrirArqueo,
  FormularioCerrarArqueo,
  type DatosAbrirArqueo,
  type DatosCerrarArqueo,
} from "../components/FormularioArqueo";
import { SelectorCaja } from "../components/SelectorCaja";
import { arqueosApi, configuracionCajaApi } from "../services/tesoreria.service";
import type { CajaResumen } from "../types/tesoreria.types";

const ID_FORMULARIO = "formulario-arqueo";

/**
 * El cuadre diario de una caja. Requiere elegir una caja primero, mismo
 * criterio que `LibroCajaSeccion`. `ux_arqueo_abierto` en el backend ya
 * impide dos arqueos abiertos a la vez: acá solo se refleja mostrando
 * "Abrir" o "Cerrar" según haya uno abierto, nunca los dos botones juntos.
 */
export function ArqueoSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CAJA", "DIRECTOR");

  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [modal, setModal] = useState<"abrir" | "cerrar" | null>(null);

  const clave = ["cajas", "arqueos", caja?.id];
  const { data: arqueos, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => arqueosApi.listar(caja!.id),
    enabled: caja !== null,
  });

  const { data: configuracion } = useQuery({
    queryKey: ["tesoreria", "configuracion"],
    queryFn: configuracionCajaApi.obtener,
  });
  const configurado = configuracion?.cuenta_diferencia_id != null;

  const abierto = arqueos?.datos.find((a) => a.estado === "ABIERTO") ?? null;

  const refrescar = () => queryClient.invalidateQueries({ queryKey: clave });

  const abrir = useMutation({
    mutationFn: (d: DatosAbrirArqueo) => arqueosApi.abrir(caja!.id, d),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Arqueo abierto");
      setModal(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const cerrar = useMutation({
    mutationFn: (d: DatosCerrarArqueo) => arqueosApi.cerrar(caja!.id, d),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Arqueo cerrado");
      setModal(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Caja</span>
          <SelectorCaja valor={caja} onElegir={setCaja} />
        </div>

        <Button
          type="button"
          disabled={!caja || !puedeOperar}
          onClick={() => setModal(abierto ? "cerrar" : "abrir")}
          className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
        >
          {abierto ? "Cerrar arqueo" : "Abrir arqueo"}
        </Button>
      </section>

      {abierto && !configurado && (
        <div className="mb-5 rounded-2xl bg-warning/10 p-4 text-sm text-warning">
          Configura la cuenta de diferencia antes de cerrar con un faltante o sobrante — sin diferencia, el cierre
          igual funciona.
        </div>
      )}

      {abierto && (
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <ClipboardCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Arqueo abierto desde {formatFecha(abierto.fecha)}</p>
            <p className="text-sm text-muted-foreground">
              Saldo del sistema: <span className="font-mono font-semibold text-foreground">{formatCOP(Number(abierto.saldo_sistema))}</span>
            </p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Historial de arqueos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un arqueo cerrado queda congelado: se corrige con un arqueo nuevo, no editando el viejo.
          </p>
        </div>

        {!caja ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <ClipboardCheck className="size-8 text-muted-foreground" />
            <p className="font-semibold">Elegí una caja para ver sus arqueos</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : arqueos && arqueos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Fecha", "Saldo sistema", "Saldo contado", "Diferencia", "Estado"].map((x) => (
                    <th key={x} scope="col" className="px-5 py-4">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {arqueos.datos.map((a) => {
                  const diferencia = a.diferencia === null ? null : Number(a.diferencia);
                  return (
                    <tr key={a.id}>
                      <td className="px-5 py-5 text-sm text-muted-foreground">{formatFecha(a.fecha)}</td>
                      <td className="px-5 py-5 font-mono">{formatCOP(Number(a.saldo_sistema))}</td>
                      <td className="px-5 py-5 font-mono">{a.saldo_contado === null ? "—" : formatCOP(Number(a.saldo_contado))}</td>
                      <td
                        className={`px-5 py-5 font-mono font-semibold ${
                          diferencia === null || diferencia === 0
                            ? "text-muted-foreground"
                            : diferencia > 0
                              ? "text-success"
                              : "text-danger"
                        }`}
                      >
                        {diferencia === null ? "—" : formatCOP(diferencia)}
                      </td>
                      <td className="px-5 py-5">
                        <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                          <span className={`size-2 rounded-full ${a.estado === "ABIERTO" ? "bg-warning" : "bg-success"}`} />
                          {a.estado === "ABIERTO" ? "Abierto" : "Cerrado"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <ClipboardCheck className="size-8 text-muted-foreground" />
            <p className="font-semibold">Esta caja todavía no tiene arqueos</p>
            <p className="max-w-md text-sm text-muted-foreground">Abrí el primero con el botón de arriba.</p>
          </div>
        )}
      </section>

      <Dialog open={modal !== null} onOpenChange={(a) => !a && setModal(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>{modal === "abrir" ? "Abrir arqueo" : "Cerrar arqueo"}</DialogTitle>
              <DialogDescription>
                {modal === "abrir"
                  ? "Congela el saldo del sistema al momento de abrir."
                  : "Contá la caja y registrá lo que hay — la diferencia se calcula sola."}
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            {modal === "abrir" && (
              <FormularioAbrirArqueo id={ID_FORMULARIO} alGuardar={(d) => abrir.mutate(d)} />
            )}
            {modal === "cerrar" && abierto && (
              <FormularioCerrarArqueo id={ID_FORMULARIO} arqueo={abierto} alGuardar={(d) => cerrar.mutate(d)} />
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO}
              className="h-12 rounded-xl px-6"
              disabled={abrir.isPending || cerrar.isPending}
            >
              {(abrir.isPending || cerrar.isPending) && <Loader2 className="size-4 animate-spin" />}
              {modal === "abrir" ? "Abrir" : "Cerrar arqueo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
