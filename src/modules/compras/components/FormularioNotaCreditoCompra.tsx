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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCOP } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCompraVigente } from "./SelectorCompraVigente";
import { comprasApi } from "../services/compras.service";
import type {
  CompraDocumentoResumen,
  CrearNotaCreditoCompraInput,
} from "../types/compras.types";

/** Hoy en local, en el formato que espera un `<input type="date">`. */
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Nota crédito del proveedor: baja lo que se le debe —una devolución, un
 * descuento posterior, un menor valor—.
 *
 * Por defecto devuelve la compra completa, que es el caso corriente. El
 * interruptor de "solo una parte" trae las líneas de la compra y deja poner
 * cuánto de cada una vuelve: es lo que el paso 10 abrió del lado del backend,
 * y sin pantalla no se podía usar.
 *
 * La fecha se elige y no se fuerza a hoy: **la nota del proveedor llega con
 * la fecha que él le puso**, igual que su factura. Es la asimetría con
 * ventas que ya está decidida en el plan.
 */
export function FormularioNotaCreditoCompra({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  compraFija,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearNotaCreditoCompraInput) => void;
  guardando: boolean;
  compraFija?: CompraDocumentoResumen;
}) {
  const [elegidaAMano, setElegidaAMano] =
    useState<CompraDocumentoResumen | null>(null);
  const compra = compraFija ?? elegidaAMano;
  const [fecha, setFecha] = useState(hoy());
  const [numeroNota, setNumeroNota] = useState("");
  const [motivo, setMotivo] = useState("");
  const [porLineas, setPorLineas] = useState(false);
  /** Cuánto vuelve de cada línea, por id de línea. Vacío es "no vuelve nada". */
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  // Las líneas solo se traen cuando hacen falta: la devolución completa no
  // las mira, y son una consulta más contra el servidor.
  const { data: detalle, isFetching } = useQuery({
    queryKey: ["compras", "detalle", compra?.id],
    queryFn: () => comprasApi.porId(compra!.id),
    enabled: porLineas && compra !== null,
  });

  const limpiar = () => {
    setElegidaAMano(null);
    setFecha(hoy());
    setNumeroNota("");
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
    if (compra === null) return "Elegí la compra que se corrige.";
    if (fecha === "") return "Elegí la fecha.";
    if (numeroNota.trim() === "")
      return "Falta el número que el proveedor le puso a su nota.";
    if (motivo.trim().length < 3)
      return "Contá por qué se corrige esta compra. Es lo primero que lee quien audita.";
    if (porLineas && elegidas.length === 0)
      return "Poné cuánto vuelve de al menos una línea.";
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || compra === null) return;
    onGuardar({
      documentoOrigenId: compra.id,
      fecha,
      numeroNotaProveedor: numeroNota.trim(),
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
            <DialogTitle>Nota crédito del proveedor</DialogTitle>
            <DialogDescription>
              Baja lo que se le debe. Si la compra tenía retenciones, se
              reversan en la parte proporcional. No mueve el kardex: si la
              mercancía vuelve al proveedor, se registra aparte como ajuste de
              inventario.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <Campo id="compra" etiqueta="Compra que se corrige" escala="grande">
            {compraFija ? (
              <p className="flex h-11 items-center rounded-xl border border-border bg-muted px-4 text-sm">
                {compraFija.numero_factura_proveedor} ·{" "}
                {compraFija.tercero_nombre}
              </p>
            ) : (
              <SelectorCompraVigente
                valor={compra}
                onElegir={setElegidaAMano}
              />
            )}
          </Campo>

          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <Campo id="fecha" etiqueta="Fecha" escala="grande">
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 rounded-xl px-4"
              />
            </Campo>

            <Campo
              id="numeroNota"
              etiqueta="N.° nota del proveedor"
              escala="grande"
              ayuda="El que trae SU nota, que no es el de la factura."
            >
              <Input
                id="numeroNota"
                value={numeroNota}
                onChange={(e) => setNumeroNota(e.target.value)}
                placeholder="NC-4821"
                className="h-11 rounded-xl px-4"
              />
            </Campo>
          </div>

          <Campo id="motivo" etiqueta="Motivo *" escala="grande">
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Devolución de mercancía averiada"
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

          {porLineas && compra !== null && (
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
                        Comprado
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Costo
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
                          {formatCOP(Number(l.costo_unitario))}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            max={l.cantidad}
                            step="any"
                            value={cantidades[l.id] ?? ""}
                            onChange={(e) =>
                              setCantidades((c) => ({
                                ...c,
                                [l.id]: e.target.value,
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
                : "Devuelve la compra completa.")}
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
              Registrar nota crédito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
