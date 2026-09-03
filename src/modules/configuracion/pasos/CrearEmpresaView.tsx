"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronRight } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { digitoVerificacion } from "@/lib/nit";
import { useElegirEmpresa } from "@/modules/auth/hooks/useAuth";
import { SelectorFormaAsociativa } from "@/modules/catalogos/components/SelectorFormaAsociativa";
import { SelectorSectores } from "@/modules/catalogos/components/SelectorSectores";
import { Campo } from "../components/Campo";
import { empresaApi } from "../services/nucleo.service";

const esquema = z.object({
  tipoPersona: z.enum(["JURIDICA", "NATURAL"]),
  razonSocial: z.string().min(3, "Mínimo 3 caracteres").max(200),
  nit: z
    .string()
    .regex(/^[0-9]{5,15}$/, "Entre 5 y 15 dígitos, sin puntos ni guiones"),
  sectores: z.array(z.enum(["COMERCIO", "SERVICIOS", "MANUFACTURA"])),
  /** RUT casilla 63. Solo jurídicas; el backend rechaza que una natural la traiga. */
  formaAsociativaCodigo: z.string().optional(),
  grupoNiif: z.enum(["GRUPO_1", "GRUPO_2", "GRUPO_3"]),
  fechaInicioOperaciones: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD"),
});

type Datos = z.infer<typeof esquema>;

/**
 * El acto anterior al asistente: la empresa todavía no existe.
 *
 * Al crearla, el backend deja a quien la creó como director y devuelve la
 * empresa. Se entra a ella de inmediato —pedir que la elija en una lista de uno
 * sería un paso vacío— y ahí arranca la configuración.
 */
export function CrearEmpresaView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const elegir = useElegirEmpresa();

  const form = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      tipoPersona: "JURIDICA",
      razonSocial: "",
      nit: "",
      sectores: [],
      formaAsociativaCodigo: "",
      grupoNiif: "GRUPO_2",
      fechaInicioOperaciones: new Date().toISOString().slice(0, 10),
    },
  });

  // El DV no se captura: se calcula. La base lo recalcula con `fn_dv_nit` y
  // rechaza la fila si no coincide, así que pedirlo tecleado solo lograba que el
  // formulario se perdiera contra un `ck_empresa_dv` al final.
  const dv = digitoVerificacion(form.watch("nit"));

  const crear = form.handleSubmit(async (datos) => {
    try {
      // El campo vacío se omite: el backend valida dos dígitos y una cadena
      // vacía no los tiene. "Sin definir" tiene que viajar como ausente.
      const empresa = await empresaApi.crear({
        ...datos,
        dv,
        formaAsociativaCodigo: datos.formaAsociativaCodigo || undefined,
      });
      queryClient.clear();
      elegir.mutate(empresa.id);
    } catch (error) {
      aviso.error(mensajeDeError(error));
    }
  });

  const errores = form.formState.errors;
  const enviando = form.formState.isSubmitting || elegir.isPending;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Nueva empresa</h1>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="grid gap-3 sm:grid-cols-[176px_1fr]">
          <Campo id="tipoPersona" etiqueta="Tipo de persona">
            <Select
              value={form.watch("tipoPersona")}
              onValueChange={(v) =>
                form.setValue("tipoPersona", v as Datos["tipoPersona"])
              }
            >
              <SelectTrigger id="tipoPersona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JURIDICA">Jurídica</SelectItem>
                <SelectItem value="NATURAL">Natural</SelectItem>
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            id="razonSocial"
            etiqueta="Razón social"
            error={errores.razonSocial?.message}
          >
            <Input id="razonSocial" {...form.register("razonSocial")} />
          </Campo>
        </div>

        <div className="grid gap-3 sm:grid-cols-[160px_72px_1fr]">
          <Campo id="nit" etiqueta="NIT" error={errores.nit?.message}>
            <Input
              id="nit"
              className="font-mono"
              placeholder="900123456"
              {...form.register("nit")}
            />
          </Campo>

          {/* De solo lectura: el DV es una función del NIT, no una decisión.
              Se muestra igual porque va impreso en el RUT y quien lo tiene
              delante espera verlo coincidir. */}
          <Campo id="dv" etiqueta="DV" ayuda="Se calcula">
            <Input
              id="dv"
              className="font-mono"
              value={dv}
              readOnly
              tabIndex={-1}
              placeholder="–"
            />
          </Campo>
        </div>

        <Campo
          id="sectores"
          etiqueta="¿A qué se dedica?"
          ayuda="Marcá los que apliquen. Se puede dejar en blanco y completarlo después."
        >
          <SelectorSectores
            valor={form.watch("sectores")}
            onCambio={(v) => form.setValue("sectores", v as Datos["sectores"])}
          />
        </Campo>

        {/* La forma asociativa es de las sociedades. A una persona natural el
            backend le rechaza el campo, así que ni se le ofrece. */}
        {form.watch("tipoPersona") === "JURIDICA" && (
          <Campo
            id="formaAsociativa"
            etiqueta="Tipo de sociedad"
            ayuda="RUT casilla 63. Se puede completar después."
          >
            <SelectorFormaAsociativa
              id="formaAsociativa"
              valor={form.watch("formaAsociativaCodigo") ?? ""}
              onCambio={(v) => form.setValue("formaAsociativaCodigo", v)}
            />
          </Campo>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_152px]">
          <Campo
            id="grupoNiif"
            etiqueta="Grupo NIIF"
            ayuda="Grupo 2 es lo habitual"
          >
            <Select
              value={form.watch("grupoNiif")}
              onValueChange={(v) =>
                form.setValue("grupoNiif", v as Datos["grupoNiif"])
              }
            >
              <SelectTrigger id="grupoNiif">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRUPO_1">Grupo 1 · NIIF plenas</SelectItem>
                <SelectItem value="GRUPO_2">
                  Grupo 2 · NIIF para pymes
                </SelectItem>
                <SelectItem value="GRUPO_3">Grupo 3 · Microempresas</SelectItem>
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            id="fechaInicioOperaciones"
            etiqueta="Inicio de operaciones"
            error={errores.fechaInicioOperaciones?.message}
          >
            <Input
              id="fechaInicioOperaciones"
              className="font-mono"
              {...form.register("fechaInicioOperaciones")}
            />
          </Campo>
        </div>

        <div className="flex gap-2">
          <Button onClick={crear} disabled={enviando}>
            Crear y configurar
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => router.push("/empresa")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
