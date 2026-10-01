"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmbebido } from "../components/ModoEmbebido";
import { AsistenteShell, RUTA_PASO } from "../components/AsistenteShell";
import { SECTORES } from "@/modules/catalogos/components/SelectorSectores";
import { Bloque } from "../components/Bloque";
import { Campo } from "../components/Campo";
import { Chips, CONTROL, CONTROL_SELECT, SoloLectura } from "../components/Comunes";
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

const OPCIONES_SECTOR = SECTORES.map((s) => ({ valor: s.codigo, etiqueta: s.nombre }));

export function PasoEmpresa() {
  const router = useRouter();
  const embebido = useEmbebido();

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
    invalidar: [["empresa"], ["configuracion-contable"], ["estado-configuracion"]],
    // Dentro del chat de IA no se navega: eso sacaba del modo.
    alTerminar: () => {
      if (!embebido) router.push(RUTA_PASO.SEDES);
    },
  });

  const errores = form.formState.errors;
  const sectores = form.watch("sectores");

  return (
    <AsistenteShell
      clave="EMPRESA"
      titulo="Empresa"
      guardando={guardar.isPending}
      alContinuar={form.handleSubmit((d) => guardar.mutate(d))}
    >
      <form className="flex flex-col gap-9" onSubmit={(e) => e.preventDefault()}>
        <Bloque
          titulo="Identificación"
          descripcion="El NIT y el tipo de persona no cambian: otro NIT es otra empresa."
        >
          {/* Lo que no se puede tocar va primero. Es el marco dentro del cual
              se llena el resto, y ponerlo al final obligaría a leer el
              formulario entero para descubrir qué no era editable. */}
          <div className="flex flex-wrap items-start gap-4">
            <Campo id="tipoPersona" etiqueta="Tipo de persona" className="w-44">
              <SoloLectura
                valor={empresa?.tipoPersona === "NATURAL" ? "Natural" : "Jurídica"}
              />
            </Campo>
            <Campo id="nit" etiqueta="NIT" className="w-40">
              <SoloLectura valor={empresa?.nit ?? ""} mono />
            </Campo>
            <Campo id="dv" etiqueta="DV" className="w-18">
              <SoloLectura valor={empresa?.dv ?? ""} mono />
            </Campo>
          </div>

          {/* `flex-1` y no dos columnas de grid: es lo que hace el diseño, y la
              diferencia se nota cuando la fila comparte espacio con un campo de
              ancho fijo — el grid le daría media fila igual. */}
          <div className="flex flex-wrap items-start gap-4">
            <Campo
              id="razonSocial"
              etiqueta="Razón social"
              error={errores.razonSocial?.message}
              className="min-w-56 flex-1"
            >
              <Input
                id="razonSocial"
                className={`${CONTROL} w-full`}
                {...form.register("razonSocial")}
              />
            </Campo>

            <Campo
              id="nombreComercial"
              etiqueta="Nombre comercial (opcional)"
              className="min-w-56 flex-1"
            >
              <Input
                id="nombreComercial"
                className={`${CONTROL} w-full`}
                {...form.register("nombreComercial")}
              />
            </Campo>
          </div>

          {/* Píldoras y no las tarjetas de `SelectorSectores`: aquí la empresa ya
              existe y quien llega sabe a qué se dedica; lo que importa es ver
              de un golpe cuáles quedaron marcados. En `empresa-nueva`, donde
              alguien elige esto por primera vez, siguen las tarjetas con su
              explicación al lado. */}
          <Campo
            id="sectores"
            etiqueta="¿A qué se dedica?"
            ayuda="Suman cuentas al catálogo. Nunca esconden las que respalda el RUT."
          >
            <Chips
              etiquetaGrupo="Sectores de la empresa"
              opciones={OPCIONES_SECTOR}
              elegidos={sectores}
              onAlternar={(valor) =>
                form.setValue(
                  "sectores",
                  (sectores.includes(valor as Datos["sectores"][number])
                    ? sectores.filter((s) => s !== valor)
                    : [...sectores, valor]) as Datos["sectores"],
                )
              }
            />
          </Campo>
        </Bloque>

        <Bloque
          titulo="Políticas contables"
          descripcion="El módulo contable las consulta antes de permitir un asiento."
        >
          <div className="flex flex-wrap items-start gap-4">
            <Campo
              id="grupoNiif"
              etiqueta="Grupo NIIF"
              ayuda="Grupo 2 es lo habitual"
              error={errores.grupoNiif?.message}
              className="w-44"
            >
              {/* `items`: sin él, el cuadro cerrado muestra «GRUPO_2». */}
              <Select
                items={[
                  { value: "GRUPO_1", label: "Grupo 1 · NIIF plenas" },
                  { value: "GRUPO_2", label: "Grupo 2 · NIIF para pymes" },
                  { value: "GRUPO_3", label: "Grupo 3 · Microempresas" },
                ]}
                value={form.watch("grupoNiif")}
                onValueChange={(v) => form.setValue("grupoNiif", v as Datos["grupoNiif"])}
              >
                <SelectTrigger id="grupoNiif" className={CONTROL_SELECT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRUPO_1">Grupo 1 · NIIF plenas</SelectItem>
                  <SelectItem value="GRUPO_2">Grupo 2 · NIIF para pymes</SelectItem>
                  <SelectItem value="GRUPO_3">Grupo 3 · Microempresas</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              id="mesCierreFiscal"
              etiqueta="Mes de cierre"
              error={errores.mesCierreFiscal?.message}
              className="w-28"
            >
              <Input
                id="mesCierreFiscal"
                type="number"
                min={1}
                max={12}
                className={`${CONTROL} font-mono`}
                {...form.register("mesCierreFiscal", { valueAsNumber: true })}
              />
            </Campo>

            <Campo
              id="metodoValoracionInventario"
              etiqueta="Valoración de inventario"
              className="w-44"
            >
              <Select
                items={[
                  { value: "PROMEDIO_PONDERADO", label: "Promedio ponderado" },
                  { value: "PEPS", label: "PEPS" },
                ]}
                value={form.watch("metodoValoracionInventario")}
                onValueChange={(v) =>
                  form.setValue(
                    "metodoValoracionInventario",
                    v as Datos["metodoValoracionInventario"],
                  )
                }
              >
                <SelectTrigger id="metodoValoracionInventario" className={CONTROL_SELECT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMEDIO_PONDERADO">Promedio ponderado</SelectItem>
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
