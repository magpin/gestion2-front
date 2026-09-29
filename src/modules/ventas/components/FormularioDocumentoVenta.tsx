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
import { admiteDecimales, esEntero } from "@/lib/numeros";
import { formatFecha, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorTercero } from "./SelectorTercero";
import {
  EditorLineasVenta,
  lineaVentaVacia,
  type LineaVentaBorrador,
} from "./EditorLineasVenta";
import { SelectorFormaPago } from "@/modules/tesoreria/components/SelectorFormaPago";
import {
  aFormaPago,
  formaPagoVacia,
  problemaFormaPago,
  type FormaPagoInput,
} from "@/modules/tesoreria/lib/formaPago";
import type { CrearCotizacionInput } from "../types/ventas.types";

/**
 * El formulario de cotización y el de factura son el mismo: cliente, fecha
 * y líneas de producto/cantidad — el `CrearFacturaInput` del backend tiene
 * exactamente esta forma. Lo que cambia entre las dos es el endpoint que
 * llama y lo que pasa después (una factura asienta y descuenta kardex, una
 * cotización no), y eso lo decide quien usa este componente, no el
 * formulario.
 */
export function FormularioDocumentoVenta({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  titulo,
  descripcion,
  etiquetaBoton,
  fechaDeHoy = false,
  precioEditable = false,
  conFormaPago = false,
  inicial,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** `formaPago` llega solo con `conFormaPago`. */
  onGuardar: (datos: CrearCotizacionInput, formaPago?: FormaPagoInput) => void;
  guardando: boolean;
  titulo: string;
  descripcion: string;
  etiquetaBoton: string;
  /**
   * Una factura se emite hoy y ninguna otra fecha, así que el campo se
   * muestra fijo. Una cotización no es un documento fiscal —no numera contra
   * la resolución ni asienta— y puede fecharse cuando haga falta.
   */
  fechaDeHoy?: boolean;
  /**
   * Solo la cotización: deja digitar el precio del producto que no tiene
   * precio de lista, en vez de trabarse. Ver `EditorLineasVenta`.
   */
  precioEditable?: boolean;
  /**
   * Solo la factura: pregunta cómo se paga. Una cotización no mueve plata.
   */
  conFormaPago?: boolean;
  /**
   * La cotización que se está corrigiendo, con su cliente y sus productos ya
   * resueltos. Sin esto, el formulario crea uno nuevo.
   */
  inicial?: {
    /** `null` cuando el borrador no trae un cliente reconocido: se elige acá. */
    tercero: TerceroResumen | null;
    fecha: string;
    lineas: LineaVentaBorrador[];
  };
}) {
  const [tercero, setTercero] = useState<TerceroResumen | null>(
    inicial?.tercero ?? null,
  );
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyEnColombia());
  const [lineas, setLineas] = useState<LineaVentaBorrador[]>(
    inicial?.lineas ?? [lineaVentaVacia()],
  );
  const [formaPago, setFormaPago] = useState(formaPagoVacia);

  const limpiar = () => {
    setTercero(inicial?.tercero ?? null);
    setFecha(inicial?.fecha ?? hoyEnColombia());
    setLineas(inicial?.lineas ?? [lineaVentaVacia()]);
    setFormaPago(formaPagoVacia());
  };

  const sinProducto = lineas
    .map((l, i) => (l.producto === null ? i + 1 : null))
    .filter((n): n is number => n !== null);
  const sinCantidad = lineas
    .map((l, i) =>
      l.cantidad.trim() === "" || Number(l.cantidad) <= 0 ? i + 1 : null,
    )
    .filter((n): n is number => n !== null);
  // Una cantidad con decimales en un producto que va por unidades: pasa si se
  // cambió un producto en kilos por uno en unidades sin corregir la cantidad.
  const sinEntero = lineas
    .map((l, i) =>
      l.producto !== null &&
      !admiteDecimales(l.producto.unidad_medida) &&
      !esEntero(l.cantidad)
        ? i + 1
        : null,
    )
    .filter((n): n is number => n !== null);

  const nombrar = (renglones: number[]) =>
    renglones.length === 1
      ? `el renglón ${renglones[0]}`
      : `los renglones ${renglones.join(", ")}`;

  const impedimento = (): string | null => {
    if (tercero === null) return "Elegí el cliente.";
    if (fecha === "") return "Elegí la fecha.";
    if (lineas.length === 0) return "Agregá al menos una línea.";
    if (sinProducto.length > 0)
      return `Falta el producto en ${nombrar(sinProducto)}.`;
    if (sinCantidad.length > 0)
      return `La cantidad tiene que ser mayor a cero en ${nombrar(sinCantidad)}.`;
    if (sinEntero.length > 0)
      return `La cantidad va en números enteros en ${nombrar(sinEntero)}: ese producto no se fracciona.`;
    if (conFormaPago) return problemaFormaPago(formaPago);
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || tercero === null) return;
    onGuardar(
      {
        terceroId: tercero.id,
        fecha,
        lineas: lineas.map((l) => ({
          productoId: l.producto!.id,
          cantidad: Number(l.cantidad),
          // Solo viaja si se digitó: con precio de lista, el backend lo ignora.
          precioUnitario:
            l.precioUnitario === "" ? undefined : Number(l.precioUnitario),
        })),
      },
      conFormaPago ? aFormaPago(formaPago) : undefined,
    );
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
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Campo id="tercero" etiqueta="Cliente" escala="grande">
              <SelectorTercero valor={tercero} onElegir={setTercero} />
            </Campo>

            <Campo
              id="fecha"
              etiqueta="Fecha"
              escala="grande"
              ayuda={
                fechaDeHoy
                  ? "Un documento fiscal se emite el día que se emite: no se atrasa ni se adelanta."
                  : undefined
              }
            >
              {fechaDeHoy ? (
                <p
                  id="fecha"
                  className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-4 text-sm font-medium"
                >
                  {formatFecha(fecha)}
                </p>
              ) : (
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="h-11 rounded-xl px-4"
                />
              )}
            </Campo>
          </div>

          <EditorLineasVenta
            lineas={lineas}
            onCambiar={setLineas}
            precioEditable={precioEditable}
          />

          {conFormaPago && (
            <SelectorFormaPago valor={formaPago} onCambiar={setFormaPago} cajaFija conVence />
          )}
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
              {etiquetaBoton}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
