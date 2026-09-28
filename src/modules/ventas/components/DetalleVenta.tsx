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
import { useState } from "react";

import { useResponsableIva } from "@/core/hooks/useResponsableIva";
import { mostrarCantidad } from "@/lib/numeros";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleAsiento } from "@/modules/contabilidad/components/DetalleAsiento";
import { PanelMaria } from "./PanelMaria";
import type {
  VentaDocumentoDetalle,
  VentaDocumentoResumen,
} from "../types/ventas.types";

const TITULOS = {
  COTIZACION: "Cotización",
  FACTURA: "Factura",
  NOTA_CREDITO: "Nota crédito",
  NOTA_DEBITO: "Nota débito",
} as const;

/** `SETP-991`, y solo el consecutivo cuando el documento no lleva prefijo. */
function numeroDe(d: { prefijo: string | null; consecutivo: number }) {
  return d.prefijo === null
    ? String(d.consecutivo)
    : `${d.prefijo}-${d.consecutivo}`;
}

/** El detalle de cualquiera de los tres documentos: cabecera y líneas. */
export function DetalleVenta({
  documento,
  onCerrar,
  alCobrar,
}: {
  documento: VentaDocumentoDetalle | null;
  onCerrar: () => void;
  /** Desde el panel de María. Sin esto no se ofrece cobrar. */
  alCobrar?: (documento: VentaDocumentoDetalle) => void;
}) {
  /** El asiento abierto desde el panel de María, con su trazabilidad. */
  const [asiento, setAsiento] = useState<string | null>(null);
  // Una empresa que no liquida IVA no tiene que ver una columna de ceros: el
  // dato es siempre `0` y ocupa lugar sin decir nada.
  const conIva = useResponsableIva();

  return (
    <Dialog open={documento !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {documento && (
          <>
            <DialogHeader>
              <div>
                <DialogTitle>
                  {TITULOS[documento.tipo]} {documento.prefijo ?? ""}
                  {documento.consecutivo}
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
              <PanelMaria
                factura={documento}
                alCobrar={alCobrar && (() => alCobrar(documento))}
                alVerAsiento={() => setAsiento(documento.asiento_id)}
              />
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Producto
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Cantidad
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Precio
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
                          {l.producto_nombre}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {mostrarCantidad(l.cantidad)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCOP(Number(l.precio_unitario))}
                        </td>
                        {conIva && (
                          <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                            {formatCOP(Number(l.iva_valor))}
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

              <div className="ml-auto flex w-full max-w-xs flex-col gap-2 text-sm sm:w-64">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.subtotal))}
                  </span>
                </div>
                {conIva && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA</span>
                    <span className="font-mono">
                      {formatCOP(Number(documento.total_iva))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.total))}
                  </span>
                </div>

                {/* Solo cuando hay notas encima: en un documento sin ellas,
                    el total ya es la respuesta y estas filas sobran. */}
                {Number(documento.ajuste_notas) !== 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Notas</span>
                      <span className="font-mono">
                        {formatCOP(Number(documento.ajuste_notas))}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                      <span>Saldo</span>
                      <span className="font-mono">
                        {formatCOP(Number(documento.saldo_efectivo))}
                      </span>
                    </div>
                  </>
                )}

                {documento.tipo === "FACTURA" &&
                  Number(documento.monto_pagado) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cobrado</span>
                      <span className="font-mono">
                        {formatCOP(Number(documento.monto_pagado))}
                      </span>
                    </div>
                  )}
                {documento.tipo === "FACTURA" &&
                  Number(documento.pendiente) > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>Pendiente</span>
                      <span className="font-mono">
                        {formatCOP(Number(documento.pendiente))}
                      </span>
                    </div>
                  )}
                {Number(documento.saldo_a_favor) > 0 && (
                  <div className="flex justify-between font-semibold text-warning">
                    <span>A favor del cliente</span>
                    <span className="font-mono">
                      {formatCOP(Number(documento.saldo_a_favor))}
                    </span>
                  </div>
                )}
              </div>

              {documento.retencion_aviso && (
                <p className="rounded-xl bg-warning/10 px-4 py-3 text-sm">
                  <span className="font-medium">Retenciones · </span>
                  {documento.retencion_aviso}
                </p>
              )}

              {/* Las dos direcciones del enlace: desde la nota, su factura;
                  desde la factura, las notas que le colgaron encima. */}
              {documento.documento_origen && (
                <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {documento.tipo === "FACTURA" ? "Viene de " : "Corrige "}
                  </span>
                  <span className="font-medium">
                    {TITULOS[documento.documento_origen.tipo]}{" "}
                    {numeroDe(documento.documento_origen)}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {formatFecha(documento.documento_origen.fecha)}
                    {" · "}
                    {formatCOP(Number(documento.documento_origen.total))}
                  </span>
                </p>
              )}

              {documento.notas !== undefined && documento.notas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Notas sobre esta factura
                  </p>
                  {documento.notas.map((n: VentaDocumentoResumen) => (
                    <p
                      key={n.id}
                      className="rounded-xl bg-muted/40 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">
                        {TITULOS[n.tipo]} {numeroDe(n)}
                      </span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {formatFecha(n.fecha)}
                        {" · "}
                        {n.tipo === "NOTA_CREDITO" ? "−" : "+"}
                        {formatCOP(Number(n.total))}
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
                  Este documento está anulado.
                </p>
              )}
            </DialogBody>
            {/* Anidado: al cerrarlo se vuelve a la factura, no a la lista. */}
            <DetalleAsiento
              asientoId={asiento}
              onCerrar={() => setAsiento(null)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
