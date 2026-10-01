"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, FileUp, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
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
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import {
  FormularioExtracto,
  type DatosExtracto,
} from "../components/FormularioExtracto";
import {
  FormularioLineaExtracto,
  type DatosLineaExtracto,
} from "../components/FormularioLineaExtracto";
import { DialogoImportarExtracto } from "../components/DialogoImportarExtracto";
import { SelectorCuentaBancaria } from "../components/SelectorCuentaBancaria";
import { extractosApi } from "../services/bancos.service";
import type { CuentaBancariaResumen } from "../types/bancos.types";

const ID_FORMULARIO = "formulario-nuevo-extracto";

/**
 * Los extractos de una cuenta bancaria: subirlos desde el archivo del banco,
 * o crearlos y cargarles las líneas una por una. Conciliarlos es de
 * `ConciliacionSeccion` — acá solo se arma el material con el que esa
 * pantalla va a trabajar.
 */
export function ExtractosSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CONTADOR", "DIRECTOR");

  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [creando, setCreando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const claveExtractos = ["extractos", cuenta?.id];
  const { data: extractos, isError, error, refetch } = useQuery({
    queryKey: claveExtractos,
    queryFn: () => extractosApi.listar(cuenta!.id),
    enabled: cuenta !== null,
    meta: SILENCIOSO,
  });

  const { data: detalle } = useQuery({
    queryKey: ["extractos", "detalle", detalleId],
    queryFn: () => extractosApi.porId(detalleId!),
    enabled: detalleId !== null,
  });

  const crear = useMutation({
    mutationFn: (d: DatosExtracto) => extractosApi.crear(cuenta!.id, d),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: claveExtractos });
      aviso.exito("Extracto creado");
      setCreando(false);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const agregarLinea = useMutation({
    mutationFn: (d: DatosLineaExtracto) => extractosApi.agregarLinea(detalleId!, d),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["extractos", "detalle", detalleId] });
      aviso.exito("Línea agregada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Cuenta bancaria</span>
          <SelectorCuentaBancaria valor={cuenta} onElegir={setCuenta} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!cuenta || !puedeOperar}
            onClick={() => setCreando(true)}
            className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
          >
            Digitar extracto
          </Button>
          <Button
            type="button"
            disabled={!cuenta || !puedeOperar}
            onClick={() => setImportando(true)}
            className="h-auto min-h-12 gap-2 rounded-2xl px-5 text-sm font-semibold"
          >
            <FileUp className="size-4" />
            Subir extracto
          </Button>
        </div>
      </section>

      {importando && cuenta && (
        <DialogoImportarExtracto cuenta={cuenta} onCerrar={() => setImportando(false)} />
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Extractos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un rango de fechas, no un día: no encadena con el anterior.
          </p>
        </div>

        {!cuenta ? (
          <EmptyState
            sinMarco
            icon={FileText}
            titulo="Elija una cuenta bancaria para ver sus extractos"
            descripcion="Arriba, en «Cuenta bancaria»: aquí quedan los extractos del banco con los que después se concilia."
          />
        ) : extractos === undefined ? (
          isError ? (
            <ErrorCarga sinMarco error={error} titulo="No se pudieron leer los extractos de esta cuenta" onReintentar={refetch} />
          ) : (
            <div className="flex justify-center py-24 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )
        ) : extractos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Rango", "Saldo inicial", "Saldo final", "Estado", "Acciones"].map((x) => (
                    <th key={x} scope="col" className="px-5 py-4">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {extractos.datos.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(e.fecha_desde)} – {formatFecha(e.fecha_hasta)}
                    </td>
                    <td className="px-5 py-5 font-mono">{formatCOP(Number(e.saldo_inicial_banco))}</td>
                    <td className="px-5 py-5 font-mono">{formatCOP(Number(e.saldo_final_banco))}</td>
                    <td className="px-5 py-5">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                        <span className={`size-2 rounded-full ${e.estado === "CONCILIADO" ? "bg-success" : "bg-warning"}`} />
                        {e.estado === "CONCILIADO" ? "Conciliado" : "Abierto"}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <Button
                        variant="ghost"
                        className="h-10 rounded-xl px-4 text-sm text-muted-foreground"
                        onClick={() => setDetalleId(e.id)}
                      >
                        Ver líneas
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            sinMarco
            icon={FileText}
            titulo="Esta cuenta todavía no tiene extractos"
            descripcion="Suba el archivo que le da el banco, o digite el extracto a mano: sin él no hay contra qué conciliar el libro."
            accion={puedeOperar ? { label: "Subir extracto", onClick: () => setImportando(true) } : undefined}
            accionSecundaria={puedeOperar ? { label: "Digitar extracto", onClick: () => setCreando(true) } : undefined}
          />
        )}
      </section>

      <Dialog open={creando} onOpenChange={(a) => !a && setCreando(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Nuevo extracto</DialogTitle>
              <DialogDescription>Los saldos que dice el banco — las líneas se cargan después, una por una.</DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioExtracto id={ID_FORMULARIO} alGuardar={(d) => crear.mutate(d)} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setCreando(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORMULARIO} className="h-12 rounded-xl px-6" disabled={crear.isPending}>
              {crear.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear extracto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detalleId !== null} onOpenChange={(a) => !a && setDetalleId(null)}>
        <DialogContent size="lg">
          {detalle && (
            <>
              <DialogHeader>
                <div>
                  <DialogTitle>
                    {formatFecha(detalle.fecha_desde)} – {formatFecha(detalle.fecha_hasta)}
                  </DialogTitle>
                  <DialogDescription>
                    Saldo inicial {formatCOP(Number(detalle.saldo_inicial_banco))} · Saldo final{" "}
                    {formatCOP(Number(detalle.saldo_final_banco))}
                  </DialogDescription>
                </div>
                <DialogCloseIcon />
              </DialogHeader>
              <DialogBody className="flex flex-col gap-5">
                {detalle.estado === "ABIERTO" && puedeOperar && (
                  <FormularioLineaExtracto
                    onAgregar={(d) => agregarLinea.mutate(d)}
                    agregando={agregarLinea.isPending}
                  />
                )}

                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        {["Fecha", "Descripción", "Valor", "Tipo", "Conciliada"].map((x) => (
                          <th key={x} scope="col" className="px-4 py-3">
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detalle.lineas.map((l) => (
                        <tr key={l.id}>
                          <td className="px-4 py-3 text-muted-foreground">{formatFecha(l.fecha)}</td>
                          <td className="px-4 py-3">{l.descripcion}</td>
                          <td className="px-4 py-3 font-mono">{formatCOP(Number(l.valor))}</td>
                          <td className="px-4 py-3">{l.tipo === "CREDITO" ? "Crédito" : "Débito"}</td>
                          <td className="px-4 py-3">
                            {l.grupo_id ? (
                              <span className="text-xs font-semibold text-success">Sí</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {detalle.lineas.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            Todavía no tiene líneas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
