"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/shared/SelectField";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { formatCOP } from "@/lib/utils";
import { compraSchema, type CompraFormData } from "@/lib/validators";
import type { ClienteLookup } from "@/modules/dashboard/lookups/types";
import { useBuscarProveedores } from "@/modules/dashboard/lookups/useLookups";
import { CompraLineasEditor } from "../components/CompraLineasEditor";
import { useCrearCompra } from "../hooks/useCompraMutations";
import {
  CONDICIONES_COMPRA,
  RETEFUENTE_COMPRAS_PCT,
  calcularTotales,
  type NuevaCompraPayload,
} from "../types/compras.types";

interface CompraFormViewProps {
  enModal?: boolean;
  onExito?: (id: string) => void;
  onCerrar?: () => void;
}

/** Hoy en la zona del navegador: `toISOString()` daría la fecha en UTC. */
function hoyLocal(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Evento A1 · registrar la factura del proveedor.
 *
 * Lo que se registra es el papel que llegó con la mercancía: su número y su
 * fecha son de ÉL. Por eso el número es obligatorio y no hay consecutivo que
 * proponer —la empresa no numera lo que recibe—.
 *
 * Tampoco hay medio de pago: pagar es otro evento, con su pantalla y su rol.
 * Incluso al contado la compra nace con saldo, porque si descontara la caja
 * sola el efectivo se movería sin pasar por tesorería y el arqueo del día no
 * cuadraría.
 */
export function CompraFormView({ enModal, onExito, onCerrar }: CompraFormViewProps = {}) {
  const router = useRouter();
  const crear = useCrearCompra();

  const cancelar = () => (enModal ? onCerrar?.() : router.back());

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CompraFormData>({
    resolver: zodResolver(compraSchema),
    defaultValues: {
      terceroId: "",
      numeroFactura: "",
      fecha: hoyLocal(),
      condicion: "CREDITO",
      observacion: "",
      lineas: [{ productoId: "", cantidad: 1, costoUnitario: 0, porcentajeIva: 19 }],
    },
  });

  const [proveedorQuery, setProveedorQuery] = useState("");
  const [proveedorLabel, setProveedorLabel] = useState<string | null>(null);
  const { data: proveedores = [], isFetching } = useBuscarProveedores(proveedorQuery);

  const lineas = useWatch({ control, name: "lineas" });
  const retefuenteEscrita = useWatch({ control, name: "retefuente" });

  // La misma aritmética del backend, para que el total se vea antes de guardar.
  const totales = useMemo(
    () =>
      calcularTotales(
        lineas ?? [],
        typeof retefuenteEscrita === "number" && !Number.isNaN(retefuenteEscrita)
          ? retefuenteEscrita
          : undefined,
      ),
    [lineas, retefuenteEscrita],
  );

  const onSubmit = (datos: CompraFormData) => {
    const payload: NuevaCompraPayload = {
      terceroId: datos.terceroId,
      numeroFactura: datos.numeroFactura.trim(),
      fecha: datos.fecha,
      condicion: datos.condicion,
      // Se manda solo si el usuario la escribió: en blanco, el backend aplica
      // el 2,5 % y esa es la regla que manda.
      retefuente:
        typeof datos.retefuente === "number" && !Number.isNaN(datos.retefuente)
          ? datos.retefuente
          : undefined,
      observacion: datos.observacion?.trim() || undefined,
      lineas: datos.lineas.map((linea) => ({
        productoId: linea.productoId,
        cantidad: linea.cantidad,
        costoUnitario: linea.costoUnitario,
        porcentajeIva: linea.porcentajeIva,
      })),
    };
    crear.mutate(payload, {
      onSuccess: (compra) =>
        enModal ? onExito?.(compra.id) : router.push(`/dashboard/compras/${compra.id}`),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {!enModal && (
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" className="gap-1.5" onClick={cancelar}>
            <ArrowLeft size={15} strokeWidth={1.75} />
            Volver
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva compra</h1>
        </div>
      )}

      <Card className="gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Proveedor</label>
            <SearchPicker<ClienteLookup>
              query={proveedorQuery}
              onQueryChange={setProveedorQuery}
              items={proveedores}
              isLoading={isFetching}
              getKey={(proveedor) => proveedor.id}
              renderItem={(proveedor) => (
                <span className="flex flex-col">
                  <span className="truncate">{proveedor.nombre}</span>
                  <span className="text-xs text-muted-foreground/70">
                    {proveedor.numeroDocumento}
                  </span>
                </span>
              )}
              onSelect={(proveedor) => {
                setValue("terceroId", proveedor.id, { shouldValidate: true });
                setProveedorLabel(`${proveedor.nombre} · ${proveedor.numeroDocumento}`);
              }}
              placeholder="Buscar proveedor…"
              etiquetaSeleccion={proveedorLabel}
              onLimpiar={() => {
                setProveedorLabel(null);
                setValue("terceroId", "", { shouldValidate: true });
              }}
              invalido={Boolean(errors.terceroId)}
            />
            {errors.terceroId && (
              <p className="mt-1 text-xs text-destructive">{errors.terceroId.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Número de la factura
            </label>
            <Input
              placeholder="El que trae el papel del proveedor"
              aria-invalid={Boolean(errors.numeroFactura) || undefined}
              {...register("numeroFactura")}
            />
            {errors.numeroFactura ? (
              <p className="mt-1 text-xs text-destructive">{errors.numeroFactura.message}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground/70">
                La empresa no numera lo que recibe. Repetirlo con el mismo proveedor se rechaza.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
            <Input type="date" {...register("fecha")} />
            {errors.fecha && (
              <p className="mt-1 text-xs text-destructive">{errors.fecha.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Condición</label>
            <Controller
              control={control}
              name="condicion"
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  options={CONDICIONES_COMPRA.map((condicion) => ({
                    value: condicion.id,
                    label: condicion.label,
                  }))}
                />
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground/70">
              Al contado también queda con saldo: pagar se registra en Caja.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Observación <span className="text-muted-foreground/70">(opcional)</span>
          </label>
          <Input placeholder="Queda escrita en la compra…" {...register("observacion")} />
        </div>
      </Card>

      <Card className="gap-4 p-5">
        <CompraLineasEditor
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
        />
      </Card>

      <Card className="gap-3 p-5">
        <div className="ml-auto w-full max-w-sm space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatCOP(totales.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA</span>
            <span className="font-mono">{formatCOP(totales.iva)}</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-muted-foreground">
            <label className="shrink-0" htmlFor="retefuente">
              Retención
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono">−{formatCOP(totales.retefuente)}</span>
              <Input
                id="retefuente"
                type="number"
                step="0.01"
                min="0"
                placeholder={`${RETEFUENTE_COMPRAS_PCT}%`}
                className="h-8 w-28 text-right"
                {...register("retefuente", {
                  setValueAs: (valor) => (valor === "" ? undefined : Number(valor)),
                })}
              />
            </div>
          </div>

          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="font-mono">{formatCOP(totales.total)}</span>
          </div>

          <p className="pt-1 text-xs text-muted-foreground/70">
            En blanco se aplica el {RETEFUENTE_COMPRAS_PCT} % sobre el subtotal. Escríbela para
            cuadrar al peso con la factura. La retención no se le paga al proveedor: se le paga al
            Estado, y por eso baja el total.
          </p>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={cancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending} className="gap-2">
          <Save size={16} strokeWidth={1.75} />
          {crear.isPending ? "Registrando…" : "Registrar compra"}
        </Button>
      </div>
    </form>
  );
}
