"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { formatCOP } from "@/lib/utils";
import { cotizacionSchema, type CotizacionFormData } from "@/lib/validators";
import type { ClienteLookup } from "@/modules/dashboard/lookups/types";
import { useBuscarClientes } from "@/modules/dashboard/lookups/useLookups";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { CotizacionLineasEditor } from "../components/CotizacionLineasEditor";
import { useGetCotizacion } from "../hooks/useCotizaciones";
import {
  useActualizarCotizacion,
  useCrearCotizacion,
} from "../hooks/useCotizacionMutations";
import type { LineaCotizacionPayload } from "../types/cotizaciones.types";

interface CotizacionFormViewProps {
  /** Si viene, es edición: la cotización se reemplaza entera. */
  cotizacionId?: string;
  enModal?: boolean;
  onExito?: (id: string) => void;
  onCerrar?: () => void;
}

const LINEA_VACIA = {
  productoId: "",
  descripcion: "",
  cantidad: 1,
  precioUnitario: 0,
  porcentajeIva: 19,
};

/**
 * Evento A0 · cotizar.
 *
 * Lo más barato del sistema: no asienta, no mueve kardex y no toca el
 * consecutivo fiscal. Por eso se puede editar mientras no se convierta — y
 * editar es reemplazar las líneas, porque no hay nada aguas abajo que proteger.
 */
export function CotizacionFormView({
  cotizacionId,
  enModal,
  onExito,
  onCerrar,
}: CotizacionFormViewProps = {}) {
  const router = useRouter();
  const editando = Boolean(cotizacionId);

  const { data: cotizacion, isLoading } = useGetCotizacion(cotizacionId ?? "");
  const crear = useCrearCotizacion();
  const actualizar = useActualizarCotizacion();
  const terceros = useMapaTerceros();

  const cancelar = () => (enModal ? onCerrar?.() : router.back());

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CotizacionFormData>({
    resolver: zodResolver(cotizacionSchema),
    defaultValues: {
      terceroId: "",
      validoHasta: "",
      observacion: "",
      lineas: [LINEA_VACIA],
    },
  });

  const [clienteQuery, setClienteQuery] = useState("");
  // Solo guarda lo que la persona eligió a mano. Al editar, la etiqueta se
  // DERIVA de la cotización cargada: escribirla en un efecto sería un estado
  // que copia otro y que se desincroniza en cuanto llegue el catálogo.
  const [clienteElegido, setClienteElegido] = useState<string | null>(null);
  const { data: clientes = [], isFetching } = useBuscarClientes(clienteQuery);

  // Al editar, el formulario se rellena con lo que ya está guardado. `reset`
  // sobre el form no es setState en el árbol de React: es la API de RHF para
  // reemplazar los valores de una vez.
  useEffect(() => {
    if (!cotizacion) return;
    reset({
      terceroId: cotizacion.terceroId,
      validoHasta: cotizacion.validoHasta,
      observacion: cotizacion.observacion ?? "",
      lineas: (cotizacion.detalles ?? []).map((linea) => ({
        productoId: linea.productoId ?? "",
        descripcion: linea.descripcion ?? "",
        cantidad: Number(linea.cantidad),
        precioUnitario: Number(linea.precioUnitario),
        porcentajeIva: Number(linea.porcentajeIva),
      })),
    });
  }, [cotizacion, reset]);

  const terceroId = useWatch({ control, name: "terceroId" });
  const etiquetaCliente =
    clienteElegido ?? (terceroId ? terceros.nombre(terceroId) : null) ?? null;

  const lineas = useWatch({ control, name: "lineas" });
  const totales = useMemo(() => {
    let subtotal = 0;
    let iva = 0;
    (lineas ?? []).forEach((linea) => {
      const base = Number(linea?.cantidad ?? 0) * Number(linea?.precioUnitario ?? 0);
      subtotal += base;
      iva += (base * Number(linea?.porcentajeIva ?? 0)) / 100;
    });
    return { subtotal, iva, total: subtotal + iva };
  }, [lineas]);

  const onSubmit = (datos: CotizacionFormData) => {
    const payloadLineas: LineaCotizacionPayload[] = datos.lineas.map((linea) => ({
      productoId: linea.productoId || undefined,
      descripcion: linea.descripcion?.trim() || undefined,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      porcentajeIva: linea.porcentajeIva,
    }));

    const payload = {
      terceroId: datos.terceroId,
      validoHasta: datos.validoHasta || undefined,
      observacion: datos.observacion?.trim() || undefined,
      lineas: payloadLineas,
    };

    if (editando && cotizacionId) {
      actualizar.mutate(
        { id: cotizacionId, data: payload },
        {
          onSuccess: () =>
            enModal
              ? onExito?.(cotizacionId)
              : router.push(`/dashboard/cotizaciones/${cotizacionId}`),
        },
      );
      return;
    }

    crear.mutate(payload, {
      onSuccess: (nueva) =>
        enModal ? onExito?.(nueva.id) : router.push(`/dashboard/cotizaciones/${nueva.id}`),
    });
  };

  if (editando && isLoading) {
    return <SkeletonCard />;
  }

  const guardando = crear.isPending || actualizar.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {!enModal && (
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" className="gap-1.5" onClick={cancelar}>
            <ArrowLeft size={15} strokeWidth={1.75} />
            Volver
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {editando ? `Cotización ${cotizacion?.numero ?? ""}` : "Nueva cotización"}
          </h1>
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
                  </span>
                </span>
              )}
              onSelect={(elegido) => {
                setValue("terceroId", elegido.id, { shouldValidate: true });
                setClienteElegido(`${elegido.nombre} · ${elegido.numeroDocumento}`);
              }}
              placeholder="Buscar cliente…"
              etiquetaSeleccion={etiquetaCliente}
              onLimpiar={() => {
                setClienteElegido("");
                setValue("terceroId", "", { shouldValidate: true });
              }}
              invalido={Boolean(errors.terceroId)}
            />
            {errors.terceroId && (
              <p className="mt-1 text-xs text-destructive">{errors.terceroId.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Válida hasta</label>
            <Input type="date" {...register("validoHasta")} />
            <p className="mt-1 text-xs text-muted-foreground/70">
              En blanco: la calcula la política de la empresa.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Observación</label>
            <Input {...register("observacion")} placeholder="Opcional" />
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground/70">
          <Info size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          El vencimiento se guarda con la cotización: si mañana cambia la política, esta conserva
          la fecha que se le imprimió al cliente.
        </p>
      </Card>

      <Card className="gap-4 p-5">
        <CotizacionLineasEditor
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
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={cancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando} className="gap-2">
          <Save size={16} strokeWidth={1.75} />
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear cotización"}
        </Button>
      </div>
    </form>
  );
}
