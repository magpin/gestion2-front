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
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorProveedor } from "./SelectorProveedor";
import {
  EditorLineasCompra,
  lineaCompraVacia,
  type LineaCompraBorrador,
} from "./EditorLineasCompra";
import {
  EditorRetenciones,
  type RetencionBorrador,
} from "./EditorRetenciones";
import type { CrearCompraInput } from "../types/compras.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Registrar una factura de compra: proveedor, el número que el proveedor
 * le puso a SU factura (dato externo, no lo numeramos nosotros), fecha,
 * líneas de producto/cantidad/costo, y retenciones opcionales.
 */
export function FormularioCompra({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearCompraInput) => void;
  guardando: boolean;
}) {
  const [proveedor, setProveedor] = useState<TerceroResumen | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [numeroFactura, setNumeroFactura] = useState("");
  const [lineas, setLineas] = useState<LineaCompraBorrador[]>([
    lineaCompraVacia(),
  ]);
  const [retenciones, setRetenciones] = useState<RetencionBorrador[]>([]);

  const limpiar = () => {
    setProveedor(null);
    setFecha(hoy());
    setNumeroFactura("");
    setLineas([lineaCompraVacia()]);
    setRetenciones([]);
  };

  const sinProducto = lineas
    .map((l, i) => (l.producto === null ? i + 1 : null))
    .filter((n): n is number => n !== null);
  const sinCantidad = lineas
    .map((l, i) =>
      l.cantidad.trim() === "" || Number(l.cantidad) <= 0 ? i + 1 : null,
    )
    .filter((n): n is number => n !== null);
  const sinCosto = lineas
    .map((l, i) =>
      l.costoUnitario.trim() === "" || Number(l.costoUnitario) < 0
        ? i + 1
        : null,
    )
    .filter((n): n is number => n !== null);
  // El valor ya no se digita —lo calcula el servidor contra el catálogo—, así
  // que lo único que puede faltar es el concepto o la base.
  const retencionesIncompletas = retenciones.some(
    (r) => r.conceptoId === "" || r.base.trim() === "" || Number(r.base) <= 0,
  );

  const nombrar = (renglones: number[]) =>
    renglones.length === 1
      ? `el renglón ${renglones[0]}`
      : `los renglones ${renglones.join(", ")}`;

  const impedimento = (): string | null => {
    if (proveedor === null) return "Elegí el proveedor.";
    if (fecha === "") return "Elegí la fecha.";
    if (numeroFactura.trim() === "")
      return "Escribí el número de la factura del proveedor.";
    if (lineas.length === 0) return "Agregá al menos una línea.";
    if (sinProducto.length > 0)
      return `Falta el producto en ${nombrar(sinProducto)}.`;
    if (sinCantidad.length > 0)
      return `La cantidad tiene que ser mayor a cero en ${nombrar(sinCantidad)}.`;
    if (sinCosto.length > 0)
      return `El costo unitario tiene que ser válido en ${nombrar(sinCosto)}.`;
    if (retencionesIncompletas)
      return "Completá la base y el valor de cada retención, o quitala.";
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || proveedor === null) return;
    onGuardar({
      terceroId: proveedor.id,
      fecha,
      numeroFacturaProveedor: numeroFactura.trim(),
      lineas: lineas.map((l) => ({
        productoId: l.producto!.id,
        cantidad: Number(l.cantidad),
        costoUnitario: Number(l.costoUnitario),
        sinIva: l.sinIva || undefined,
      })),
      retenciones:
        retenciones.length === 0
          ? undefined
          : retenciones.map((r) => ({
              conceptoId: r.conceptoId,
              base: Number(r.base),
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
      <DialogContent size="xl">
        <DialogHeader>
          <div>
            <DialogTitle>Nueva compra</DialogTitle>
            <DialogDescription>
              Asienta y aumenta el kardex al guardar. El costo de cada línea
              es el que dice la factura del proveedor.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px_160px]">
            <Campo id="proveedor" etiqueta="Proveedor" escala="grande">
              <SelectorProveedor valor={proveedor} onElegir={setProveedor} />
            </Campo>

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
              id="numeroFactura"
              etiqueta="N.° factura proveedor"
              escala="grande"
            >
              <Input
                id="numeroFactura"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="FE-12345"
                className="h-11 rounded-xl px-4"
              />
            </Campo>
          </div>

          <EditorLineasCompra lineas={lineas} onCambiar={setLineas} />

          <EditorRetenciones
            retenciones={retenciones}
            onCambiar={setRetenciones}
            fecha={fecha}
            declaranteRenta={proveedor?.declaranteRenta ?? true}
          />
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground">
            {problema ?? "Listo para guardar."}
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
              Registrar compra
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
