"use client";

import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCOP, formatFecha } from "@/lib/utils";
import { CONCEPTOS_RETENCION } from "../types/compras.types";
import type { CompraDocumentoDetalle } from "../types/compras.types";

const etiquetaConcepto = (c: string): string =>
  CONCEPTOS_RETENCION.find((x) => x.valor === c)?.etiqueta ?? c;

/** El detalle de una compra: cabecera, líneas y retenciones. */
export function DetalleCompra({
  documento,
  onCerrar,
}: {
  documento: CompraDocumentoDetalle | null;
  onCerrar: () => void;
}) {

  return (
    <Dialog open={documento !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {documento && (
          <>
            <DialogHeader>
              <div>
                <DialogTitle>
                  Factura de compra {documento.numero_factura_proveedor}
                </DialogTitle>
                <DialogDescription>
                  {documento.tercero_nombre}
                  {" · "}
                  {formatFecha(documento.fecha)}
                </DialogDescription>
              </div>
              <DialogCloseIcon />
            </DialogHeader>

            <DialogBody className="flex flex-col gap-5">
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Producto
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Cantidad
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Costo
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        IVA
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documento.lineas.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 text-sm font-medium">
                          {l.producto_nombre}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {l.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCOP(Number(l.costo_unitario))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                          {formatCOP(Number(l.iva_valor))}
                          {!l.iva_descontable && Number(l.iva_valor) > 0 && (
                            <span className="ml-1 text-[10px] text-warning">
                              no descontable
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                          {formatCOP(Number(l.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {documento.retenciones.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[480px] text-left">
                    <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Retención
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Base
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {documento.retenciones.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-sm font-medium">
                            {etiquetaConcepto(r.concepto)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatCOP(Number(r.base))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                            {formatCOP(Number(r.valor))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="ml-auto flex w-full max-w-xs flex-col gap-2 text-sm sm:w-64">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.subtotal))}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.total_iva))}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total factura</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.total))}
                  </span>
                </div>
                {Number(documento.total_retenciones) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Retenido</span>
                    <span className="font-mono">
                      −{formatCOP(Number(documento.total_retenciones))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>Neto a pagar</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.neto_a_pagar))}
                  </span>
                </div>
              </div>

              {documento.estado === "ANULADA" && (
                <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                  Esta compra está anulada.
                </p>
              )}
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
