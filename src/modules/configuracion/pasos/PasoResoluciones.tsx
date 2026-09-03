"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Plus } from "lucide-react";
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
import { AsistenteShell, RUTA_PASO } from "../components/AsistenteShell";
import { Bloque } from "../components/Bloque";
import { Campo } from "../components/Campo";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useGuardar } from "../hooks/useGuardar";
import { resolucionesApi } from "../services/nucleo.service";

const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

const esquema = z
  .object({
    tipoDocumento: z.enum([
      "FACTURA_VENTA",
      "NOTA_CREDITO",
      "NOTA_DEBITO",
      "DOCUMENTO_SOPORTE",
    ]),
    numeroResolucion: z.string().min(1, "Requerido").max(30),
    prefijo: z.string().max(6).optional(),
    rangoDesde: z.number().int().min(0),
    rangoHasta: z.number().int().min(1),
    fechaResolucion: FECHA,
    fechaVigenciaDesde: FECHA,
    fechaVigenciaHasta: FECHA,
    ambiente: z.enum(["HABILITACION", "PRODUCCION"]),
    claveTecnica: z.string().optional(),
  })
  .refine((d) => d.rangoHasta >= d.rangoDesde, {
    message: "El rango está invertido",
    path: ["rangoHasta"],
  })
  .refine((d) => d.fechaVigenciaHasta >= d.fechaVigenciaDesde, {
    message: "La vigencia está invertida",
    path: ["fechaVigenciaHasta"],
  });

type Datos = z.infer<typeof esquema>;

const TIPOS: Array<[Datos["tipoDocumento"], string]> = [
  ["FACTURA_VENTA", "Factura de venta"],
  ["NOTA_CREDITO", "Nota crédito"],
  ["NOTA_DEBITO", "Nota débito"],
  ["DOCUMENTO_SOPORTE", "Documento soporte"],
];

