"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/shared/SelectField";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { cn } from "@/lib/utils";
import { terceroSchema, type TerceroFormData } from "@/lib/validators";
import { useGetTercero } from "../hooks/useTerceros";
import { useCreateTercero, useUpdateTercero } from "../hooks/useTerceroMutations";
import { TIPOS_DOCUMENTO, type CrearTerceroPayload } from "../types/terceros.types";

interface TerceroFormViewProps {
  terceroId?: string;
  enModal?: boolean;
  onExito?: (id: string) => void;
  onCerrar?: () => void;
}

/**
 * Alta y edición de un tercero.
 *
 * Nueve campos, no veinte. El modelo de 32 tablas eliminó `municipio`,
 * `cupoCredito`, `plazoPagoDias`, `pctRetencion`, `cuentaBancaria` y las
 * banderas de empleado, socio, banco y entidad gubernamental: eran del esquema
 * viejo y ninguna tenía un evento que las usara.
 *
 * Lo que queda son las dos banderas que SÍ cambian el comportamiento del
 * sistema —cliente y proveedor— más `esAgenteRetenedor`, que decide si al
 * facturarle nace la línea de retención a favor.
 */
export function TerceroFormView({ terceroId, enModal, onExito, onCerrar }: TerceroFormViewProps) {
  const router = useRouter();
  const esEdicion = Boolean(terceroId);
  const cancelar = () => (enModal ? onCerrar?.() : router.back());
  const { data: tercero, isLoading: cargando } = useGetTercero(terceroId ?? "");

  const crear = useCreateTercero();
  const actualizar = useUpdateTercero(terceroId ?? "");
  const mutacion = esEdicion ? actualizar : crear;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TerceroFormData>({
    resolver: zodResolver(terceroSchema),
    defaultValues: {
      tipoDocumento: "CC",
      numeroDocumento: "",
      nombre: "",
      email: "",
      telefono: "",
      direccion: "",
      esCliente: true,
      esProveedor: false,
      esAgenteRetenedor: false,
    },
  });

  useEffect(() => {
    if (!tercero) return;
    reset({
      tipoDocumento: tercero.tipoDocumento,
      numeroDocumento: tercero.numeroDocumento,
      nombre: tercero.nombre,
      email: tercero.email ?? "",
      telefono: tercero.telefono ?? "",
      direccion: tercero.direccion ?? "",
      esCliente: tercero.esCliente,
      esProveedor: tercero.esProveedor,
      esAgenteRetenedor: tercero.esAgenteRetenedor,
    });
  }, [tercero, reset]);

  const enviar = handleSubmit((datos) => {
    const carga: CrearTerceroPayload = {
      ...datos,
      email: datos.email || undefined,
      telefono: datos.telefono || undefined,
      direccion: datos.direccion || undefined,
    };

    mutacion.mutate(carga, {
      onSuccess: (guardado) => {
        if (onExito) onExito(guardado.id);
        else router.push("/dashboard/terceros");
      },
    });
  });

  if (esEdicion && cargando) return <SkeletonCard />;

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Card className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Tipo de documento" error={errors.tipoDocumento?.message}>
            <Controller
              name="tipoDocumento"
              control={control}
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  invalido={Boolean(errors.tipoDocumento)}
                  // El documento identifica al tercero: cambiarlo en una edición
                  // rompería el UNIQUE contra el que ya apuntan sus documentos.
                  disabled={esEdicion}
                  options={TIPOS_DOCUMENTO.map((t) => ({ value: t.value, label: t.label }))}
                />
              )}
            />
          </Campo>

          <Campo label="Número de documento" error={errors.numeroDocumento?.message}>
            <Input
              {...register("numeroDocumento")}
              disabled={esEdicion}
              className={cn(errors.numeroDocumento && "border-destructive")}
            />
          </Campo>
        </div>

        <Campo label="Nombre o razón social" error={errors.nombre?.message}>
          <Input {...register("nombre")} className={cn(errors.nombre && "border-destructive")} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Teléfono" error={errors.telefono?.message}>
            <Input {...register("telefono")} />
          </Campo>
          <Campo label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Campo>
        </div>

        <Campo label="Dirección" error={errors.direccion?.message}>
          <Input {...register("direccion")} />
        </Campo>
      </Card>

      <Card className="space-y-3 p-6">
        <div>
          <h3 className="text-sm font-semibold">Qué es este tercero</h3>
          <p className="text-muted-foreground text-xs">
            El mismo documento puede ser cliente y proveedor a la vez. Lo que no puede es
            no ser ninguno de los dos.
          </p>
        </div>

        <Bandera control={control} name="esCliente" label="Cliente" ayuda="Se le vende y se le factura" />
        <Bandera control={control} name="esProveedor" label="Proveedor" ayuda="Se le compra y se le paga" />
        <Bandera
          control={control}
          name="esAgenteRetenedor"
          label="Agente retenedor"
          ayuda="Al facturarle, él le retiene a la empresa: nace la línea de retención a favor"
        />

        {errors.esCliente?.message && (
          <p className="text-destructive text-xs">{errors.esCliente.message}</p>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={cancelar}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={mutacion.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {mutacion.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear tercero"}
        </Button>
      </div>
    </form>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function Bandera({
  control,
  name,
  label,
  ayuda,
}: {
  control: ReturnType<typeof useForm<TerceroFormData>>["control"];
  name: "esCliente" | "esProveedor" | "esAgenteRetenedor";
  label: string;
  ayuda: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
          <input
            type="checkbox"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="text-muted-foreground block text-xs">{ayuda}</span>
          </span>
        </label>
      )}
    />
  );
}
