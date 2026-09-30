"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, PackagePlus, ShoppingCart } from "lucide-react";

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
import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { mensajeDeError } from "@/core/api/api";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { cn, formatCOPExacto as pesos, formatFecha, hoyEnColombia } from "@/lib/utils";
import { Seccion } from "@/modules/compras/components/CamposCompra";
import {
  FormularioMovimiento,
  type DatosMovimiento,
} from "@/modules/inventario/components/FormularioMovimiento";
import { kardexApi, productosApi } from "@/modules/inventario/services/inventario.service";
import { SelectorFormaPago } from "@/modules/tesoreria/components/SelectorFormaPago";
import {
  aFormaPago,
  formaPagoVacia,
  problemaFormaPago,
} from "@/modules/tesoreria/lib/formaPago";
import { mostrarCantidad } from "@/lib/numeros";
import { cotizacionesApi, facturasApi } from "../services/ventas.service";
import type {
  ConvertirCotizacionInput,
  FaltanteExistencia,
  VentaDocumentoResumen,
} from "../types/ventas.types";

/**
 * Convertir una cotización en factura. Arriba lo que se va a facturar —el
 * cliente, las líneas al precio cotizado y los totales—, después cómo se paga
 * y, antes del botón, lo que no alcanza en bodega: se avisa **antes** de
 * emitir, y solo se ofrecen salidas que funcionan.
 *
 * El formulario se monta solo con el diálogo abierto: al cerrarlo, se borra.
 */
