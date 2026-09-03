"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SelectField } from "@/components/shared/SelectField";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { cn, formatCOP } from "@/lib/utils";
import { useGetImpresion } from "../hooks/useFacturacion";
import {
  ALCANCES_NOTA,
  MOTIVOS_NOTA,
  calcularMontosNota,
  type AlcanceNotaCredito,
  type Factura,
  type LineaNotaCreditoPayload,
  type MotivoNotaCredito,
  type NuevaNotaCreditoPayload,
} from "../types/facturacion.types";

interface NotaCreditoFormModalProps {
  factura: Factura | null;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirmar: (payload: NuevaNotaCreditoPayload) => void;
}

/** Hoy en la zona del navegador: `toISOString()` daría la fecha en UTC. */
function hoyLocal(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Un renglón de la factura con la cantidad que se va a devolver. */
interface RenglonDevuelto {
  descripcion: string;
  productoId?: string | null;
  cantidadOriginal: number;
  cantidad: number;
  precioUnitario: number;
  porcentajeIva: number;
  /** Copiado del impreso. Es el costo con el que SALIÓ, no el promedio de hoy. */
  costoUnitario?: number;
}

/**
 * Evento A7 · emitir la nota crédito.
 *
 * Los renglones no se escriben a mano: se traen del impreso de la factura, que
 * es la única fuente que tiene el `costoUnitario` con el que salió cada
 * producto. Sin ese dato la mercancía volvería al kardex sin costo y el margen
 * de la venta original quedaría distorsionado para siempre.
 *
 * El alcance es la decisión que más pesa y por eso va primero:
 *
 *   · TOTAL — anula la factura y libera el documento de origen, que vuelve a
 *     editarse. Devuelve todos los renglones completos, así que no se editan.
 *   · PARCIAL — devuelve lo que se elija. La factura sigue viva.
 */
export function NotaCreditoFormModal({
  factura,
  onOpenChange,
  loading = false,
  onConfirmar,
}: NotaCreditoFormModalProps) {
  const { data: impresa, isLoading, isError, refetch } = useGetImpresion(factura?.id);

  const [alcance, setAlcance] = useState<AlcanceNotaCredito>("PARCIAL");
  const [motivo, setMotivo] = useState<MotivoNotaCredito>("DEVOLUCION");
  const [fecha, setFecha] = useState(hoyLocal());
  const [observacion, setObservacion] = useState("");
  /**
   * Lo escrito a mano, y nada más.
   *
   * Los renglones no se copian a estado: se derivan del impreso en cada render
   * y se les pega la cantidad que el usuario haya escrito. Copiarlos obligaría
   * a re-sembrarlos con un efecto cada vez que llega la respuesta o cambia el
   * alcance, que es la forma conocida de que la pantalla muestre los renglones
   * de la factura anterior por un instante.
   *
   * La clave ata lo escrito a una factura y un alcance concretos: al cambiar
   * cualquiera de los dos, las cantidades vuelven a cero sin tener que
   * limpiarlas.
   */
  const [edicion, setEdicion] = useState<{
    clave: string;
    cantidades: Record<number, number>;
  }>({ clave: "", cantidades: {} });

  const clave = `${factura?.id ?? ""}-${alcance}`;
  // Memoizado porque alimenta el `useMemo` de abajo: un objeto nuevo en cada
  // render lo recalcularía siempre.
  const cantidades = useMemo(
    () => (edicion.clave === clave ? edicion.cantidades : {}),
    [edicion, clave],
  );

  // En TOTAL no hay nada que elegir: vuelven todos los renglones completos.
  const renglones = useMemo<RenglonDevuelto[]>(
    () =>
      (impresa?.renglones ?? []).map((renglon, indice) => ({
        descripcion: renglon.descripcion,
        productoId: renglon.productoId,
        cantidadOriginal: renglon.cantidad,
        cantidad: alcance === "TOTAL" ? renglon.cantidad : (cantidades[indice] ?? 0),
        precioUnitario: renglon.precioUnitario,
        porcentajeIva: renglon.porcentajeIva,
        costoUnitario: renglon.costoUnitario,
      })),
    [impresa, alcance, cantidades],
  );

  const incluidos = useMemo(
    () => renglones.filter((renglon) => renglon.cantidad > 0),
    [renglones],
  );
  const montos = useMemo(() => calcularMontosNota(incluidos), [incluidos]);

  const excedido = renglones.some(
    (renglon) => renglon.cantidad > renglon.cantidadOriginal,
  );
  const sinLineas = incluidos.length === 0;

  if (!factura) return null;

  const cambiarCantidad = (indice: number, valor: number) => {
    setEdicion({
      clave,
      cantidades: { ...cantidades, [indice]: Number.isNaN(valor) ? 0 : valor },
    });
  };

  const confirmar = () => {
    const lineas: LineaNotaCreditoPayload[] = incluidos.map((renglon) => ({
      productoId: renglon.productoId ?? undefined,
      descripcion: renglon.descripcion,
      cantidad: renglon.cantidad,
      precioUnitario: renglon.precioUnitario,
      costoUnitario: renglon.costoUnitario,
      porcentajeIva: renglon.porcentajeIva,
    }));
    onConfirmar({
      facturaId: factura.id,
      motivo,
      alcance,
      fecha,
      observacion: observacion.trim() || undefined,
      lineas,
    });
  };

  const ayudaAlcance = ALCANCES_NOTA.find((opcion) => opcion.id === alcance)?.ayuda;
  const ayudaMotivo = MOTIVOS_NOTA.find((opcion) => opcion.id === motivo)?.ayuda;

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      titulo={`Nota crédito sobre ${factura.numero}`}
      ancho={720}
    >
      {isLoading && <SkeletonTable filas={4} columnas={4} />}

      {!isLoading && (isError || !impresa) && (
        <EmptyState
          icon={AlertCircle}
          titulo="No se pudieron leer los renglones de la factura"
          descripcion="Sin ellos no se puede devolver: falta el costo con el que salió cada producto."
          accion={{ label: "Reintentar", onClick: () => void refetch() }}
        />
      )}

      {!isLoading && impresa && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Alcance</label>
              <SelectField
                value={alcance}
                onChange={(valor) => setAlcance(valor as AlcanceNotaCredito)}
                options={ALCANCES_NOTA.map((opcion) => ({
                  value: opcion.id,
                  label: opcion.label,
                }))}
              />
              <p className="mt-1 text-xs text-muted-foreground/70">{ayudaAlcance}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Motivo</label>
              <SelectField
                value={motivo}
                onChange={(valor) => setMotivo(valor as MotivoNotaCredito)}
                options={MOTIVOS_NOTA.map((opcion) => ({
                  value: opcion.id,
                  label: opcion.label,
                }))}
              />
              <p className="mt-1 text-xs text-muted-foreground/70">{ayudaMotivo}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
              <Input
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Observación <span className="text-muted-foreground/70">(opcional)</span>
              </label>
              <Input
                value={observacion}
                onChange={(evento) => setObservacion(evento.target.value)}
                placeholder="Queda escrita en la nota…"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Qué se devuelve</h3>
              {alcance === "TOTAL" && (
                <span className="text-xs text-muted-foreground">
                  Todos los renglones, completos
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground/70">
                    <th className="pb-2 font-medium">Descripción</th>
                    <th className="pb-2 text-right font-medium">Facturado</th>
                    <th className="pb-2 text-right font-medium">Devolver</th>
                    <th className="pb-2 text-right font-medium">Precio</th>
                    <th className="pb-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((renglon, indice) => {
                    const excede = renglon.cantidad > renglon.cantidadOriginal;
                    return (
                      <tr key={`${renglon.descripcion}-${indice}`} className="border-t border-border">
                        <td className="py-2 text-foreground">
                          {renglon.descripcion}
                          {!renglon.productoId && (
                            <span className="block text-xs text-muted-foreground/70">
                              servicio · no vuelve al kardex
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right font-mono text-muted-foreground">
                          {renglon.cantidadOriginal}
                        </td>
                        <td className="py-2 text-right">
                          {alcance === "TOTAL" ? (
                            <span className="font-mono text-foreground">{renglon.cantidad}</span>
                          ) : (
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              max={renglon.cantidadOriginal}
                              value={renglon.cantidad}
                              onChange={(evento) =>
                                cambiarCantidad(indice, Number(evento.target.value))
                              }
                              aria-invalid={excede || undefined}
                              className={cn("ml-auto h-8 w-24 text-right", excede && "border-destructive")}
                            />
                          )}
                        </td>
                        <td className="py-2 text-right font-mono text-muted-foreground">
                          {formatCOP(renglon.precioUnitario)}
                        </td>
                        <td className="py-2 text-right font-mono font-medium text-foreground">
                          {formatCOP(renglon.cantidad * renglon.precioUnitario)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {excedido && (
              <p className="text-xs text-destructive">
                No se puede devolver más de lo que se facturó.
              </p>
            )}
            {!excedido && sinLineas && alcance === "PARCIAL" && (
              <p className="text-xs text-muted-foreground/70">
                Escribe cuánto se devuelve de cada renglón. Una nota sin líneas no devuelve nada.
              </p>
            )}
          </div>

          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{formatCOP(montos.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA</span>
              <span className="font-mono">{formatCOP(montos.iva)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
              <span>Total a devolver</span>
              <span className="font-mono">{formatCOP(montos.total)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70">
            La nota toma su propio consecutivo —el rango que la DIAN autoriza es para facturas de
            venta— y deja el asiento que reversa el ingreso. Lo que tenga producto y costo vuelve
            al kardex al costo con el que salió.
          </p>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={loading || excedido || sinLineas}>
              {loading ? "Emitiendo…" : "Emitir nota crédito"}
            </Button>
          </div>
        </div>
      )}
    </FormDialog>
  );
}
