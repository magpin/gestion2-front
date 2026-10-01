"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  CampoPesos,
  comoNumero,
  comoTexto,
} from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_LINEA_EXTRACTO } from "../types/bancos.types";

const esquema = z.object({
  fecha: z.string().min(1, "Requerido"),
  descripcion: z.string().min(3, "Indique qué dice el extracto").max(300),
  valor: z.number().positive("Tiene que ser mayor a cero"),
  tipo: z.enum(TIPOS_LINEA_EXTRACTO),
});

export type DatosLineaExtracto = z.infer<typeof esquema>;

const CONTROL = "h-10 rounded-lg px-3 text-sm";

/**
 * Una línea a la vez — este corte no importa un archivo del banco, se
 * digita renglón por renglón. Vive inline en el detalle de un extracto
 * `ABIERTO`, no en un diálogo aparte: se espera cargar varias seguidas.
 */
export function FormularioLineaExtracto({
  onAgregar,
  agregando,
}: {
  onAgregar: (datos: DatosLineaExtracto) => void;
  agregando: boolean;
}) {
  const form = useForm<DatosLineaExtracto>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: "", descripcion: "", valor: 0, tipo: "CREDITO" },
  });
  const errores = form.formState.errors;

  return (
    <form
      className="grid gap-3 sm:grid-cols-[140px_1fr_140px_130px_auto] sm:items-end"
      onSubmit={form.handleSubmit((d) => {
        onAgregar(d);
        form.reset({ fecha: d.fecha, descripcion: "", valor: 0, tipo: d.tipo });
      })}
    >
      <label className="flex flex-col gap-1 text-xs font-medium">
        Fecha
        <Input type="date" className={CONTROL} {...form.register("fecha")} />
        {errores.fecha && <span className="text-danger">{errores.fecha.message}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Descripción
        <Input
          className={CONTROL}
          placeholder="Lo que dice el extracto"
          {...form.register("descripcion")}
        />
        {errores.descripcion && <span className="text-danger">{errores.descripcion.message}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Valor
        <Controller
          control={form.control}
          name="valor"
          render={({ field }) => (
            <CampoPesos
              className={CONTROL}
              value={comoTexto(field.value)}
              onChange={(v) => field.onChange(comoNumero(v))}
              onBlur={field.onBlur}
            />
          )}
        />
        {errores.valor && <span className="text-danger">{errores.valor.message}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Tipo
        <Select
          value={form.watch("tipo")}
          onValueChange={(v) => form.setValue("tipo", v as DatosLineaExtracto["tipo"])}
        >
          <SelectTrigger className={`w-full ${CONTROL}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_LINEA_EXTRACTO.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "CREDITO" ? "Crédito" : "Débito"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <Button type="submit" disabled={agregando} className="h-10 rounded-lg px-4 text-sm">
        Agregar
      </Button>
    </form>
  );
}
