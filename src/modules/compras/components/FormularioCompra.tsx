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
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorProveedor } from "./SelectorProveedor";
import {
  EditorLineasCompra,
  lineaCompleta,
  lineaCompraVacia,
  type LineaCompraBorrador,
} from "./EditorLineasCompra";
import { useTieneRol } from "@/core/store/authStore";
import { PropuestaRenta } from "@/modules/retenciones/components/PropuestaRenta";
import { useSimulacionRenta } from "@/modules/retenciones/hooks/useSimulacionRenta";
import {
  aEnvioRenta,
  problemaRenta,
  respuestasRentaVacias,
} from "@/modules/retenciones/types/retenciones.types";
import { comprasApi } from "../services/compras.service";
import { retencionesApi } from "@/modules/retenciones/services/retenciones.service";
import { useQuery } from "@tanstack/react-query";
import { SelectorFormaPago } from "@/modules/tesoreria/components/SelectorFormaPago";
import {
  aFormaPago,
  formaPagoVacia,
  problemaFormaPago,
} from "@/modules/tesoreria/lib/formaPago";
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
  // Dónde se recibe la compra: decide dónde se causa la ReteICA. Solo se
  // pregunta si la empresa tiene sedes en más de un municipio.
  const [municipio, setMunicipio] = useState("");
  const { data: municipiosIca = [] } = useQuery({
    queryKey: ["retenciones", "ica"],
    queryFn: retencionesApi.ica,
    enabled: abierto,
  });
  const [renta, setRenta] = useState(respuestasRentaVacias);
  const [conTarjeta, setConTarjeta] = useState(false);
  const [formaPago, setFormaPago] = useState(formaPagoVacia);
  // Pagar de contado saca plata de una caja o un banco: el backend lo rechaza
  // de quien no tenga CAJA o DIRECTOR, así que acá ni se ofrece.
  const puedePagar = useTieneRol("CAJA", "DIRECTOR");

  const limpiar = () => {
    setProveedor(null);
    setFecha(hoy());
    setNumeroFactura("");
    setLineas([lineaCompraVacia()]);
    setMunicipio("");
    setRenta(respuestasRentaVacias());
    setConTarjeta(false);
    setFormaPago(formaPagoVacia());
  };

  // Una línea está incompleta por razones distintas según lo que sea: a la
  // de producto le falta el producto; a la de gasto, la cuenta o el detalle.
  const incompletas = lineas
    .map((l, i) => (lineaCompleta(l) ? null : i + 1))
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
  const sinCosto = lineas
    .map((l, i) =>
      l.costoUnitario.trim() === "" || Number(l.costoUnitario) < 0
        ? i + 1
        : null,
    )
    .filter((n): n is number => n !== null);

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
    if (incompletas.length > 0)
      return `Falta decir qué se compró en ${nombrar(incompletas)}: el producto, o la cuenta y el detalle del gasto.`;
    if (sinCantidad.length > 0)
      return `La cantidad tiene que ser mayor a cero en ${nombrar(sinCantidad)}.`;
    if (sinEntero.length > 0)
      return `La cantidad va en números enteros en ${nombrar(sinEntero)}: ese producto no se fracciona.`;
    if (sinCosto.length > 0)
      return `El costo unitario tiene que ser válido en ${nombrar(sinCosto)}.`;
    return problemaFormaPago(formaPago);
  };

  const lineasParaEnviar = () =>
    lineas.map((l) =>
        l.tipo === "PRODUCTO"
          ? {
              productoId: l.producto!.id,
              cantidad: Number(l.cantidad),
              costoUnitario: Number(l.costoUnitario),
              sinIva: l.sinIva || undefined,
            }
          : {
              cuentaId: l.cuenta!.id,
              detalle: l.detalle.trim(),
              ivaTarifa: Number(l.ivaTarifa),
              cantidad: Number(l.cantidad),
              costoUnitario: Number(l.costoUnitario),
            },
      );

  // La retención de renta la propone el servidor —el mismo motor que corre al
  // registrar—. Se pide cuando hay proveedor y todas las líneas completas.
  const lineasListas =
    lineas.length > 0 &&
    incompletas.length === 0 &&
    sinCantidad.length === 0 &&
    sinCosto.length === 0;
  const simulacion = useSimulacionRenta(
    "compra",
    proveedor !== null && fecha !== "" && lineasListas && !renta.sinRetencion
      ? {
          terceroId: proveedor.id,
          fecha,
          lineas: lineasParaEnviar(),
          ...aEnvioRenta(renta),
          ...(conTarjeta && { pagadaConTarjeta: true }),
          ...(municipio !== "" && { municipioCodigo: municipio }),
        }
      : null,
    comprasApi.simularRetencion,
  );

  const problema = impedimento() ?? problemaRenta(simulacion.propuesta, renta);

  const enviar = () => {
    if (problema !== null || proveedor === null) return;
    onGuardar({
      terceroId: proveedor.id,
      fecha,
      numeroFacturaProveedor: numeroFactura.trim(),
      lineas: lineasParaEnviar(),
      ...aEnvioRenta(renta),
      ...(conTarjeta && { pagadaConTarjeta: true }),
      ...(municipio !== "" && { municipioCodigo: municipio }),
      ...aFormaPago(formaPago),
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

          <PropuestaRenta
            propuesta={simulacion.propuesta}
            cargando={simulacion.cargando}
            error={simulacion.error}
            respuestas={renta}
            onCambiar={setRenta}
          />
          {/* Con tarjeta la retención la practica la entidad de la tarjeta,
              no la empresa (caso borde 6). */}
          <label className="-mt-4 flex w-fit items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={conTarjeta}
              onChange={(e) => setConTarjeta(e.target.checked)}
            />
            La pagué con tarjeta débito o crédito
          </label>

          {municipiosIca.length > 1 && (
            <label className="-mt-2 flex w-fit flex-col gap-1.5 text-xs text-muted-foreground">
              Dónde se recibe (decide el municipio de la ReteICA)
              <select
                className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              >
                <option value="">
                  {municipiosIca.find((m) => m.es_principal)?.nombre ?? "La sede principal"} (principal)
                </option>
                {municipiosIca
                  .filter((m) => !m.es_principal)
                  .map((m) => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.nombre}
                    </option>
                  ))}
              </select>
            </label>
          )}

          <SelectorFormaPago
            valor={formaPago}
            onCambiar={setFormaPago}
            soloCredito={!puedePagar}
            motivoSoloCredito="Pagar de contado lo hace alguien con rol Caja o Director. Registrala a crédito y que caja la pague."
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
