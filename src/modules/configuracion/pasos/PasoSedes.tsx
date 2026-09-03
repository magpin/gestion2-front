"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Star } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AsistenteShell } from "../components/AsistenteShell";
import { Bloque, Registrada, Registradas } from "../components/Bloque";
import { Campo } from "../components/Campo";
import { SelectorMunicipio } from "../components/SelectorMunicipio";
import { useGuardar } from "../hooks/useGuardar";
import { empresaApi } from "../services/nucleo.service";

const esquema = z.object({
  codigo: z.string().min(1, "Requerido").max(20),
  nombre: z.string().min(2, "Requerido").max(120),
  direccion: z.string().min(3, "Requerido").max(200),
  municipioCodigo: z.string().regex(/^[0-9]{5}$/, "Elige un municipio"),
  telefono: z.string().max(40).optional(),
  esPrincipal: z.boolean(),
});

type Datos = z.infer<typeof esquema>;

export function PasoSedes() {
  const [agregando, setAgregando] = useState(false);

  const { data: sedes = [] } = useQuery({
    queryKey: ["sedes"],
    queryFn: empresaApi.sedes,
  });
  const activas = sedes.filter((s) => s.activo);
  const hayPrincipal = activas.some((s) => s.es_principal);

  const form = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: String(activas.length + 1).padStart(3, "0"),
      nombre: "",
      direccion: "",
      municipioCodigo: "",
      telefono: "",
      // La primera sede es la principal: no hay otra que pueda serlo.
      esPrincipal: !hayPrincipal,
    },
  });

  const guardar = useGuardar<Datos>({
    fn: (d) =>
      empresaApi.crearSede({
        ...d,
        telefono: d.telefono || undefined,
      }),
    exito: "Sede registrada",
    invalidar: [["sedes"]],
    alTerminar: () => {
      form.reset({
        codigo: String(activas.length + 2).padStart(3, "0"),
        nombre: "",
        direccion: "",
        municipioCodigo: "",
        telefono: "",
        esPrincipal: false,
      });
      setAgregando(false);
    },
  });

  const errores = form.formState.errors;
  const municipio = form.watch("municipioCodigo");

  return (
    <AsistenteShell
      clave="SEDES"
      titulo="Sedes"
      etiquetaContinuar={activas.length > 0 ? "Continuar" : "Omitir"}
    >
      <div className="flex flex-col gap-8">
        {activas.length > 0 && (
          <Bloque
            titulo={
              activas.length === 1 ? "Sede registrada" : "Sedes registradas"
            }
            descripcion="El municipio de la principal decide la tarifa de ICA y viaja en cada factura."
          >
            <Registradas>
              {activas.map((sede) => (
                <Registrada
                  key={sede.id}
                  etiqueta={sede.es_principal ? "Principal" : "Sucursal"}
                  accion={
                    sede.es_principal ? (
                      <Star className="size-3.5 text-brand" />
                    ) : undefined
                  }
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {sede.codigo}
                    </span>
                    <span className="font-medium">{sede.nombre}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {sede.direccion} · {sede.municipio_nombre}
                  </span>
                </Registrada>
              ))}
            </Registradas>
          </Bloque>
        )}

        {agregando || activas.length === 0 ? (
          <Bloque
            titulo={activas.length === 0 ? "Primera sede" : "Nueva sede"}
            descripcion={
              activas.length === 0
                ? "Dónde opera la empresa. Cada sede tiene su propia caja en el plan de cuentas."
                : undefined
            }
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
                <Campo
                  id="codigo"
                  etiqueta="Código"
                  error={errores.codigo?.message}
                >
                  <Input
                    id="codigo"
                    className="font-mono"
                    {...form.register("codigo")}
                  />
                </Campo>
                <Campo
                  id="nombre"
                  etiqueta="Nombre"
                  error={errores.nombre?.message}
                >
                  <Input
                    id="nombre"
                    placeholder="Principal"
                    {...form.register("nombre")}
                  />
                </Campo>
              </div>

              <Campo
                id="direccion"
                etiqueta="Dirección"
                error={errores.direccion?.message}
              >
                <Input id="direccion" {...form.register("direccion")} />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Campo
                  id="municipioCodigo"
                  etiqueta="Municipio"
                  error={errores.municipioCodigo?.message}
                  ayuda="Define la tarifa de ICA y viaja en la factura"
                >
                  <SelectorMunicipio
                    id="municipioCodigo"
                    valor={municipio || null}
                    invalido={Boolean(errores.municipioCodigo)}
                    onCambio={(codigo) =>
                      form.setValue("municipioCodigo", codigo, {
                        shouldValidate: true,
                      })
                    }
                  />
                </Campo>

                <Campo id="telefono" etiqueta="Teléfono">
                  <Input
                    id="telefono"
                    className="font-mono"
                    {...form.register("telefono")}
                  />
                </Campo>
              </div>

              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox
                  checked={form.watch("esPrincipal")}
                  onCheckedChange={(v) =>
                    form.setValue("esPrincipal", v === true)
                  }
                  disabled={!hayPrincipal}
                />
                Es la sede principal
              </label>

              <div className="flex gap-2">
                <Button
                  onClick={form.handleSubmit((d) => guardar.mutate(d))}
                  disabled={guardar.isPending}
                >
                  <Plus className="size-4" />
                  Registrar sede
                </Button>
                {activas.length > 0 && (
                  <Button variant="ghost" onClick={() => setAgregando(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Bloque>
        ) : (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => setAgregando(true)}
          >
            <Plus className="size-4" />
            Agregar otra sede
          </Button>
        )}
      </div>
    </AsistenteShell>
  );
}