export function PasoResoluciones() {
  const router = useRouter();
  const { data: estado } = useEstadoConfiguracion();
  const { data: resoluciones = [] } = useQuery({
    queryKey: ["resoluciones"],
    queryFn: resolucionesApi.listar,
  });

  const paso = estado?.pasos.find((p) => p.clave === "RESOLUCIONES");
  const activas = resoluciones.filter((r) => r.activa);

  const form = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      tipoDocumento: "FACTURA_VENTA",
      numeroResolucion: "",
      prefijo: "",
      rangoDesde: 1,
      rangoHasta: 5000,
      fechaResolucion: "",
      fechaVigenciaDesde: "",
      fechaVigenciaHasta: "",
      ambiente: "PRODUCCION",
      claveTecnica: "",
    },
  });

  const guardar = useGuardar<Datos>({
    fn: (d) =>
      resolucionesApi.crear({
        ...d,
        prefijo: d.prefijo || undefined,
        claveTecnica: d.claveTecnica || undefined,
        reemplazarActiva: true,
      }),
    exito: "Resolución registrada",
    invalidar: [["resoluciones"]],
    alTerminar: () => form.reset(),
  });

  const errores = form.formState.errors;

  return (
    <AsistenteShell
      clave="RESOLUCIONES"
      titulo="Resoluciones"
      alContinuar={() => router.push("/dashboard")}
      etiquetaContinuar={paso?.estado === "LISTO" ? "Continuar" : "Omitir"}
    >
      <div className="flex flex-col gap-8">
        {activas.length > 0 && (
          <Bloque
            titulo="Numeración vigente"
            descripcion="Cuando el consecutivo llega al final, la resolución se agotó y hay que pedir otra a la DIAN."
          >
            <div className="overflow-hidden rounded-xl border border-border">
              {activas.map((r) => {
                const restantes =
                  Number(r.rango_hasta) - Number(r.consecutivo_actual);
                const usado =
                  ((Number(r.consecutivo_actual) - Number(r.rango_desde) + 1) /
                    (Number(r.rango_hasta) - Number(r.rango_desde) + 1)) *
                  100;

                return (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {TIPOS.find((t) => t[0] === r.tipo_documento)?.[1] ??
                            r.tipo_documento}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {r.numero_resolucion} · {r.prefijo ?? "sin prefijo"}{" "}
                          {r.rango_desde}–{r.rango_hasta}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-sm font-semibold">
                          {restantes}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          restantes
                        </span>
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${usado > 85 ? "bg-warning" : "bg-success"}`}
                        style={{ width: `${Math.max(usado, 1)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Vence {r.fecha_vigencia_hasta}
                    </span>
                  </div>
                );
              })}
            </div>
          </Bloque>
        )}

        <Bloque
          titulo={
            activas.length > 0
              ? "Registrar otra resolución"
              : "Resolución de facturación"
          }
          descripcion={
            activas.length > 0
              ? undefined
              : "Sin la resolución de factura de venta no hay numeración que ponerle a un documento."
          }
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="grid gap-3 sm:grid-cols-[176px_1fr_112px]">
              <Campo id="tipoDocumento" etiqueta="Tipo de documento">
                <Select
                  value={form.watch("tipoDocumento")}
                  onValueChange={(v) =>
                    form.setValue("tipoDocumento", v as Datos["tipoDocumento"])
                  }
                >
                  <SelectTrigger id="tipoDocumento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(([valor, nombre]) => (
                      <SelectItem key={valor} value={valor}>
                        {nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo
                id="numeroResolucion"
                etiqueta="Número de resolución"
                error={errores.numeroResolucion?.message}
              >
                <Input
                  id="numeroResolucion"
                  className="font-mono"
                  placeholder="18764000001234"
                  {...form.register("numeroResolucion")}
                />
              </Campo>

              <Campo id="prefijo" etiqueta="Prefijo">
                <Input
                  id="prefijo"
                  className="font-mono"
                  placeholder="SETP"
                  {...form.register("prefijo")}
                />
              </Campo>
            </div>

            <div className="grid gap-3 sm:grid-cols-[160px_160px_152px_152px]">
              <Campo
                id="rangoDesde"
                etiqueta="Desde"
                error={errores.rangoDesde?.message}
              >
                <Input
                  id="rangoDesde"
                  type="number"
                  className="font-mono"
                  {...form.register("rangoDesde", { valueAsNumber: true })}
                />
              </Campo>
              <Campo
                id="rangoHasta"
                etiqueta="Hasta"
                error={errores.rangoHasta?.message}
              >
                <Input
                  id="rangoHasta"
                  type="number"
                  className="font-mono"
                  {...form.register("rangoHasta", { valueAsNumber: true })}
                />
              </Campo>
              <Campo
                id="fechaVigenciaDesde"
                etiqueta="Vigente desde"
                error={errores.fechaVigenciaDesde?.message}
              >
                <Input
                  id="fechaVigenciaDesde"
                  className="font-mono"
                  placeholder="2026-01-15"
                  {...form.register("fechaVigenciaDesde")}
                />
              </Campo>
              <Campo
                id="fechaVigenciaHasta"
                etiqueta="Hasta"
                error={errores.fechaVigenciaHasta?.message}
              >
                <Input
                  id="fechaVigenciaHasta"
                  className="font-mono"
                  placeholder="2027-01-14"
                  {...form.register("fechaVigenciaHasta")}
                />
              </Campo>
            </div>

            <div className="grid gap-3 sm:grid-cols-[176px_1fr_1fr]">
              <Campo id="ambiente" etiqueta="Ambiente">
                <Select
                  value={form.watch("ambiente")}
                  onValueChange={(v) =>
                    form.setValue("ambiente", v as Datos["ambiente"])
                  }
                >
                  <SelectTrigger id="ambiente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCCION">Producción</SelectItem>
                    <SelectItem value="HABILITACION">Habilitación</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>

              <Campo
                id="fechaResolucion"
                etiqueta="Fecha de la resolución"
                error={errores.fechaResolucion?.message}
              >
                <Input
                  id="fechaResolucion"
                  className="font-mono"
                  placeholder="2026-01-15"
                  {...form.register("fechaResolucion")}
                />
              </Campo>

              <Campo
                id="claveTecnica"
                etiqueta="Clave técnica"
                ayuda="Se guarda cifrada"
              >
                <Input
                  id="claveTecnica"
                  type="password"
                  {...form.register("claveTecnica")}
                />
              </Campo>
            </div>

            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              <Lock className="size-3.5 shrink-0" />
              La clave técnica no vuelve a salir por la API.
            </p>

            <Button
              className="self-start"
              onClick={form.handleSubmit((d) => guardar.mutate(d))}
              disabled={guardar.isPending}
            >
              <Plus className="size-4" />
              Registrar resolución
            </Button>
          </form>
        </Bloque>
      </div>
    </AsistenteShell>
  );
}
