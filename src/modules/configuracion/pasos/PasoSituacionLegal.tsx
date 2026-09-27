"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsistenteShell } from "../components/AsistenteShell";
import { Bloque, Registrada, Registradas } from "../components/Bloque";
import {
  CONTROL,
  NotaInformativa,
  Pildora,
} from "../components/Comunes";
import { Campo } from "../components/Campo";
import { SelectorCiiu } from "@/modules/catalogos/components/SelectorCiiu";
import { SelectorTipoDocumento } from "@/modules/catalogos/components/SelectorTipoDocumento";
import { SelectorMunicipio } from "@/modules/catalogos/components/SelectorMunicipio";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useGuardar } from "../hooks/useGuardar";
import { empresaApi, legalApi } from "../services/nucleo.service";

const HOY = new Date().toISOString().slice(0, 10);
const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

const esquemaRepresentante = z.object({
  nombreCompleto: z.string().min(3, "Requerido").max(200),
  // El backend valida contra `tipo_documento_identidad`. Repetir la lista acá la
  // dejaba desincronizada: la base ya aceptaba PPT y patrimonio autónomo, y el
  // formulario ofrecía cinco valores.
  tipoDocumento: z.string().min(2, "Requerido").max(20),
  numeroDocumento: z.string().min(3, "Requerido").max(20),
  cargo: z.string().max(120).optional(),
  fechaInicio: FECHA,
});

const esquemaActividad = z.object({
  codigoCiiu: z
    .string()
    .regex(/^[0-9]{4}$/, "Elegí una actividad del catálogo"),
  // La descripción ya no se escribe: la pone el selector con el nombre oficial
  // del DANE, y el backend la congela junto a la actividad.
  descripcion: z.string().min(3, "Elegí una actividad del catálogo").max(300),
  municipioCodigo: z.string().regex(/^[0-9]{5}$/, "Elige un municipio"),
  fechaInicio: FECHA,
});

const esquemaMatricula = z.object({
  numeroMatricula: z.string().min(1, "Requerido").max(30),
  camaraComercio: z.string().min(3, "Requerido").max(120),
  fechaMatricula: FECHA,
  fechaUltimaRenovacion: FECHA.optional(),
  fechaInicio: FECHA,
});

/**
 * La situación legal es lo más denso del asistente: cuatro hechos distintos, y
 * cada uno con vigencia propia.
 *
 * Se muestran los tres obligatorios juntos, cada uno con su propio botón de
 * guardar. Un solo formulario gigante obligaría a llenarlo entero para registrar
 * lo que ya se tiene a mano, y en la práctica el representante y el CIIU salen
 * de papeles distintos.
 */
export function PasoSituacionLegal() {
  const { data: estado } = useEstadoConfiguracion();
  const { data: empresa } = useQuery({
    queryKey: ["empresa"],
    queryFn: empresaApi.actual,
  });

  const paso = estado?.pasos.find((p) => p.clave === "SITUACION_LEGAL");
  const falta = (campo: string) =>
    paso?.faltantes.some((f) => f.campo === campo) ?? false;

  return (
    <AsistenteShell clave="SITUACION_LEGAL" titulo="Situación legal">
      <div className="flex flex-col gap-9">
        {/* Este paso no se guarda de una vez, y conviene decirlo antes de que
            alguien llene los cinco bloques esperando un botón al final. */}
        <NotaInformativa>
          Cada bloque se guarda por separado. Son hechos con vigencia: no se borran, se{" "}
          <span className="font-medium text-foreground">cierran</span> con fecha.
        </NotaInformativa>

        {/* Una persona natural no tiene representante legal: el bloque no se
            deshabilita, no se renderiza. Un formulario gris que no se puede
            llenar es una pregunta sin respuesta posible. */}
        {empresa?.tipoPersona === "JURIDICA" && (
          <BloqueRepresentante pendiente={falta("representante")} />
        )}
        <BloqueActividad pendiente={falta("codigoCiiu")} />
        <BloqueMatricula />
      </div>
    </AsistenteShell>
  );
}

