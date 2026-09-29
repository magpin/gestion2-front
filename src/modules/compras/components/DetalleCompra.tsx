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
import { useResponsableIva } from "@/core/hooks/useResponsableIva";
import { mostrarCantidad } from "@/lib/numeros";
import { formatCOP, formatFecha } from "@/lib/utils";
import { PorQueRetencion } from "@/modules/retenciones/components/PorQueRetencion";
import { CONCEPTOS_RETENCION } from "../types/compras.types";
import type {
  CompraDocumentoDetalle,
  CompraDocumentoResumen,
} from "../types/compras.types";

/** Cómo se nombra cada tipo en pantalla, del lado de compras. */
const TITULOS = {
  FACTURA: "Factura",
  NOTA_CREDITO: "Nota crédito",
  NOTA_DEBITO: "Nota débito",
} as const;

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
  // Una empresa que no liquida IVA compra igual, pero no discrimina: mostrarle
  // una columna de ceros es ruido. Ver `DetalleVenta`.
  const conIva = useResponsableIva();

  return (
    <Dialog open={documento !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {documento && (
          <>
            <DialogHeader>
              <div>
                <DialogTitle>
                  {documento.clase_documento === "DOCUMENTO_SOPORTE" ? "Documento soporte" : "Factura de compra"}{" "}
                  {documento.numero_factura_proveedor}
                  {documento.transmision === "SIN_TRANSMITIR" && (
                        <span className="ml-2 rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 font-sans text-[11px] font-medium">
                          Sin transmitir
                        </span>
                      )}
                </DialogTitle>
                <DialogDescription>
                  {documento.tercero_nombre}
                  {" · "}
                  {documento.tercero_identificacion}
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
                        Qué se compró
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Cantidad
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Costo
                      </th>
                      {conIva && (
                        <th scope="col" className="px-4 py-3 text-right">
                          IVA
                        </th>
                      )}
                      <th scope="col" className="px-4 py-3 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documento.lineas.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 text-sm font-medium">
                          {/* Una línea de gasto no tiene producto: lo que se
                              compró lo dice su detalle, y la cuenta abajo, que
                              es lo que un contador va a querer ver. */}
                          {l.producto_nombre ?? l.detalle}
                          {l.producto_nombre === null && (
                            <span className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
                              {l.concepto_nombre ? `${l.concepto_nombre} · ` : ""}
                              {l.cuenta_codigo} · {l.cuenta_nombre}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {mostrarCantidad(l.cantidad)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCOP(Number(l.costo_unitario))}
                        </td>
                        {conIva && (
                          <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                            {formatCOP(Number(l.iva_valor))}
                            {!l.iva_descontable && Number(l.iva_valor) > 0 && (
                              <span className="ml-1 text-[10px] text-warning">
                                no descontable
                              </span>
                            )}
                          </td>
                        )}
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
                            {r.concepto_nombre ?? etiquetaConcepto(r.concepto)}
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

              {/* El porqué de la retención —o de que no la haya—, con la
                  norma y la base: lo que quedó guardado al registrar. */}
              <PorQueRetencion
                tipo={documento.tipo === "NOTA_CREDITO" ? "NOTA_CREDITO_COMPRA" : "COMPRA"}
                documentoId={documento.id}
                decision={documento.retencion_decision ?? null}
                motivo={documento.retencion_motivo ?? null}
              />

              <div className="ml-auto flex w-full max-w-xs flex-col gap-2 text-sm sm:w-64">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.subtotal))}
                  </span>
                </div>
                {/* Discriminado solo cuando hay de las dos: en un documento
                    todo gravado, repetir el subtotal no aporta nada. */}
                {conIva &&
                  (() => {
                    const gravado = documento.lineas
                      .filter((l) => Number(l.iva_tarifa) > 0)
                      .reduce((t, l) => t + Number(l.subtotal), 0);
                    const sinIva =
                      Number(documento.subtotal) - gravado;
                    if (gravado === 0 || sinIva === 0) return null;
                    return (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Gravado</span>
                          <span className="font-mono">
                            {formatCOP(gravado)}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Sin IVA</span>
                          <span className="font-mono">{formatCOP(sinIva)}</span>
                        </div>
                      </>
                    );
                  })()}
                {conIva && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA</span>
                    <span className="font-mono">
                      {formatCOP(Number(documento.total_iva))}
                    </span>
                  </div>
                )}
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

                {/* Mismo criterio que en el detalle de venta: estas filas solo
                    aparecen cuando hay notas del proveedor encima. */}
                {Number(documento.ajuste_notas) !== 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Notas</span>
                      <span className="font-mono">
                        {formatCOP(Number(documento.ajuste_notas))}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                      <span>Se le debe</span>
                      <span className="font-mono">
                        {formatCOP(Number(documento.neto_efectivo))}
                      </span>
                    </div>
                  </>
                )}

                {Number(documento.monto_pagado) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pagado</span>
                    <span className="font-mono">
                      {formatCOP(Number(documento.monto_pagado))}
                    </span>
                  </div>
                )}
                {Number(documento.pendiente) > 0 && (
                  <div className="flex justify-between font-semibold">
                    <span>Pendiente</span>
                    <span className="font-mono">
                      {formatCOP(Number(documento.pendiente))}
                    </span>
                  </div>
                )}
                {Number(documento.saldo_a_favor) > 0 && (
                  <div className="flex justify-between font-semibold text-warning">
                    <span>A favor nuestro</span>
                    <span className="font-mono">
                      {formatCOP(Number(documento.saldo_a_favor))}
                    </span>
                  </div>
                )}
              </div>

              {/* Las dos direcciones del enlace, igual que en ventas. */}
              {documento.documento_origen && (
                <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Corrige la </span>
                  <span className="font-medium">
                    {TITULOS[documento.documento_origen.tipo].toLowerCase()}{" "}
                    {documento.documento_origen.numero_factura_proveedor}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {formatFecha(documento.documento_origen.fecha)}
                    {" · "}
                    {formatCOP(Number(documento.documento_origen.neto_a_pagar))}
                  </span>
                </p>
              )}

              {documento.notas !== undefined && documento.notas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Notas del proveedor sobre esta factura
                  </p>
                  {documento.notas.map((n: CompraDocumentoResumen) => (
                    <p
                      key={n.id}
                      className="rounded-xl bg-muted/40 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">
                        {TITULOS[n.tipo]} {n.numero_factura_proveedor}
                      </span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {formatFecha(n.fecha)}
                        {" · "}
                        {n.tipo === "NOTA_CREDITO" ? "−" : "+"}
                        {formatCOP(Number(n.neto_a_pagar))}
                      </span>
                      {n.estado === "ANULADA" && (
                        <span className="text-danger"> · anulada</span>
                      )}
                    </p>
                  ))}
                </div>
              )}

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
