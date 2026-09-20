"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
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
import { AsistenteShell } from "../components/AsistenteShell";
import { Bloque } from "../components/Bloque";
import { Campo } from "../components/Campo";
import { AvisoFaltante, CONTROL, CONTROL_SELECT, NotaInformativa } from "../components/Comunes";
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
  // El mensaje va en el campo que falla y dice qué pasó, no cómo se llama la
  // regla. "La vigencia está invertida" obliga a mirar los dos campos para
  // deducir cuál corregir.
  .refine((d) => d.rangoHasta >= d.rangoDesde, {
    message: "Es menor que el número inicial.",
    path: ["rangoHasta"],
  })
  .refine((d) => d.fechaVigenciaHasta >= d.fechaVigenciaDesde, {
    message: "Termina antes de empezar.",
    path: ["fechaVigenciaHasta"],
  });

type Datos = z.infer<typeof esquema>;

const TIPOS: Array<[Datos["tipoDocumento"], string]> = [
  ["FACTURA_VENTA", "Factura de venta"],
  ["NOTA_CREDITO", "Nota crédito"],
  ["NOTA_DEBITO", "Nota débito"],
  ["DOCUMENTO_SOPORTE", "Documento soporte"],
];

const NOMBRE_TIPO = (tipo: string) => TIPOS.find((t) => t[0] === tipo)?.[1] ?? tipo;

export function PasoResoluciones() {
  const { data: resoluciones = [] } = useQuery({
    queryKey: ["resoluciones"],
    queryFn: resolucionesApi.listar,
  });
  // Cuánto le queda a cada resolución activa: el backend ya calcula
  // `dias_restantes` y `vencida`/`agotada`. Recalcularlos acá dejaría afuera
  // justo la alerta que importa —una resolución ya vencida no se ve distinta
  // de una sana si nadie compara la fecha contra hoy—.
  const { data: disponibilidad = [] } = useQuery({
    queryKey: ["resoluciones", "disponibilidad"],
    queryFn: resolucionesApi.disponibilidad,
  });

  const activas = resoluciones.filter((r) => r.activa);
  const hayFacturaVenta = disponibilidad.some(
    (r) => r.tipo_documento === "FACTURA_VENTA" && !r.vencida && !r.agotada,
  );

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
    invalidar: [["resoluciones"], ["estado-configuracion"]],
    alTerminar: () => form.reset(),
  });

  const errores = form.formState.errors;

  return (
    <AsistenteShell clave="RESOLUCIONES" titulo="Resoluciones">
      <div className="flex flex-col gap-9">
        {!hayFacturaVenta && (
          <AvisoFaltante>
            Falta una resolución de factura de venta. Sin ella no se puede numerar ninguna
            factura.
          </AvisoFaltante>
        )}

        {disponibilidad.length > 0 && (
          <Bloque
            titulo="Numeración vigente"
            descripcion="Cuando el consecutivo llega al final, la resolución se agotó y hay que pedir otra a la DIAN."
          >
            <ul className="m-0 flex list-none flex-col divide-y divide-secondary p-0">
              {disponibilidad.map((r) => (
                <FilaDisponibilidad key={`${r.tipo_documento}-${r.ambiente}`} r={r} />
              ))}
            </ul>
          </Bloque>
        )}

        <Bloque
          titulo={activas.length > 0 ? "Registrar otra resolución" : "Registrar una resolución"}
          descripcion={
            activas.length > 0
              ? undefined
              : "Sin la resolución de factura de venta no hay numeración que ponerle a un documento."
          }
        >
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-wrap items-start gap-4">
              <Campo id="tipoDocumento" etiqueta="Tipo de documento" className="w-44">
                <Select
                  value={form.watch("tipoDocumento")}
                  onValueChange={(v) =>
                    form.setValue("tipoDocumento", v as Datos["tipoDocumento"])
                  }
                >
                  <SelectTrigger id="tipoDocumento" className={CONTROL_SELECT}>
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

              {/* 176 y no 160: son catorce dígitos y en 160 se corta. Es la
                  fila nueva de la escala de `Campo.tsx`. */}
              <Campo
                id="numeroResolucion"
                etiqueta="Número de resolución"
                error={errores.numeroResolucion?.message}
                className="w-44"
              >
                <Input
                  id="numeroResolucion"
                  className={`${CONTROL} font-mono`}
                  placeholder="18764000001234"
                  {...form.register("numeroResolucion")}
                />
              </Campo>

              <Campo id="prefijo" etiqueta="Prefijo" className="w-28">
                <Input
                  id="prefijo"
                  className={`${CONTROL} font-mono`}
                  placeholder="SETP"
                  {...form.register("prefijo")}
                />
              </Campo>
            </div>

            <div className="flex flex-wrap items-start gap-4">
              <Campo
                id="rangoDesde"
                etiqueta="Desde"
                error={errores.rangoDesde?.message}
                className="w-40"
              >
                <Input
                  id="rangoDesde"
                  type="number"
                  className={`${CONTROL} font-mono`}
                  {...form.register("rangoDesde", { valueAsNumber: true })}
                />
              </Campo>
              <Campo
                id="rangoHasta"
                etiqueta="Hasta"
                error={errores.rangoHasta?.message}
                className="w-40"
              >
                <Input
                  id="rangoHasta"
                  type="number"
                  className={`${CONTROL} font-mono`}
                  {...form.register("rangoHasta", { valueAsNumber: true })}
                />
              </Campo>
              <Campo
                id="fechaVigenciaDesde"
                etiqueta="Vigente desde"
                error={errores.fechaVigenciaDesde?.message}
                className="w-38"
              >
                <Input
                  id="fechaVigenciaDesde"
                  className={`${CONTROL} font-mono`}
                  placeholder="2026-01-15"
                  {...form.register("fechaVigenciaDesde")}
                />
              </Campo>
              <Campo
                id="fechaVigenciaHasta"
                etiqueta="Vigente hasta"
                error={errores.fechaVigenciaHasta?.message}
                className="w-38"
              >
                <Input
                  id="fechaVigenciaHasta"
                  className={`${CONTROL} font-mono`}
                  placeholder="2027-01-14"
                  {...form.register("fechaVigenciaHasta")}
                />
              </Campo>
            </div>

            <div className="flex flex-wrap items-start gap-4">
              <Campo id="ambiente" etiqueta="Ambiente" className="w-44">
                <Select
                  value={form.watch("ambiente")}
                  onValueChange={(v) => form.setValue("ambiente", v as Datos["ambiente"])}
                >
                  <SelectTrigger id="ambiente" className={CONTROL_SELECT}>
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
                className="w-38"
              >
                <Input
                  id="fechaResolucion"
                  className={`${CONTROL} font-mono`}
                  placeholder="2026-01-15"
                  {...form.register("fechaResolucion")}
                />
              </Campo>

              <Campo
                id="claveTecnica"
                etiqueta="Clave técnica (opcional)"
                className="min-w-56 flex-1"
              >
                <Input
                  id="claveTecnica"
                  type="password"
                  className={CONTROL}
                  {...form.register("claveTecnica")}
                />
              </Campo>
            </div>

            <NotaInformativa>
              La clave técnica se guarda cifrada y no vuelve a salir por la API.
            </NotaInformativa>

            <div className="flex justify-end">
              <Button
                onClick={form.handleSubmit((d) => guardar.mutate(d))}
                disabled={guardar.isPending}
              >
                {guardar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Registrar resolución
              </Button>
            </div>
          </form>
        </Bloque>
      </div>
    </AsistenteShell>
  );
}

