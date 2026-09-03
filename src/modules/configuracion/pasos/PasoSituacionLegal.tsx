"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
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
import { Bloque, Registrada, Registradas } from "../components/Bloque";
import { Campo } from "../components/Campo";
import { SelectorCiiu } from "@/modules/catalogos/components/SelectorCiiu";
import { SelectorResponsabilidadRut } from "@/modules/catalogos/components/SelectorResponsabilidadRut";
import { SelectorTipoDocumento } from "@/modules/catalogos/components/SelectorTipoDocumento";
import { SelectorMunicipio } from "../components/SelectorMunicipio";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useGuardar } from "../hooks/useGuardar";
import { empresaApi, legalApi } from "../services/nucleo.service";

const HOY = new Date().toISOString().slice(0, 10);
const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

const esquemaResponsabilidad = z.object({
  codigo: z
    .number({ message: "Elegí una responsabilidad del RUT" })
    .int()
    .min(1),
  fechaInicio: FECHA,
});

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
  tarifaIcaPorMil: z.number().min(0, "No puede ser negativa"),
  municipioCodigo: z.string().regex(/^[0-9]{5}$/, "Elige un municipio"),
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
  const router = useRouter();
  const { data: estado } = useEstadoConfiguracion();
  const { data: empresa } = useQuery({
    queryKey: ["empresa"],
    queryFn: empresaApi.actual,
  });

  const paso = estado?.pasos.find((p) => p.clave === "SITUACION_LEGAL");
  const falta = (campo: string) =>
    paso?.faltantes.some((f) => f.campo === campo) ?? false;

  return (
    <AsistenteShell
      clave="SITUACION_LEGAL"
      titulo="Situación legal"
      alContinuar={() => router.push(RUTA_PASO.RESOLUCIONES)}
      etiquetaContinuar={paso?.estado === "LISTO" ? "Continuar" : "Omitir"}
    >
      <div className="flex flex-col gap-7">
        <BloqueResponsabilidades pendiente={falta("tipoRegimen")} />
        {empresa?.tipoPersona === "JURIDICA" && (
          <BloqueRepresentante pendiente={falta("representante")} />
        )}
        <BloqueActividad
          pendiente={falta("codigoCiiu") || falta("tarifaIcaPorMil")}
        />
      </div>
    </AsistenteShell>
  );
}

function Vigentes({
  filas,
  texto,
}: {
  filas: Array<Record<string, unknown>>;
  texto: (f: never) => string;
}) {
  if (filas.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {filas.map((f) => (
        <li
          key={String(f.id)}
          className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold"
        >
          {texto(f as never)}
        </li>
      ))}
    </ul>
  );
}

/**
 * La casilla 53 del RUT, tal como la imprime la DIAN.
 *
 * Es lo único que se captura de la situación tributaria. Antes había además una
 * sección "Condición tributaria" con su propia lista: la misma verdad pedida dos
 * veces, en dos vocabularios, y sin nada que impidiera contradecirse. Ahora se
 * carga el RUT y el backend deriva la condición que el motor de impuestos
 * necesita —el código 48 abre RESPONSABLE_IVA y con eso enciende las cuentas de
 * IVA en el plan—.
 *
 * Ninguno de los cuarenta y ocho códigos está escrito acá: salen de
 * `responsabilidad_tributaria` y se buscan por número o por descripción.
 */
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
          etiqueta={papel(i, f.es_principal === true)}
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
          {/* La tarifa solo tiene sentido en la principal: es la que liquida el
              ICA. En las demás se registra, pero no se cobra por ella. */}
          {f.es_principal === true && f.tarifa_ica_por_mil !== null && (
            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
              ICA {String(f.tarifa_ica_por_mil)} por mil ·{" "}
              {String(f.municipio_nombre ?? "")}
            </span>
          )}
        </Registrada>
      ))}
    </Registradas>
  );
}

/**
 * Las responsabilidades vigentes, y qué significa cada una hoy.
 *
 * Un código suprimido se veía igual que cualquier otro —"11 · Ventas régimen
 * común"— pero el motor lo trata como el vigente que lo reemplazó, porque eso
 * es lo que dice la DIAN. Resultado: el plan de cuentas proponía IVA a quien
 * miraba su lista y no veía IVA por ningún lado.
 *
 * Ahora el reemplazo va escrito. La regla no cambió; lo que cambió es que se ve.
 */
function ResponsabilidadesVigentes({
  filas,
}: {
  filas: Array<Record<string, unknown>>;
}) {
  if (filas.length === 0) return null;

  return (
    <Registradas>
      {filas.map((f) => {
        const suprimido = f.codigo_vigente === false;
        const reemplazo = f.codigo_reemplazo as number | null;
        const fe = f.codigo_dian_fe as string | null;

        return (
          <Registrada
            key={String(f.id)}
            etiqueta={String(f.codigo)}
            mono
            accion={
              /* Solo seis de las 48 viajan en el XML de la factura. Verlo acá
                 ahorra ir a buscarlo al anexo técnico. */
              fe ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {fe}
                </span>
              ) : undefined
            }
          >
            <span className="flex items-start gap-1.5">
              {/* El color va en el icono, nunca en el texto pequeño: `warning`
                  (#B26A00) da 4.2:1 sobre blanco y el reglamento exige 4.5:1
                  para texto normal. Como gráfico el umbral es 3:1 y pasa. */}
              {suprimido && (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              )}
              <span className="min-w-0">
                <span className="block text-[13px]">
                  {String(f.descripcion ?? "")}
                </span>
                {suprimido && reemplazo !== null && (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Código suprimido por la DIAN. Hoy es el {reemplazo} ·{" "}
                    {String(f.descripcion_reemplazo ?? "")}
                  </span>
                )}
              </span>
            </span>
          </Registrada>
        );
      })}
    </Registradas>
  );
}

