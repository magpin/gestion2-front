"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AsistenteShell } from "../components/AsistenteShell";
import { Bloque, Registrada, Registradas } from "../components/Bloque";
import { Campo } from "../components/Campo";
import { CONTROL, EstadoVacio, Pildora } from "../components/Comunes";
import { SelectorMunicipio } from "@/modules/catalogos/components/SelectorMunicipio";
import { useGuardar } from "../hooks/useGuardar";
import { empresaApi } from "../services/nucleo.service";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import { configuracionCajaApi } from "@/modules/tesoreria/services/tesoreria.service";

const esquema = z.object({
  codigo: z.string().min(1, "Requerido").max(20),
  nombre: z.string().min(2, "Requerido").max(120),
  direccion: z.string().min(3, "Requerido").max(200),
  municipioCodigo: z.string().regex(/^[0-9]{5}$/, "Elija un municipio"),
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
    fn: async (d) => {
      const sede = await empresaApi.crearSede({ ...d, telefono: d.telefono || undefined });
      // Una sede agregada con el plan ya armado necesita su caja y su cuenta
      // «Caja - {sede}»: tesorería las crea al preparar. Antes del plan, las
      // crea el paso de Plan de cuentas. Si falla, tesorería lo reintenta al
      // abrirse.
      try {
        if ((await planCuentasApi.listar({ q: "110505" })).length > 0) await configuracionCajaApi.preparar();
      } catch {
        // Sin permiso o sin plan: no frena el registro de la sede.
      }
      return sede;
    },
    exito: "Sede registrada",
    invalidar: [["sedes"], ["estado-configuracion"], ["cajas"], ["plan-cuentas"]],
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
  const mostrarFormulario = agregando || activas.length === 0;

  return (
    <AsistenteShell clave="SEDES" titulo="Sedes">
      <div className="flex flex-col gap-9">
        <Bloque
          titulo={activas.length === 1 ? "Sede registrada" : "Sedes registradas"}
          descripcion="El municipio de la principal decide la tarifa de ICA y viaja en cada factura."
          accion={
            !mostrarFormulario ? (
              <Button variant="outline" size="sm" onClick={() => setAgregando(true)}>
                <Plus className="size-4" />
                Agregar sede
              </Button>
            ) : undefined
          }
        >
          {activas.length === 0 ? (
            <EstadoVacio
              titulo="Aún no hay sedes"
              ayuda="La primera que registre será la principal."
            />
          ) : (
            <Registradas>
              {activas.map((sede) => (
                <Registrada
                  key={sede.id}
                  accion={sede.es_principal ? <Pildora destacada>Principal</Pildora> : undefined}
                >
                  <span className="flex items-baseline gap-2.5">
                    <span className="font-mono text-xs text-muted-foreground">{sede.codigo}</span>
                    <span className="font-medium">{sede.nombre}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {sede.direccion} · {sede.municipio_nombre}
                  </span>
                </Registrada>
              ))}
            </Registradas>
          )}
        </Bloque>

        {mostrarFormulario && (
          <Bloque titulo={activas.length === 0 ? "Primera sede" : "Nueva sede"}>
            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <div className="flex flex-wrap items-start gap-4">
                <Campo
                  id="codigo"
                  etiqueta="Código"
                  error={errores.codigo?.message}
                  className="w-28"
                >
                  <Input
                    id="codigo"
                    className={`${CONTROL} font-mono`}
                    {...form.register("codigo")}
                  />
                </Campo>
                <Campo
                  id="nombre"
                  etiqueta="Nombre"
                  error={errores.nombre?.message}
                  className="min-w-56 flex-1"
                >
                  <Input
                    id="nombre"
                    placeholder="Principal"
                    className={CONTROL}
                    {...form.register("nombre")}
                  />
                </Campo>
              </div>

              <Campo id="direccion" etiqueta="Dirección" error={errores.direccion?.message}>
                <Input id="direccion" className={CONTROL} {...form.register("direccion")} />
              </Campo>

              <div className="flex flex-wrap items-start gap-4">
                <Campo
                  id="municipioCodigo"
                  etiqueta="Municipio"
                  error={errores.municipioCodigo?.message}
                  ayuda="Define la tarifa de ICA y viaja en la factura"
                  className="min-w-56 flex-1"
                >
                  <SelectorMunicipio
                    className={CONTROL}
                    id="municipioCodigo"
                    valor={municipio || null}
                    invalido={Boolean(errores.municipioCodigo)}
                    onCambio={(codigo) =>
                      form.setValue("municipioCodigo", codigo, { shouldValidate: true })
                    }
                  />
                </Campo>

                <Campo id="telefono" etiqueta="Teléfono (opcional)" className="w-40">
                  <Input
                    id="telefono"
                    className={`${CONTROL} font-mono`}
                    {...form.register("telefono")}
                  />
                </Campo>
              </div>

              {/* Con la primera sede la casilla va marcada y sin poder tocarse.
                  Dejarla libre ofrecería una decisión que no existe: si es la
                  única, no hay otra que pueda ser la principal. */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="esPrincipal"
                  className="flex min-h-11 items-center gap-2.5 text-sm"
                >
                  <Checkbox
                    id="esPrincipal"
                    checked={form.watch("esPrincipal")}
                    onCheckedChange={(v) => form.setValue("esPrincipal", v === true)}
                    disabled={!hayPrincipal}
                    aria-describedby={hayPrincipal ? undefined : "esPrincipal-ayuda"}
                  />
                  Es la sede principal
                </label>
                {!hayPrincipal && (
                  <span id="esPrincipal-ayuda" className="text-xs text-muted-foreground">
                    La primera sede siempre es la principal: no hay otra que pueda serlo.
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2">
                {activas.length > 0 && (
                  <Button variant="ghost" onClick={() => setAgregando(false)}>
                    Cancelar
                  </Button>
                )}
                <Button
                  onClick={form.handleSubmit((d) => guardar.mutate(d))}
                  disabled={guardar.isPending}
                >
                  {guardar.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Agregar sede
                </Button>
              </div>
            </form>
          </Bloque>
        )}
      </div>
    </AsistenteShell>
  );
}