/**
 * Una resolución con cuánto le queda, por número y por fecha.
 *
 * Las dos cosas se agotan por su lado: una resolución con 4.000 números libres
 * sirve de nada si venció el mes pasado. Por eso hay una barra (los números) y
 * una línea de fecha, y el color del punto toma la peor de las dos.
 *
 * El estado va en el punto y en la barra; el texto queda neutro. Un renglón
 * entero en rojo se lee peor y no avisa más.
 */
function FilaDisponibilidad({
  r,
}: {
  r: {
    tipo_documento: string;
    prefijo: string | null;
    numero_resolucion: string;
    rango_desde: string | number;
    rango_hasta: string | number;
    consecutivo_actual: string | number;
    numeros_restantes: string | number;
    fecha_vigencia_hasta: string;
    dias_restantes: number;
    vencida: boolean;
    agotada: boolean;
  };
}) {
  const desde = Number(r.rango_desde);
  const hasta = Number(r.rango_hasta);
  const actual = Number(r.consecutivo_actual);
  const usado = Math.min(100, Math.max(0, ((actual - desde) / (hasta - desde + 1)) * 100));

  const critica = r.vencida || r.agotada;
  const advertida = !critica && (usado > 85 || r.dias_restantes <= 30);
  const color = critica ? "bg-danger" : advertida ? "bg-warning" : "bg-success";

  return (
    <li className="flex flex-col gap-2 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{NOMBRE_TIPO(r.tipo_documento)}</span>
          <span className="block font-mono text-xs text-muted-foreground">
            {r.prefijo ?? "sin prefijo"} · {r.rango_desde}–{r.rango_hasta}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {r.vencida
            ? `venció ${r.fecha_vigencia_hasta}`
            : `vence ${r.fecha_vigencia_hasta} · ${r.dias_restantes} días`}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(usado, 1)}%` }} />
      </div>

      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
        {r.agotada
          ? "Agotada · no quedan números"
          : `${Math.round(usado)} % usado · quedan ${r.numeros_restantes} números`}
        {r.vencida && " · vencida"}
      </span>
    </li>
  );
}