/**
 * Las actividades vigentes, cada una con el papel que cumple.
 *
 * Una empresa declara varias en el RUT y no son intercambiables: la principal
 * decide la cuenta de ingresos del plan y la tarifa de ICA que se liquida, la
 * segunda es la que se factura de vez en cuando, y de ahí para abajo son
 * respaldo de lo que la empresa puede hacer sin cambiar el RUT.
 *
 * El nombre sale de la posición, no de una columna: la base solo distingue
 * `es_principal`, y agregar un "orden" sería guardar algo que ya se sabe.
 */
function ActividadesVigentes({
  filas,
  onQuitar,
  quitando,
}: {
  filas: Array<Record<string, unknown>>;
  onQuitar: (id: string) => void;
  quitando: boolean;
}) {
  if (filas.length === 0) return null;

  // La principal primero venga como venga; el resto por antigüedad, que es el
  // orden en que se declararon.
  const ordenadas = [...filas].sort((a, b) => {
    if (a.es_principal !== b.es_principal)
      return a.es_principal === true ? -1 : 1;
    return String(a.fecha_inicio).localeCompare(String(b.fecha_inicio));
  });

  const papel = (i: number, esPrincipal: boolean) =>
    esPrincipal ? "Principal" : i === 1 ? "Secundaria" : "Otra actividad";

  return (
    <Registradas>
      {ordenadas.map((f, i) => (
        <Registrada
          key={String(f.id)}
          /* La principal lleva píldora rellena y las demás, borde: de las
             varias que declara el RUT solo una decide la cuenta de ingresos y
             la tarifa de ICA, y esa jerarquía tiene que verse antes de leer. */
          etiqueta={
            <Pildora destacada={f.es_principal === true}>
              {papel(i, f.es_principal === true)}
            </Pildora>
          }
          accion={
            /* La principal no se quita desde acá: dejar la empresa sin principal
               deja al plan de cuentas sin cuenta de ingresos. Cambiarla es cerrar
               una y abrir otra, y eso es un acto aparte. */
            f.es_principal !== true ? (
              <button
                type="button"
                onClick={() => onQuitar(String(f.id))}
                disabled={quitando}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-danger disabled:opacity-50"
                aria-label={`Quitar la actividad ${String(f.codigo_ciiu)}`}
              >
                <X className="size-3.5" />
              </button>
            ) : undefined
          }
        >
          {/* La descripción del DANE llega a ciento veinte caracteres. Cortarla
              con puntos suspensivos escondía justo la parte que distingue una
              actividad de otra, así que se deja fluir a dos líneas. */}
          <span className="block text-[13px] leading-snug">
            <span className="font-mono text-xs text-muted-foreground">
              {String(f.codigo_ciiu)}
            </span>{" "}
            {String(f.descripcion)}
          </span>
        </Registrada>
      ))}
    </Registradas>
  );
}

