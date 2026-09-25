"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
import { CampoCantidad } from "@/components/shared/CampoNumero";
import { Textarea } from "@/components/ui/textarea";
import { esEntero } from "@/lib/numeros";
import { formatCOP, formatFecha, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorFacturaVigente } from "./SelectorFacturaVigente";
import { facturasApi } from "../services/ventas.service";
import type {
  CrearNotaCreditoInput,
  VentaDocumentoResumen,
} from "../types/ventas.types";

/**
 * Nota crédito: baja lo que el cliente debe sobre una factura EMITIDA.
 *
 * Por defecto reversa la factura completa, que es el caso corriente. El
 * interruptor de "devolver solo una parte" trae las líneas de la factura y
 * deja poner cuánto de cada una vuelve —el precio y el IVA no se piden: son
 * los de la factura, no se renegocian al corregir—. Misma forma que la nota
 * crédito de compra, y a propósito: es el mismo acto de los dos lados.
 *
 * `facturaFija`, cuando viene, la deja sin cambiar y sin buscador: es el
 * caso de abrir esto desde el detalle de una factura ya elegida.
 */
export function FormularioNotaCredito({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  facturaFija,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearNotaCreditoInput) => void;
  guardando: boolean;
  facturaFija?: VentaDocumentoResumen;
}) {
  // `facturaFija` puede cambiar sin que este diálogo se desmonte —el mismo
  // formulario se reabre desde filas distintas de la lista de facturas—, así
  // que la elegida es la fija cuando viene, nunca lo que quedó en el estado
  // de una apertura anterior.
  const [elegidaAMano, setElegidaAMano] = useState<VentaDocumentoResumen | null>(
    null,
  );
  const factura = facturaFija ?? elegidaAMano;
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [motivo, setMotivo] = useState("");
  const [porLineas, setPorLineas] = useState(false);
  /** Cuánto vuelve de cada línea, por id de línea. Vacío es "no vuelve nada". */
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  // Las líneas solo se traen cuando hacen falta: la reversa completa no las
  // mira, y son una consulta más contra el servidor.
  const { data: detalle, isFetching } = useQuery({
    queryKey: ["facturas", "detalle", factura?.id],
    queryFn: () => facturasApi.porId(factura!.id),
    enabled: porLineas && factura !== null,
  });

  const limpiar = () => {
    setElegidaAMano(null);
    setFecha(hoyEnColombia());
    setMotivo("");
    setPorLineas(false);
    setCantidades({});
  };

  const elegidas = Object.entries(cantidades)
    .map(([lineaOrigenId, cantidad]) => ({
      lineaOrigenId,
      cantidad: Number(cantidad),
    }))
    .filter((l) => l.cantidad > 0);

  const impedimento = (): string | null => {
    if (factura === null) return "Elegí la factura que vas a corregir.";
    if (fecha === "") return "Elegí la fecha.";
    if (motivo.trim().length < 3)
      return "Contá por qué se corrige esta factura. Es lo primero que lee quien audita.";
    if (porLineas && elegidas.length === 0)
      return "Poné cuánto vuelve de al menos una línea.";
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || factura === null) return;
    onGuardar({
      documentoOrigenId: factura.id,
      fecha,
      motivo: motivo.trim(),
      ...(porLineas ? { lineas: elegidas } : {}),
    });
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(a) => {
        if (!a) {
          onCerrar();
          limpiar();
        }
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Nota crédito</DialogTitle>
            <DialogDescription>
              Baja lo que el cliente debe: la factura completa, o solo las
              cantidades que elijas. Si la mercancía vuelve a bodega, se
              registra aparte como ajuste de inventario.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <Campo id="factura" etiqueta="Factura a corregir" escala="grande">
            {facturaFija ? (
              <p className="flex h-11 items-center rounded-xl border border-border bg-muted px-4 text-sm">
                {facturaFija.prefijo ?? ""}
                {facturaFija.consecutivo}
              </p>
            ) : (
              <SelectorFacturaVigente valor={factura} onElegir={setElegidaAMano} />
            )}
          </Campo>

          <Campo
            id="fecha"
            etiqueta="Fecha"
            escala="grande"
            ayuda="Un documento fiscal se emite el día que se emite: no se atrasa ni se adelanta."
          >
            <p
              id="fecha"
              className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-4 text-sm font-medium"
            >
              {formatFecha(fecha)}
            </p>
          </Campo>

          <Campo id="motivo" etiqueta="Motivo *" escala="grande">
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Devolución por producto defectuoso"
              className="min-h-24 rounded-xl px-4 py-3"
            />
          </Campo>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={porLineas}
              onChange={(e) => {
                setPorLineas(e.target.checked);
                setCantidades({});
              }}
              className="size-4 rounded border-border"
            />
            Devolver solo una parte
          </label>

          {porLineas && factura !== null && (
            <div className="overflow-x-auto rounded-2xl border border-border">
              {isFetching ? (
                <div className="flex justify-center py-10 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : (
                <table className="w-full min-w-[520px] text-left">
                  <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Producto
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Facturado
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Precio
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Vuelve
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(detalle?.lineas ?? []).map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 text-sm font-medium">
                          {l.producto_nombre}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {l.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                          {formatCOP(Number(l.precio_unitario))}
                        </td>
                        <td className="px-4 py-3">
                          <CampoCantidad
                            fraccionable={!esEntero(l.cantidad)}
                            value={cantidades[l.id] ?? ""}
                            onChange={(cantidad) =>
                              setCantidades((c) => ({
                                ...c,
                                [l.id]: cantidad,
                              }))
                            }
                            placeholder="0"
                            className="h-11 w-28 rounded-xl px-4 text-right font-mono"
                            aria-label={`Cuánto vuelve de ${l.producto_nombre}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground">
            {problema ??
              (porLineas
                ? `Vuelven ${elegidas.length} línea(s).`
                : "Reversa la factura completa.")}
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-12 rounded-xl px-6"
              disabled={problema !== null || guardando}
              onClick={enviar}
            >
              {guardando && <Loader2 className="size-4 animate-spin" />}
              Emitir nota crédito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
