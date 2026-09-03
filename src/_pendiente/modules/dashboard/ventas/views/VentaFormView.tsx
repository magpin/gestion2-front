"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/shared/SelectField";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { formatCOP } from "@/lib/utils";
import { ventaSchema, type VentaFormData } from "@/lib/validators";
import type { ClienteLookup } from "@/modules/dashboard/lookups/types";
import { useBuscarClientes } from "@/modules/dashboard/lookups/useLookups";
import { VentaLineasEditor } from "../components/VentaLineasEditor";
import { useCrearVenta } from "../hooks/useVentaMutations";
import { CONDICIONES_VENTA, type NuevaVentaPayload } from "../types/ventas.types";

interface VentaFormViewProps {
  enModal?: boolean;
  onExito?: (id: string) => void;
  onCerrar?: () => void;
}

/** Evento A3 · la venta de mostrador: nace y se cierra en el mismo acto. */
export function VentaFormView({ enModal, onExito, onCerrar }: VentaFormViewProps = {}) {
  const router = useRouter();
  const crear = useCrearVenta();

  const cancelar = () => (enModal ? onCerrar?.() : router.back());

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      terceroId: "",
      condicion: "CONTADO",
      observacion: "",
      lineas: [{ productoId: "", cantidad: 1, precioUnitario: 0, porcentajeIva: 19 }],
    },
  });

  const [clienteQuery, setClienteQuery] = useState("");
  const [cliente, setCliente] = useState<ClienteLookup | null>(null);
  const { data: clientes = [], isFetching } = useBuscarClientes(clienteQuery);

  const lineas = useWatch({ control, name: "lineas" });
  const totales = useMemo(() => {
    let subtotal = 0;
    let iva = 0;
    (lineas ?? []).forEach((linea) => {
      const base = Number(linea?.cantidad ?? 0) * Number(linea?.precioUnitario ?? 0);
      subtotal += base;
      iva += (base * Number(linea?.porcentajeIva ?? 0)) / 100;
    });
    // La retención NO baja el total: el cliente debe todo eso, solo que una
    // parte se la paga al Estado en nombre de la empresa. Lo que baja es el
    // saldo por cobrar. El 2,5 % lo calcula el backend.
    const retencion = cliente?.esAgenteRetenedor ? subtotal * 0.025 : 0;
    return { subtotal, iva, total: subtotal + iva, retencion, saldo: subtotal + iva - retencion };
  }, [lineas, cliente]);

  const onSubmit = (datos: VentaFormData) => {
    const payload: NuevaVentaPayload = {
      terceroId: datos.terceroId,
      condicion: datos.condicion,
      observacion: datos.observacion?.trim() || undefined,
      lineas: datos.lineas.map((linea) => ({
        productoId: linea.productoId,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        porcentajeIva: linea.porcentajeIva,
      })),
    };
    crear.mutate(payload, {
      onSuccess: (venta) =>
        enModal ? onExito?.(venta.id) : router.push(`/dashboard/ventas/${venta.id}`),
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva venta</h1>
        </div>
      )}

      <Card className="gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Cliente</label>
            <SearchPicker<ClienteLookup>
              query={clienteQuery}
              onQueryChange={setClienteQuery}
              items={clientes}
              isLoading={isFetching}
              getKey={(item) => item.id}
              renderItem={(item) => (
                <span className="flex flex-col">
                  <span className="truncate">{item.nombre}</span>
                  <span className="text-xs text-muted-foreground/70">
                    {item.numeroDocumento}
                    {item.esAgenteRetenedor ? " · agente retenedor" : ""}
                  </span>
                </span>
              )}
              onSelect={(elegido) => {
                setCliente(elegido);
                setValue("terceroId", elegido.id, { shouldValidate: true });
              }}
              placeholder="Buscar cliente…"
              etiquetaSeleccion={
                cliente ? `${cliente.nombre} · ${cliente.numeroDocumento}` : null
              }
              onLimpiar={() => {
                setCliente(null);
                setValue("terceroId", "", { shouldValidate: true });
              }}
              invalido={Boolean(errors.terceroId)}
            />
            {errors.terceroId && (
              <p className="mt-1 text-xs text-destructive">{errors.terceroId.message}</p>
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
                  options={CONDICIONES_VENTA.map((c) => ({ value: c.id, label: c.label }))}
                />
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Observación</label>
            <Input {...register("observacion")} placeholder="Opcional" />
          </div>
        </div>

        {/* Cobrar es otro evento y otra pantalla, incluso al contado: si la
            venta descontara la caja sola, el efectivo no pasaría por tesorería
            y el arqueo del día no cuadraría. */}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground/70">
          <Info size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          La venta deja saldo pendiente incluso al contado. El cobro se registra en Caja: así
          el efectivo pasa por tesorería y el arqueo del día cuadra.
        </p>
      </Card>

      <Card className="gap-4 p-5">
        <VentaLineasEditor
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
        />
      </Card>

      <Card className="gap-3 p-5">
        <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatCOP(totales.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA</span>
            <span className="font-mono">{formatCOP(totales.iva)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="font-mono">{formatCOP(totales.total)}</span>
          </div>
          {totales.retencion > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Retención 2,5 %</span>
                <span className="font-mono">−{formatCOP(totales.retencion)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-warning">
                <span>Queda por cobrar</span>
                <span className="font-mono">{formatCOP(totales.saldo)}</span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground/70">
                Se le factura el total: la retención no baja lo facturado, baja lo que el
                cliente paga. El monto exacto lo calcula el backend.
              </p>
            </>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={cancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending} className="gap-2">
          <Save size={16} strokeWidth={1.75} />
          {crear.isPending ? "Registrando…" : "Registrar venta"}
        </Button>
      </div>
    </form>
  );
}