function BloqueRepresentante({ pendiente }: { pendiente: boolean }) {
  const { data: filas = [] } = useQuery({
    queryKey: ["representantes"],
    queryFn: legalApi.representantes,
  });
  const vigentes = filas.filter((f) => f.fecha_fin === null);

  const form = useForm<z.infer<typeof esquemaRepresentante>>({
    resolver: zodResolver(esquemaRepresentante),
    defaultValues: {
      nombreCompleto: "",
      tipoDocumento: "CC",
      numeroDocumento: "",
      cargo: "",
      fechaInicio: HOY,
    },
  });

  const guardar = useGuardar<z.infer<typeof esquemaRepresentante>>({
    fn: (d) =>
      legalApi.abrirRepresentante({ ...d, cargo: d.cargo || undefined }),
    exito: "Representante registrado",
    invalidar: [["representantes"]],
    alTerminar: () =>
      form.reset({
        ...form.getValues(),
        nombreCompleto: "",
        numeroDocumento: "",
      }),
  });

  const quitar = useGuardar<string>({
    fn: (id) => legalApi.cerrarRepresentante(id, HOY),
    exito: "Representante retirado",
    invalidar: [["representantes"]],
  });

  const errores = form.formState.errors;

  return (
    <Bloque
      titulo="Representante legal"
      etiqueta="Persona jurídica"
      descripcion="Quien firma por la empresa. Sale del certificado de existencia y representación."
      pendiente={pendiente}
    >
      {vigentes.length > 0 && (
        <Registradas>
          {vigentes.map((f) => (
            <Registrada
              key={String(f.id)}
              etiqueta={String(f.cargo ?? "Representante")}
              accion={
                <button
                  type="button"
                  onClick={() => quitar.mutate(String(f.id))}
                  disabled={quitar.isPending}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-danger disabled:opacity-50"
                  aria-label={`Retirar a ${String(f.nombre_completo)}`}
                >
                  <X className="size-3.5" />
                </button>
              }
            >
              <span className="block text-[13px] font-semibold">
                {String(f.nombre_completo)}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                {String(f.tipo_documento)} {String(f.numero_documento)}
              </span>
            </Registrada>
          ))}
        </Registradas>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Campo
          id="repNombre"
          etiqueta="Nombre completo"
          error={errores.nombreCompleto?.message}
        >
          <Input id="repNombre" {...form.register("nombreCompleto")} />
        </Campo>

        <div className="grid grid-cols-[176px_160px] gap-3">
          <Campo id="repTipoDoc" etiqueta="Tipo">
            <SelectorTipoDocumento
              className={CONTROL}
              id="repTipoDoc"
              valor={form.watch("tipoDocumento")}
              aplicaPersona="NATURAL"
              onCambio={(v) => form.setValue("tipoDocumento", v)}
            />
          </Campo>

          <Campo
            id="repDoc"
            etiqueta="Documento"
            error={errores.numeroDocumento?.message}
          >
            <Input
              id="repDoc"
              className="font-mono"
              {...form.register("numeroDocumento")}
            />
          </Campo>
        </div>
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_152px_auto]">
        <Campo id="repCargo" etiqueta="Cargo">
          <Input
            id="repCargo"
            placeholder="Gerente general"
            {...form.register("cargo")}
          />
        </Campo>

        <Campo
          id="repDesde"
          etiqueta="Vigente desde"
          error={errores.fechaInicio?.message}
        >
          <Input
            id="repDesde"
            className="font-mono"
            {...form.register("fechaInicio")}
          />
        </Campo>

        <Button
          variant="outline"
          onClick={form.handleSubmit((d) => guardar.mutate(d))}
          disabled={guardar.isPending}
        >
          <Plus className="size-4" />
          Registrar
        </Button>
      </div>
    </Bloque>
  );
}

/**
 * La matrícula mercantil, ante la cámara de comercio.
 *
 * A diferencia del régimen, el representante o la actividad, ninguna cuenta
 * del plan depende de esto — por eso es "opcional" en el estado de
 * configuración y no bloquea nada. Igual necesita su propio bloque: sin uno,
 * el aviso de "Matrícula mercantil" que ya muestra el asistente no tenía
 * dónde llevar a quien hace clic.
 */
function BloqueMatricula() {
  const { data: filas = [] } = useQuery({
    queryKey: ["matriculas"],
    queryFn: legalApi.matriculas,
  });
  const vigente = filas.find((f) => f.fecha_fin === null);

  const form = useForm<z.infer<typeof esquemaMatricula>>({
    resolver: zodResolver(esquemaMatricula),
    defaultValues: {
      numeroMatricula: "",
      camaraComercio: "",
      fechaMatricula: "",
      fechaUltimaRenovacion: "",
      fechaInicio: HOY,
    },
  });

  const guardar = useGuardar<z.infer<typeof esquemaMatricula>>({
    fn: (d) =>
      legalApi.abrirMatricula({
        ...d,
        fechaUltimaRenovacion: d.fechaUltimaRenovacion || undefined,
      }),
    exito: "Matrícula registrada",
    invalidar: [["matriculas"]],
  });

  const quitar = useGuardar<string>({
    fn: (id) => legalApi.cerrarMatricula(id, HOY),
    exito: "Matrícula retirada",
    invalidar: [["matriculas"]],
  });

  const errores = form.formState.errors;

  return (
    <Bloque
      titulo="Matrícula mercantil"
      etiqueta="Opcional"
      descripcion="El registro ante la cámara de comercio. No decide ninguna cuenta del plan; se guarda para tenerlo a mano."
    >
      {vigente && (
        <Registradas>
          <Registrada
            etiqueta={vigente.camara_comercio as string}
            accion={
              <button
                type="button"
                onClick={() => quitar.mutate(String(vigente.id))}
                disabled={quitar.isPending}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-danger disabled:opacity-50"
                aria-label="Retirar la matrícula mercantil"
              >
                <X className="size-3.5" />
              </button>
            }
          >
            <span className="block font-mono text-[13px] font-semibold">
              {String(vigente.numero_matricula)}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Matriculada {String(vigente.fecha_matricula)}
              {vigente.fecha_ultima_renovacion
                ? ` · Renovada ${String(vigente.fecha_ultima_renovacion)}`
                : ""}
            </span>
          </Registrada>
        </Registradas>
      )}

      {!vigente && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            id="matNumero"
            etiqueta="Número de matrícula"
            error={errores.numeroMatricula?.message}
          >
            <Input
              id="matNumero"
              className="font-mono"
              {...form.register("numeroMatricula")}
            />
          </Campo>

          <Campo
            id="matCamara"
            etiqueta="Cámara de comercio"
            error={errores.camaraComercio?.message}
          >
            <Input
              id="matCamara"
              placeholder="Cámara de Comercio de Bogotá"
              {...form.register("camaraComercio")}
            />
          </Campo>

          <Campo
            id="matFecha"
            etiqueta="Fecha de matrícula"
            error={errores.fechaMatricula?.message}
          >
            <Input
              id="matFecha"
              className="font-mono"
              placeholder="2020-03-15"
              {...form.register("fechaMatricula")}
            />
          </Campo>

          <Campo
            id="matRenovacion"
            etiqueta="Última renovación"
            ayuda="Opcional"
          >
            <Input
              id="matRenovacion"
              className="font-mono"
              placeholder="2026-01-15"
              {...form.register("fechaUltimaRenovacion")}
            />
          </Campo>

          <Button
            variant="outline"
            className="self-start"
            onClick={form.handleSubmit((d) => guardar.mutate(d))}
            disabled={guardar.isPending}
          >
            <Plus className="size-4" />
            Registrar matrícula
          </Button>
        </div>
      )}
    </Bloque>
  );
}

