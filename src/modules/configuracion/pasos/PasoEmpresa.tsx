"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AsistenteShell, RUTA_PASO } from "../components/AsistenteShell";
import { SelectorSectores } from "@/modules/catalogos/components/SelectorSectores";
import { Bloque } from "../components/Bloque";
import { Campo } from "../components/Campo";
import { useGuardar } from "../hooks/useGuardar";
import { empresaApi } from "../services/nucleo.service";

const esquema = z.object({
  razonSocial: z.string().min(3, "Mínimo 3 caracteres").max(200),
  nombreComercial: z.string().max(200).optional(),
  sectores: z.array(z.enum(["COMERCIO", "SERVICIOS", "MANUFACTURA"])),
  grupoNiif: z.enum(["GRUPO_1", "GRUPO_2", "GRUPO_3"]),
  mesCierreFiscal: z.number().int().min(1).max(12),
  metodoValoracionInventario: z.enum(["PROMEDIO_PONDERADO", "PEPS"]),
});

type Datos = z.infer<typeof esquema>;

export function PasoEmpresa() {
  const router = useRouter();

  const { data: empresa } = useQuery({
    queryKey: ["empresa"],
    queryFn: empresaApi.actual,
  });
  const { data: config } = useQuery({
    queryKey: ["configuracion-contable"],
    queryFn: empresaApi.configuracionContable,
  });

  const form = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      razonSocial: "",
      nombreComercial: "",
      sectores: [],
      grupoNiif: "GRUPO_2",
      mesCierreFiscal: 12,
      metodoValoracionInventario: "PROMEDIO_PONDERADO",
    },
  });

  useEffect(() => {
    if (!empresa || !config) return;
    form.reset({
      razonSocial: empresa.razonSocial,
      nombreComercial: empresa.nombreComercial ?? "",
      sectores: (empresa.sectores ?? []) as Datos["sectores"],
      grupoNiif: config.grupo_niif as Datos["grupoNiif"],
      mesCierreFiscal: config.mes_cierre_fiscal,
      metodoValoracionInventario:
        config.metodo_valoracion_inventario as Datos["metodoValoracionInventario"],
    });
  }, [empresa, config, form]);

  const guardar = useGuardar<Datos>({
    // Son dos endpoints porque son dos cosas distintas: la identificación de la
    // empresa y las políticas con las que lleva su contabilidad.
    fn: async (d) => {
      await empresaApi.editar({
        razonSocial: d.razonSocial,
        nombreComercial: d.nombreComercial || undefined,
        sectores: d.sectores,
      });
      await empresaApi.editarConfiguracionContable({
        grupoNiif: d.grupoNiif,
        mesCierreFiscal: d.mesCierreFiscal,
        metodoValoracionInventario: d.metodoValoracionInventario,
      });
    },
    exito: "Empresa guardada",
    invalidar: [["empresa"], ["configuracion-contable"]],
    alTerminar: () => router.push(RUTA_PASO.SEDES),
  });

  const errores = form.formState.errors;

  return (
    <AsistenteShell
      clave="EMPRESA"
      titulo="Empresa"
      guardando={guardar.isPending}
      alContinuar={form.handleSubmit((d) => guardar.mutate(d))}
    >
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => e.preventDefault()}
      >
        <Bloque
          titulo="Identificación"
          descripcion="Cómo se llama la empresa y con qué número la conoce la DIAN."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="razonSocial"
              etiqueta="Razón social"
              error={errores.razonSocial?.message}
            >
              <Input id="razonSocial" {...form.register("razonSocial")} />
            </Campo>

            <Campo id="nombreComercial" etiqueta="Nombre comercial">
              <Input
                id="nombreComercial"
                {...form.register("nombreComercial")}
              />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-[160px_176px_1fr]">
            <Campo id="nit" etiqueta="NIT" ayuda="No editable">
              <Input
                id="nit"
                readOnly
                className="bg-muted font-mono text-muted-foreground"
                value={empresa ? `${empresa.nit}-${empresa.dv}` : ""}
              />
            </Campo>

            <Campo
              id="tipoPersona"
              etiqueta="Tipo de persona"
              ayuda="No editable"
            >
              <Input
                id="tipoPersona"
                readOnly
                className="bg-muted text-muted-foreground"
                value={
                  empresa?.tipoPersona === "NATURAL" ? "Natural" : "Jurídica"
                }
              />
            </Campo>
          </div>

          <Campo
            id="sectores"
            etiqueta="¿A qué se dedica?"
            ayuda="Suma cuentas al catálogo filtrado; nunca esconde las que respalda tu RUT."
          >
            <SelectorSectores
              valor={form.watch("sectores")}
              onCambio={(v) =>
                form.setValue("sectores", v as Datos["sectores"])
              }
            />
          </Campo>

          <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" />
            Cambiar de NIT es otra persona jurídica, con otra contabilidad y
            otra numeración.
          </p>
        </Bloque>

        <Bloque
          titulo="Configuración contable"
          descripcion="Las políticas con las que lleva sus libros. El módulo contable las consulta antes de permitir un asiento."
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_112px_176px]">
            <Campo
              id="grupoNiif"
              etiqueta="Grupo NIIF"
              ayuda="Grupo 2 es lo habitual"
              error={errores.grupoNiif?.message}
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
                  <SelectItem value="GRUPO_3">
                    Grupo 3 · Microempresas
                  </SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              id="mesCierreFiscal"
              etiqueta="Mes de cierre"
              error={errores.mesCierreFiscal?.message}
            >
              <Input
                id="mesCierreFiscal"
                type="number"
                min={1}
                max={12}
                className="font-mono"
                {...form.register("mesCierreFiscal", { valueAsNumber: true })}
              />
            </Campo>

            <Campo
              id="metodoValoracionInventario"
              etiqueta="Valoración de inventario"
            >
              <Select
                value={form.watch("metodoValoracionInventario")}
                onValueChange={(v) =>
                  form.setValue(
                    "metodoValoracionInventario",
                    v as Datos["metodoValoracionInventario"],
                  )
                }
              >
                <SelectTrigger id="metodoValoracionInventario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMEDIO_PONDERADO">
                    Promedio ponderado
                  </SelectItem>
                  <SelectItem value="PEPS">PEPS</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          </div>
        </Bloque>
      </form>
    </AsistenteShell>
  );
}
