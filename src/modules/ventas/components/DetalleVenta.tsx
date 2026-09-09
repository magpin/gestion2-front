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
import { useMapaClientes, useMapaProductos } from "../hooks/useMapasVenta";
import type { VentaDocumentoDetalle } from "../types/ventas.types";

const TITULOS = {
  COTIZACION: "Cotización",
  FACTURA: "Factura",
  NOTA_CREDITO: "Nota crédito",
} as const;

/** El detalle de cualquiera de los tres documentos: cabecera y líneas. */
export function DetalleVenta({
  documento,
  onCerrar,
}: {
  documento: VentaDocumentoDetalle | null;
  onCerrar: () => void;
}) {
  const clientes = useMapaClientes();
  const productos = useMapaProductos();

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
                  {clientes.get(documento.tercero_id) ?? documento.tercero_id}
                  {" · "}
                  {formatFecha(documento.fecha)}
                </DialogDescription>
              </div>
              <DialogCloseIcon />
            </DialogHeader>

            <DialogBody className="flex flex-col gap-5">
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
                          {productos.get(l.producto_id)?.nombre ??
                            l.producto_id}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {l.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCOP(Number(l.precio_unitario))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                          {formatCOP(Number(l.iva_valor))}
                        </td>
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
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.total_iva))}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="font-mono">
                    {formatCOP(Number(documento.total))}
                  </span>
                </div>
              </div>

              {documento.estado === "ANULADA" && (
                <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                  Este documento está anulado.
                </p>
              )}
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