function BloqueResponsabilidades({ pendiente }: { pendiente: boolean }) {
  const { data: filas = [] } = useQuery({
    queryKey: ["responsabilidades-empresa"],
    queryFn: legalApi.responsabilidadesRut,
  });
  const vigentes = filas.filter((f) => f.fecha_fin === null);

  const form = useForm<z.infer<typeof esquemaResponsabilidad>>({
    resolver: zodResolver(esquemaResponsabilidad),
    defaultValues: { fechaInicio: HOY },
  });

  const guardar = useGuardar<z.infer<typeof esquemaResponsabilidad>>({
    fn: (d) => legalApi.abrirResponsabilidadRut(d),
    exito: "Responsabilidad registrada",
    invalidar: [["responsabilidades-empresa"], ["plan-cuentas", "sugerencia"]],
    // El código se limpia y la fecha queda: un RUT trae varias responsabilidades
    // y todas empiezan a regir el mismo día.
    alTerminar: () =>
      form.reset({ fechaInicio: form.getValues("fechaInicio") }),
  });

  const errores = form.formState.errors;
  const codigo = form.watch("codigo");

  return (
    <Bloque
      titulo="Responsabilidades del RUT"
      descripcion="La casilla 53, tal como la imprime la DIAN. De acá sale si la empresa cobra IVA, si retiene y bajo qué régimen declara."
      pendiente={pendiente}
    >
      <ResponsabilidadesVigentes filas={vigentes} />

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_152px_auto]">
        <Campo
          id="responsabilidad"
          etiqueta="Responsabilidad, calidad o atributo"
          error={errores.codigo?.message}
        >
          <SelectorResponsabilidadRut
            id="responsabilidad"
            valor={codigo ?? null}
            invalido={Boolean(errores.codigo)}
            yaRegistrados={vigentes.map((f) => Number(f.codigo))}
            onCambio={(c) =>
              form.setValue("codigo", c, { shouldValidate: true })
            }
          />
        </Campo>

        <Campo
          id="respDesde"
          etiqueta="Vigente desde"
          error={errores.fechaInicio?.message}
        >
          <Input
            id="respDesde"
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
          Agregar
        </Button>
      </div>
    </Bloque>
  );
}

/**
 * La calidad de agente retenedor de ICA.
 *
 * Va acá y no con las responsabilidades del RUT porque no sale del RUT: el ICA
 * es municipal y quién retiene lo define el acuerdo del municipio. Es la única
 * condición tributaria que se sigue declarando a mano, y sin ella la cuenta de
 * ICA retenido no se propone nunca.
 */
function AgenteIca() {
  const { data: filas = [] } = useQuery({
    queryKey: ["regimenes"],
    queryFn: legalApi.regimenes,
  });
  const vigente = filas.find(
    (f) => f.tipo_regimen === "AGENTE_RETENEDOR_ICA" && f.fecha_fin === null,
  );

  const abrir = useGuardar<void>({
    fn: () =>
      legalApi.abrirRegimen({
        tipoRegimen: "AGENTE_RETENEDOR_ICA",
        fechaInicio: HOY,
      }),
    exito: "Registrado como agente retenedor de ICA",
    invalidar: [["regimenes"], ["plan-cuentas", "sugerencia"]],
  });

  const cerrar = useGuardar<string>({
    fn: (id) => legalApi.cerrarRegimen(id, HOY),
    exito: "Ya no figura como agente retenedor de ICA",
    invalidar: [["regimenes"], ["plan-cuentas", "sugerencia"]],
  });

  const marcado = vigente !== undefined;
  const trabajando = abrir.isPending || cerrar.isPending;

  return (
    <button
      type="button"
      aria-pressed={marcado}
      disabled={trabajando}
      onClick={() =>
        marcado ? cerrar.mutate(String(vigente.id)) : abrir.mutate(undefined)
      }
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${
        marcado ? "border-input bg-muted" : "border-border hover:bg-accent"
      }`}
    >
      <span
        className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
          marcado
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input"
        }`}
      >
        {marcado && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">
          El municipio la designó agente retenedor de ICA
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          No sale del RUT: lo define el acuerdo municipal. Agrega la cuenta de
          ICA retenido.
        </span>
      </span>
    </button>
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

  const errores = form.formState.errors;

  return (
    <Bloque
      titulo="Representante legal"
      descripcion="Quien firma por la empresa. Sale del certificado de existencia y representación."
      pendiente={pendiente}
    >
      <Vigentes
        filas={vigentes}
        texto={(f: { nombre_completo: string }) => f.nombre_completo}
      />

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
      tarifaIcaPorMil: 0,
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
    // El CIIU y la tarifa se limpian; el municipio y la fecha quedan, que es lo
    // que se repite cuando se cargan varias actividades del mismo RUT.
    alTerminar: () => {
      form.reset({
        ...form.getValues(),
        codigoCiiu: "",
        descripcion: "",
        tarifaIcaPorMil: 0,
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
      descripcion="La principal decide la cuenta de ingresos y la tarifa de ICA que se liquida. El RUT admite varias."
      pendiente={pendiente}
    >
      <ActividadesVigentes
        filas={vigentes}
        onQuitar={(id) => quitar.mutate(id)}
        quitando={quitar.isPending}
      />

      {vigentes.length > 0 && <AgenteIca />}

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
              id="tarifaIca"
              etiqueta="Tarifa de ICA"
              ayuda="Por mil"
              error={errores.tarifaIcaPorMil?.message}
            >
              <Input
                id="tarifaIca"
                type="number"
                step="0.001"
                min="0"
                className="font-mono"
                {...form.register("tarifaIcaPorMil", { valueAsNumber: true })}
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