export function FormularioConvertirCotizacion({
  cotizacion,
  onCerrar,
  onGuardar,
  guardando,
}: {
  cotizacion: VentaDocumentoResumen | null;
  onCerrar: () => void;
  onGuardar: (datos: ConvertirCotizacionInput) => void;
  guardando: boolean;
}) {
  return (
    <Dialog open={cotizacion !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="pantalla">
        {cotizacion !== null && (
          <Formulario cotizacion={cotizacion} onCerrar={onCerrar} onGuardar={onGuardar} guardando={guardando} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  cotizacion,
  onCerrar,
  onGuardar,
  guardando,
}: {
  cotizacion: VentaDocumentoResumen;
  onCerrar: () => void;
  onGuardar: (datos: ConvertirCotizacionInput) => void;
  guardando: boolean;
}) {
  const fecha = hoyEnColombia();
  const [formaPago, setFormaPago] = useState(formaPagoVacia);
  const problemaPago = problemaFormaPago(formaPago);

  const { data: detalle } = useQuery({
    queryKey: ["cotizaciones", "detalle", cotizacion.id],
    queryFn: () => cotizacionesApi.porId(cotizacion.id),
  });

  const lineas = (detalle?.lineas ?? []).map((l) => ({
    productoId: l.producto_id!,
    cantidad: Number(l.cantidad),
  }));
  const existencia = useQuery({
    queryKey: ["facturas", "existencia", cotizacion.id, lineas],
    queryFn: () => facturasApi.existencia(lineas),
    enabled: lineas.length > 0,
    meta: SILENCIOSO,
  });
  const faltantes = existencia.data?.faltantes ?? [];
  const vendeSinExistencia = existencia.data?.vendeSinExistencia ?? false;
  const sinAlcanzar = faltantes.length > 0;

  // Lo que el cliente nos retiene y lo que va a entrar: del servidor, que
  // corre la factura de verdad y la deshace. Mientras no esté la forma de
  // pago, se pregunta como a crédito: los totales no dependen de eso.
  const datosPrevio: ConvertirCotizacionInput = {
    fecha,
    ...(problemaPago === null ? aFormaPago(formaPago) : { formaPago: "CREDITO" as const }),
    ...(sinAlcanzar && vendeSinExistencia && { confirmaSinExistencia: true }),
  };
  const previo = useQuery({
    queryKey: ["facturas", "previo-conversion", cotizacion.id, datosPrevio],
    queryFn: () => facturasApi.previoConversion(cotizacion.id, datosPrevio),
    enabled: detalle !== undefined && existencia.data !== undefined && (!sinAlcanzar || vendeSinExistencia),
    retry: false,
    staleTime: 30_000,
    meta: SILENCIOSO,
  });
  const previa = previo.data;

  const bloqueadoPorExistencia = sinAlcanzar && !vendeSinExistencia;
  const problema =
    problemaPago ??
    (bloqueadoPorExistencia
      ? "No alcanza la existencia: registrá la compra o cargá la existencia antes de emitir."
      : null);

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>
            Convertir {cotizacion.prefijo ?? ""}
            {cotizacion.consecutivo} en factura
          </DialogTitle>
          <DialogDescription>
            Se factura al precio cotizado. Al emitir, numera contra la resolución, asienta y descuenta el
            inventario, igual que cualquier factura.
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex min-w-0 flex-col gap-5">
        <Seccion id="conv-doc" titulo="Lo que se factura">
          <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <SoloLectura etiqueta="Cliente" valor={cotizacion.tercero_nombre} ayuda={cotizacion.tercero_identificacion} />
            <SoloLectura
              etiqueta="Cotización"
              valor={`${cotizacion.prefijo ?? ""}${cotizacion.consecutivo}`}
              ayuda={formatFecha(cotizacion.fecha)}
              mono
            />
            <SoloLectura etiqueta="Fecha de la factura" valor={formatFecha(fecha)} ayuda="Se emite hoy" />
          </div>

          {detalle === undefined ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Cargando las líneas…
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {detalle.lineas.map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{l.producto_codigo}</span>
                    <span className="font-medium">{l.producto_nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {mostrarCantidad(l.cantidad)} × {pesos(Number(l.precio_unitario))} sin IVA
                    </span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{pesos(Number(l.total))}</span>
                </li>
              ))}
            </ul>
          )}

          {detalle !== undefined && (
            <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
              <Fila etiqueta="Subtotal" valor={pesos(previa?.subtotal ?? Number(detalle.subtotal))} />
              {(previa?.iva ?? Number(detalle.total_iva)) > 0 && (
                <Fila etiqueta="IVA" valor={pesos(previa?.iva ?? Number(detalle.total_iva))} />
              )}
              <Fila etiqueta="Total factura" valor={pesos(previa?.total ?? Number(detalle.total))} fuerte />
              {previa?.retenciones.map((r, i) => (
                <Fila key={i} etiqueta={`Te retienen · ${r.nombre}`} valor={`− ${pesos(r.valor)}`} />
              ))}
              {previa && previa.retenido > 0 && <Fila etiqueta="Vas a recibir" valor={pesos(previa.neto)} fuerte />}
              {previo.isError && (
                <p className="text-xs text-danger">{mensajeDeError(previo.error)}</p>
              )}
            </div>
          )}
        </Seccion>

        <Seccion id="conv-pago" titulo="Cómo se paga">
          <SelectorFormaPago
            valor={formaPago}
            onCambiar={setFormaPago}
            cajaFija
            conVence
            total={previa?.neto ?? (detalle ? Number(detalle.total) : null)}
          />
        </Seccion>

        {sinAlcanzar && (
          <BloqueExistencia
            faltantes={faltantes}
            vendeSinExistencia={vendeSinExistencia}
            alCargar={() => existencia.refetch()}
          />
        )}
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">{problema ?? "Listo para emitir."}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-[16.8px] px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-[16.8px] px-6 shadow-[0_8px_20px_rgb(0_0_0/0.15)]"
            disabled={problema !== null || guardando || existencia.isFetching || detalle === undefined}
            onClick={() =>
              onGuardar({
                fecha,
                ...aFormaPago(formaPago),
                ...(sinAlcanzar && vendeSinExistencia && { confirmaSinExistencia: true }),
              })
            }
          >
            {guardando && <Loader2 className="size-4 animate-spin" />}
            {sinAlcanzar && vendeSinExistencia ? "Emitir igual" : "Emitir factura"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function SoloLectura({
  etiqueta,
  valor,
  ayuda,
  mono = false,
}: {
  etiqueta: string;
  valor: string;
  ayuda?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{etiqueta}</span>
      <div className="flex h-[52px] min-w-0 flex-col justify-center rounded-[9.6px] bg-muted px-3.5">
        <span className={cn("truncate text-sm font-semibold", mono && "font-mono")}>{valor}</span>
        {ayuda && <span className="truncate text-[11px] text-muted-foreground">{ayuda}</span>}
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor, fuerte = false }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <p className={cn("flex justify-between gap-3", fuerte && "font-semibold")}>
      <span className={fuerte ? "" : "text-muted-foreground"}>{etiqueta}</span>
      <span className="font-mono whitespace-nowrap tabular-nums">{valor}</span>
    </p>
  );
}

/**
 * Lo que no alcanza, producto por producto. Si la empresa vende sin
 * existencia, se avisa y se puede emitir igual. Si no, emitir queda
 * deshabilitado y se ofrecen las dos salidas que funcionan —a quien puede
 * hacerlas—: registrar la compra, o cargar la existencia ahí mismo.
 */
export function BloqueExistencia({
  faltantes,
  vendeSinExistencia,
  alCargar,
}: {
  faltantes: FaltanteExistencia[];
  vendeSinExistencia: boolean;
  alCargar: () => void;
}) {
  const puedeCargar = useTieneRol("INVENTARIO", "DIRECTOR");
  const puedeComprar = useTieneRol("COMPRAS", "DIRECTOR");
  const [cargando, setCargando] = useState<FaltanteExistencia | null>(null);

  return (
    <section
      aria-labelledby="conv-exist"
      className={cn(
        "flex flex-col gap-3 rounded-[26px] border p-5",
        vendeSinExistencia ? "border-warning/40 bg-warning/10" : "border-danger/30 bg-danger/5",
      )}
    >
      <h2 id="conv-exist" className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="size-4 shrink-0" />
        {faltantes.length === 1 ? "Un producto no alcanza" : `${faltantes.length} productos no alcanzan`}
      </h2>
      <ul className="flex flex-col gap-2">
        {faltantes.map((f) => (
          <li key={f.productoId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0">
              <span className="mr-2 font-mono text-xs text-muted-foreground">{f.codigo}</span>
              {f.nombre}
              <span className="block text-xs text-muted-foreground">
                Pide {f.pide}, hay {f.hay}
                {f.nuncaTuvoEntrada && " · Este producto nunca ha tenido una entrada"}
              </span>
            </span>
            {!vendeSinExistencia && puedeCargar && (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-3 text-sm"
                onClick={() => setCargando(f)}
              >
                <PackagePlus className="size-3.5" />
                Cargar existencia
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {vendeSinExistencia
          ? "Tu empresa vende sin existencia: si emitís igual, el inventario queda en negativo y lo que falta queda en la lista de compras pendientes."
          : "Tu empresa no vende sin existencia. Primero tiene que entrar la mercancía."}
      </p>
      {!vendeSinExistencia && puedeComprar && (
        <Button
          variant="outline"
          className="h-9 w-fit rounded-xl px-3 text-sm"
          render={<Link href="/dashboard/compras/nueva" />}
        >
          <ShoppingCart className="size-3.5" />
          Registrar la compra
        </Button>
      )}
      {cargando !== null && (
        <CargarExistencia
          faltante={cargando}
          onCerrar={() => setCargando(null)}
          alGuardar={() => {
            setCargando(null);
            alCargar();
          }}
        />
      )}
    </section>
  );
}

const ID_CARGA = "cargar-existencia";

/**
 * La entrada que falta, sin salir de la factura: la carga inicial si el
 * producto nunca tuvo una entrada (es una sola vez por producto) o una
 * entrada de ajuste si ya tuvo.
 */
function CargarExistencia({
  faltante,
  onCerrar,
  alGuardar,
}: {
  faltante: FaltanteExistencia;
  onCerrar: () => void;
  alGuardar: () => void;
}) {
  const queryClient = useQueryClient();
  const tipo = faltante.nuncaTuvoEntrada ? "ENTRADA_INICIAL" : "ENTRADA_AJUSTE";
  const { data: producto } = useQuery({
    queryKey: ["productos", "ficha", faltante.productoId],
    queryFn: () => productosApi.porId(faltante.productoId),
  });
  const registrar = useMutation({
    mutationFn: (d: DatosMovimiento) =>
      tipo === "ENTRADA_INICIAL"
        ? kardexApi.cargaInicial(faltante.productoId, d)
        : kardexApi.entradaAjuste(faltante.productoId, d),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos", "movimientos", faltante.productoId] });
      aviso.exito("Existencia cargada");
      alGuardar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>
              {tipo === "ENTRADA_INICIAL" ? "Carga inicial" : "Entrada de ajuste"} de {faltante.codigo}
            </DialogTitle>
            <DialogDescription>Faltan {faltante.faltan} para esta factura.</DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody>
          {producto === undefined ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FormularioMovimiento
              id={ID_CARGA}
              tipo={tipo}
              producto={producto}
              existencia={String(faltante.hay)}
              alGuardar={(d) => registrar.mutate(d)}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_CARGA}
            className="h-12 rounded-xl px-6"
            disabled={registrar.isPending || producto === undefined}
          >
            {registrar.isPending && <Loader2 className="size-4 animate-spin" />}
            Registrar entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
