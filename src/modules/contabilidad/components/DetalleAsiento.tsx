"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Maria } from "@/modules/asistente/components/Maria";
import { formatCOP, formatFecha } from "@/lib/utils";
import { asientosApi } from "../services/contabilidad.service";
import { DocumentoSoporte, HistorialAsiento } from "./HistorialAsiento";

/**
 * Las líneas de un asiento: cuenta, tercero, débito y crédito.
 *
 * Es la pregunta que se hace un contador delante de cualquier fila del
 * libro —"¿contra qué se movió esto?"— y hasta ahora la lista solo dejaba
 * anular. Pide el asiento al abrirse, no antes: la lista trae solo la
 * cabecera, y traer las líneas de cincuenta asientos para mirar uno es
 * pagar de más.
 */
export function DetalleAsiento({
  asientoId,
  onCerrar,
}: {
  asientoId: string | null;
  onCerrar: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["asientos", "detalle", asientoId],
    queryFn: () => asientosApi.porId(asientoId!),
    enabled: asientoId !== null,
  });
  // Aparte: el historial cruza cinco tablas y firma la URL del documento, y
  // el asiento no tiene por qué esperarlo para mostrarse.
  const { data: historial } = useQuery({
    queryKey: ["asientos", "trazabilidad", asientoId],
    queryFn: () => asientosApi.trazabilidad(asientoId!),
    enabled: asientoId !== null,
    // La URL del documento caduca en una hora: más que eso no se guarda.
    staleTime: 30 * 60_000,
  });
  const conMaria =
    data?.propuesta_id != null || (historial?.pasos.some((p) => p.deMaria) ?? false);

  return (
    <Dialog open={asientoId !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {isLoading && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {data && (
          <>
            <DialogHeader>
              <div>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">{data.numero}</span>
                  <Badge variant="outline">{data.comprobante_codigo}</Badge>
                  {data.estado === "ANULADO" && (
                    <Badge variant="destructive">Anulado</Badge>
                  )}
                  {conMaria && <ChipDeMaria />}
                </DialogTitle>
                <DialogDescription>
                  {formatFecha(data.fecha)} · {data.glosa}
                </DialogDescription>
              </div>
              <DialogCloseIcon />
            </DialogHeader>
            <DialogBody className="flex flex-col gap-5">
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Cuenta
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Tercero
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Débito
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Crédito
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.lineas.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-mono text-xs text-muted-foreground">
                            {l.cuenta_codigo}
                          </span>
                          <span className="ml-2 font-medium">{l.cuenta_nombre}</span>
                          {l.detalle && (
                            <span className="block text-xs text-muted-foreground">
                              {l.detalle}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {l.tercero_nombre ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {Number(l.debito) > 0 ? formatCOP(Number(l.debito)) : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {Number(l.credito) > 0 ? formatCOP(Number(l.credito)) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border bg-muted/40 text-sm font-semibold">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        Sumas iguales
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatCOP(Number(data.total_debito))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatCOP(Number(data.total_credito))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {data.motivo_anulacion && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-danger">Anulado:</span>{" "}
                  {data.motivo_anulacion}
                </p>
              )}
              {historial?.documento && <DocumentoSoporte documento={historial.documento} />}
              {historial && <HistorialAsiento pasos={historial.pasos} />}
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * «Propuesto por María», en el asiento que salió de una propuesta suya.
 *
 * Va con su cara y no con un ícono genérico porque el punto es **que nadie la
 * confunda con una persona llamada María**: la cara con el punto naranja es lo
 * que la distingue de unas iniciales.
 *
 * Solo aparece cuando la base lo dice: el asiento salió de una propuesta suya
 * (`propuesta_id`) o de un documento que ella leyó (la trazabilidad). No se
 * deduce de la glosa ni de la hora: un asiento mal atribuido es peor que uno
 * sin atribuir.
 */
function ChipDeMaria() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary py-1 pr-2.5 pl-1 text-xs font-medium text-primary-foreground">
      <Maria estado="reposo" tamano={20} invertida />
      Propuesto por María
    </span>
  );
}
