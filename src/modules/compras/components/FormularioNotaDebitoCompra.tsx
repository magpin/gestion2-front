"use client";

import { useState } from "react";
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
import { Campo } from "@/modules/configuracion/components/Campo";
import {
  EditorLineasCompra,
  lineaCompraVacia,
  type LineaCompraBorrador,
} from "./EditorLineasCompra";
import { SelectorCompraVigente } from "./SelectorCompraVigente";
import type {
  CompraDocumentoResumen,
  CrearNotaDebitoCompraInput,
} from "../types/compras.types";

/** Hoy en local, en el formato que espera un `<input type="date">`. */
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Nota débito del proveedor: nos cobra más sobre una compra que ya existe —un
 * flete, un interés, un mayor valor—.
 *
 * Lleva líneas siempre y no copia las de la compra: lo que el proveedor
 * agrega suele ser un concepto nuevo. Reusa `EditorLineasCompra` tal cual,
 * que ya pide producto, cantidad y costo — que es exactamente la forma de
 * esta nota.
 */
export function FormularioNotaDebitoCompra({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  compraFija,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearNotaDebitoCompraInput) => void;
  guardando: boolean;
  compraFija?: CompraDocumentoResumen;
}) {
  const [elegidaAMano, setElegidaAMano] =
    useState<CompraDocumentoResumen | null>(null);
  const compra = compraFija ?? elegidaAMano;
  const [fecha, setFecha] = useState(hoy());
  const [numeroNota, setNumeroNota] = useState("");
  const [motivo, setMotivo] = useState("");
  const [lineas, setLineas] = useState<LineaCompraBorrador[]>([
    lineaCompraVacia(),
  ]);

  const limpiar = () => {
    setElegidaAMano(null);
    setFecha(hoy());
    setNumeroNota("");
    setMotivo("");
    setLineas([lineaCompraVacia()]);
  };

  const impedimento = (): string | null => {
    if (compra === null) return "Elegí la compra sobre la que cobra.";
    if (fecha === "") return "Elegí la fecha.";
    if (numeroNota.trim() === "")
      return "Falta el número que el proveedor le puso a su nota.";
    if (motivo.trim().length < 3)
      return "Contá por qué cobra de más. Es lo primero que lee quien audita.";
    if (lineas.some((l) => l.producto === null))
      return "Cada línea necesita un producto.";
    if (lineas.some((l) => Number(l.cantidad) <= 0))
      return "Cada línea necesita una cantidad mayor a cero.";
    if (lineas.some((l) => Number(l.costoUnitario) <= 0))
      return "Cada línea necesita el costo que cobra el proveedor.";
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
      lineas: lineas.map((l) => ({
        productoId: l.producto!.id,
        cantidad: Number(l.cantidad),
        costoUnitario: Number(l.costoUnitario),
      })),
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
            <DialogTitle>Nota débito del proveedor</DialogTitle>
            <DialogDescription>
              Sube lo que se le debe sobre una compra ya registrada. No mueve
              el kardex ni practica retenciones.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <Campo id="compra" etiqueta="Compra sobre la que cobra" escala="grande">
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
                placeholder="ND-118"
                className="h-11 rounded-xl px-4"
              />
            </Campo>
          </div>

          <Campo id="motivo" etiqueta="Motivo *" escala="grande">
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Flete no incluido en la factura"
              className="min-h-24 rounded-xl px-4 py-3"
            />
          </Campo>

          <div>
            <p className="mb-3 text-sm font-semibold">Qué cobra de más</p>
            <EditorLineasCompra lineas={lineas} onCambiar={setLineas} />
          </div>
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground">
            {problema ?? "Listo para registrar."}
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
              Registrar nota débito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