function BloqueActividad({ pendiente }: { pendiente: boolean }) {
  const { data: filas = [] } = useQuery({
    queryKey: ["actividades"],
    queryFn: legalApi.actividades,
  });
  const vigentes = filas.filter((f) => f.fecha_fin === null);

  const form = useForm<z.infer<typeof esquemaActividad>>({
    resolver: zodResolver(esquemaActividad),
    defaultValues: {
      codigoCiiu: "",
      descripcion: "",
      municipioCodigo: "",
      fechaInicio: HOY,
    },
  });

  // La primera que se registra es la principal. Las siguientes no: el índice
  // único de la base solo admite una principal vigente, y cuál es no lo decide
  // el orden de carga sino el RUT — se cambia desde la ficha de la empresa.
  const guardar = useGuardar<z.infer<typeof esquemaActividad>>({
    fn: (d) =>
      legalApi.abrirActividad({ ...d, esPrincipal: vigentes.length === 0 }),
    exito: "Actividad registrada",
    invalidar: [["actividades"], ["plan-cuentas", "sugerencia"]],
    // El CIIU se limpia; el municipio y la fecha quedan, que es lo
    // que se repite cuando se cargan varias actividades del mismo RUT.
    alTerminar: () => {
      form.reset({
        ...form.getValues(),
        codigoCiiu: "",
        descripcion: "",
      });
      setAgregando(false);
    },
  });

  const quitar = useGuardar<string>({
    fn: (id) => legalApi.cerrarActividad(id, HOY),
    exito: "Actividad cerrada",
    invalidar: [["actividades"], ["plan-cuentas", "sugerencia"]],
  });

  // Con la primera cargada el formulario se pliega: dejarlo abierto hacía
  // parecer que faltaba llenarlo, cuando el paso ya estaba resuelto. El botón es
  // lo que dice que se pueden agregar más, que antes no lo decía nada.
  const [agregando, setAgregando] = useState(false);
  const abierto = vigentes.length === 0 || agregando;

  const errores = form.formState.errors;
  const municipio = form.watch("municipioCodigo");

  return (
    <Bloque
      titulo={
        vigentes.length > 1 ? "Actividades económicas" : "Actividad económica"
      }
      descripcion="La principal decide la cuenta de ingresos y, con el municipio, el ICA. El RUT admite varias."
      pendiente={pendiente}
    >
      <ActividadesVigentes
        filas={vigentes}
        onQuitar={(id) => quitar.mutate(id)}
        quitando={quitar.isPending}
      />

      {!abierto && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => setAgregando(true)}
        >
          <Plus className="size-4" />
          {vigentes.length === 1
            ? "Agregar actividad secundaria"
            : "Agregar otra actividad"}
        </Button>
      )}

      {abierto && (
        <>
          <Campo
            id="ciiu"
            etiqueta={
              vigentes.length === 0
                ? "Actividad económica principal (CIIU)"
                : vigentes.length === 1
                  ? "Actividad económica secundaria (CIIU)"
                  : "Otra actividad económica (CIIU)"
            }
            error={errores.codigoCiiu?.message ?? errores.descripcion?.message}
            ayuda={
              vigentes.length === 0
                ? "Buscá por código o por nombre. La descripción la pone el catálogo del DANE."
                : "El RUT admite varias. La principal es la que ya cargaste y decide la cuenta de ingresos."
            }
          >
            <SelectorCiiu
              className={CONTROL}
              id="ciiu"
              valor={form.watch("codigoCiiu") || null}
              invalido={Boolean(errores.codigoCiiu)}
              onCambio={(codigo, nombre) => {
                form.setValue("codigoCiiu", codigo, { shouldValidate: true });
                form.setValue("descripcion", nombre, { shouldValidate: true });
              }}
            />
          </Campo>

          <div className="grid items-end gap-3 sm:grid-cols-[1fr_128px_152px_auto]">
            <Campo
              id="ciiuMunicipio"
              etiqueta="Municipio"
              error={errores.municipioCodigo?.message}
            >
              <SelectorMunicipio
                className={CONTROL}
                id="ciiuMunicipio"
                valor={municipio || null}
                invalido={Boolean(errores.municipioCodigo)}
                onCambio={(codigo) =>
                  form.setValue("municipioCodigo", codigo, {
                    shouldValidate: true,
                  })
                }
              />
            </Campo>

            <Campo
              id="ciiuDesde"
              etiqueta="Desde"
              error={errores.fechaInicio?.message}
            >
              <Input
                id="ciiuDesde"
                className="font-mono"
                {...form.register("fechaInicio")}
              />
            </Campo>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={form.handleSubmit((d) => guardar.mutate(d))}
                disabled={guardar.isPending}
              >
                <Plus className="size-4" />
                Agregar
              </Button>

              {vigentes.length > 0 && (
                <Button variant="ghost" onClick={() => setAgregando(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Bloque>
  );
}
