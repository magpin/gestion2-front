"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { digitoVerificacion } from "@/lib/nit";
import { SelectorMunicipio } from "@/modules/catalogos/components/SelectorMunicipio";
import { SelectorTipoDocumento } from "@/modules/catalogos/components/SelectorTipoDocumento";
import { rutApi } from "@/modules/catalogos/services/catalogos.service";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroDetalle } from "../types/terceros.types";

const esquema = z
  .object({
    tipoPersona: z.enum(["NATURAL", "JURIDICA"]),
    // El catálogo del backend tiene dieciséis tipos; repetir la lista acá la
    // dejaba corta y hacía que un PPT entrara por API pero no por pantalla.
    tipoDocumento: z.string().min(2, "Requerido").max(20),
    numeroDocumento: z.string().min(1, "Requerido").max(20),
    razonSocial: z.string().max(200).optional(),
    primerNombre: z.string().max(100).optional(),
    segundoNombre: z.string().max(100).optional(),
    primerApellido: z.string().max(100).optional(),
    segundoApellido: z.string().max(100).optional(),
    nombreComercial: z.string().max(200).optional(),
    email: z
      .union([z.string().email("Correo inválido"), z.literal("")])
      .optional(),
    telefono: z.string().max(40).optional(),
    direccion: z.string().max(200).optional(),
    municipioCodigo: z.string().optional(),
    esCliente: z.boolean(),
    esProveedor: z.boolean(),
    responsableIva: z.boolean(),
    esAgenteRetenedor: z.boolean(),
    esAutorretenedor: z.boolean(),
    esGranContribuyente: z.boolean(),
    regimenSimple: z.boolean(),
  })
  // Las dos reglas que el backend también sostiene. Validarlas acá evita un
  // viaje al servidor para descubrir algo que el formulario ya sabe.
  .refine((d) => d.esCliente || d.esProveedor, {
    message: "Tiene que ser cliente, proveedor o ambos",
    path: ["esCliente"],
  })
  .refine(
    (d) =>
      d.tipoPersona === "JURIDICA"
        ? Boolean(d.razonSocial?.trim())
        : Boolean(d.primerNombre?.trim()) && Boolean(d.primerApellido?.trim()),
    { message: "Requerido", path: ["razonSocial"] },
  );

export type DatosTercero = z.infer<typeof esquema>;

const VACIO: DatosTercero = {
  tipoPersona: "NATURAL",
  tipoDocumento: "CC",
  numeroDocumento: "",
  razonSocial: "",
  primerNombre: "",
  segundoNombre: "",
  primerApellido: "",
  segundoApellido: "",
  nombreComercial: "",
  email: "",
  telefono: "",
  direccion: "",
  municipioCodigo: "",
  esCliente: true,
  esProveedor: false,
  responsableIva: false,
  esAgenteRetenedor: false,
  esAutorretenedor: false,
  esGranContribuyente: false,
  regimenSimple: false,
};

const CALIDADES: Array<[keyof DatosTercero, string, string]> = [
  ["responsableIva", "Responsable de IVA", "Le facturás con IVA discriminado"],
  [
    "esAgenteRetenedor",
    "Agente retenedor",
    "Practica retención sobre lo que le pagás",
  ],
  [
    "esAutorretenedor",
    "Autorretenedor",
    "Se retiene a sí mismo; no se le retiene",
  ],
  ["esGranContribuyente", "Gran contribuyente", "Designado por la DIAN"],
  ["regimenSimple", "Régimen simple", "Tributa por el SIMPLE"],
];

/** La escala del modal: control cómodo, no fila de planilla. */
const CONTROL = "h-11 rounded-xl px-4";

/**
 * La ficha de un tercero.
 *
 * El formulario cambia de forma según el tipo de persona: una jurídica tiene
 * razón social y una natural tiene nombres y apellidos. Mostrar los dos juegos
 * de campos a la vez obliga a adivinar cuál llenar.
 *
 * Las calidades tributarias de abajo no son decoración: deciden qué impuestos
 * lleva cada documento que se le emita. Por eso cada una dice qué significa en
 * la operación, no cómo se llama en el RUT.
 *
 * No trae sus propios botones: vive dentro de un modal y las acciones van en el
 * pie, fijas mientras el cuerpo hace scroll. El pie las dispara por `form={id}`.
 */
export function FormularioTercero({
  id,
  edicion,
  inicial,
  valoresIniciales,
  alGuardar,
}: {
  /** El `id` del `<form>`, para que el botón del pie del modal lo envíe. */
  id: string;
  /**
   * Editando una ficha existente. Bloquea la identidad: `EditarTerceroDto` no
   * acepta tipo de persona, documento, número ni DV, así que dejarlos abiertos
   * es prometer un cambio que el backend descarta sin decir nada.
   */
  edicion: boolean;
  /** La ficha a editar. Sin esto, el formulario crea uno nuevo. */
  inicial?: TerceroDetalle;
  /**
   * Con qué arranca un tercero nuevo. Lo usa quien abre el formulario desde
   * otra pantalla: creando un cliente en medio de una venta, `esCliente` tiene
   * que venir marcado —si no, el tercero se guarda y el selector que lo pidió
   * no lo encuentra, porque filtra por rol—.
   */
  valoresIniciales?: Partial<DatosTercero>;
  alGuardar: (datos: DatosTercero & { dv?: string }) => void;
}) {
  const form = useForm<DatosTercero>({
    resolver: zodResolver(esquema),
    defaultValues: { ...VACIO, ...valoresIniciales },
  });

  const { reset } = form;
  useEffect(() => {
    if (inicial === undefined) return;
    reset({
      tipoPersona: inicial.tipo_persona,
      tipoDocumento: inicial.tipo_documento,
      numeroDocumento: inicial.numero_documento,
      razonSocial: inicial.razon_social ?? "",
      primerNombre: inicial.primer_nombre ?? "",
      segundoNombre: inicial.segundo_nombre ?? "",
      primerApellido: inicial.primer_apellido ?? "",
      segundoApellido: inicial.segundo_apellido ?? "",
      nombreComercial: inicial.nombre_comercial ?? "",
      email: inicial.email ?? "",
      telefono: inicial.telefono ?? "",
      direccion: inicial.direccion ?? "",
      municipioCodigo: inicial.municipio_codigo ?? "",
      esCliente: inicial.es_cliente,
      esProveedor: inicial.es_proveedor,
      responsableIva: inicial.responsable_iva,
      esAgenteRetenedor: inicial.es_agente_retenedor,
      esAutorretenedor: inicial.es_autorretenedor,
      esGranContribuyente: inicial.es_gran_contribuyente,
      regimenSimple: inicial.regimen_simple,
    });
  }, [inicial, reset]);

  // Solo para mostrar: la sección de abajo está apagada hasta que exista DIAN.
  const { data: responsabilidades = [] } = useQuery({
    queryKey: ["responsabilidades-fe"],
    queryFn: rutApi.responsabilidadesFe,
    staleTime: 60 * 60_000,
  });
  const yaCargadas = inicial?.responsabilidades_dian ?? [];

  const errores = form.formState.errors;
  const juridica = form.watch("tipoPersona") === "JURIDICA";
  const esNit = form.watch("tipoDocumento") === "NIT";
  const municipio = form.watch("municipioCodigo");
  // El DV es una función del número, no una decisión: la base lo recalcula y
  // rechaza la fila si no coincide.
  const dv = esNit ? digitoVerificacion(form.watch("numeroDocumento")) : "";

  return (
    <form
      id={id}
      className="flex flex-col gap-8"
      onSubmit={form.handleSubmit((d) =>
        alGuardar({ ...d, dv: esNit ? dv : undefined }),
      )}
    >
      <Seccion
        titulo="Identificación"
        descripcion={
          edicion
            ? "Con quién es el negocio no se corrige editando: si el documento quedó mal, el tercero correcto es otro. Lo demás sí se cambia de hoy en adelante."
            : undefined
        }
      >
        {edicion ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="tipoPersonaFijo"
              etiqueta="Tipo de persona"
              escala="grande"
            >
              <Input
                id="tipoPersonaFijo"
                className={CONTROL}
                value={juridica ? "Jurídica" : "Natural"}
                readOnly
                disabled
              />
            </Campo>
            <Campo id="documentoFijo" etiqueta="Documento" escala="grande">
              <Input
                id="documentoFijo"
                className={`font-mono ${CONTROL}`}
                value={`${form.watch("tipoDocumento")} ${form.watch("numeroDocumento")}${dv ? `-${dv}` : ""}`}
                readOnly
                disabled
              />
            </Campo>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="tipoPersona"
                etiqueta="Tipo de persona"
                escala="grande"
              >
                <Select
                  value={form.watch("tipoPersona")}
                  onValueChange={(v) =>
                    form.setValue(
                      "tipoPersona",
                      v as DatosTercero["tipoPersona"],
                    )
                  }
                >
                  <SelectTrigger
                    id="tipoPersona"
                    className={`w-full ${CONTROL}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATURAL">Natural</SelectItem>
                    <SelectItem value="JURIDICA">Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>

              <Campo id="tipoDocumento" etiqueta="Documento" escala="grande">
                <SelectorTipoDocumento
                  id="tipoDocumento"
                  valor={form.watch("tipoDocumento")}
                  aplicaPersona={form.watch("tipoPersona")}
                  onCambio={(v) => form.setValue("tipoDocumento", v)}
                  className={`w-full ${CONTROL}`}
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_112px]">
              <Campo
                id="numeroDocumento"
                etiqueta="Número"
                error={errores.numeroDocumento?.message}
                escala="grande"
              >
                <Input
                  id="numeroDocumento"
                  className={`font-mono ${CONTROL}`}
                  {...form.register("numeroDocumento")}
                />
              </Campo>

              {/* De solo lectura: el DV se calcula del número. Solo el NIT lo lleva. */}
              <Campo
                id="dv"
                etiqueta="DV"
                ayuda={esNit ? "Se calcula" : undefined}
                escala="grande"
              >
                <Input
                  id="dv"
                  className={`font-mono ${CONTROL}`}
                  value={dv}
                  readOnly
                  tabIndex={-1}
                  disabled={!esNit}
                  placeholder="–"
                />
              </Campo>
            </div>
          </>
        )}

        {juridica ? (
          <Campo
            id="razonSocial"
            etiqueta="Razón social"
            error={errores.razonSocial?.message}
            escala="grande"
          >
            <Input
              id="razonSocial"
              className={CONTROL}
              {...form.register("razonSocial")}
            />
          </Campo>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="primerNombre"
              etiqueta="Primer nombre"
              error={errores.razonSocial?.message}
              escala="grande"
            >
              <Input
                id="primerNombre"
                className={CONTROL}
                {...form.register("primerNombre")}
              />
            </Campo>
            <Campo id="segundoNombre" etiqueta="Segundo nombre" escala="grande">
              <Input
                id="segundoNombre"
                className={CONTROL}
                {...form.register("segundoNombre")}
              />
            </Campo>
            <Campo
              id="primerApellido"
              etiqueta="Primer apellido"
              escala="grande"
            >
              <Input
                id="primerApellido"
                className={CONTROL}
                {...form.register("primerApellido")}
              />
            </Campo>
            <Campo
              id="segundoApellido"
              etiqueta="Segundo apellido"
              escala="grande"
            >
              <Input
                id="segundoApellido"
                className={CONTROL}
                {...form.register("segundoApellido")}
              />
            </Campo>
          </div>
        )}

        {/* Fuera del `if`: un señor con establecimiento de comercio también
            tiene nombre comercial, y la columna lo acepta para las dos. */}
        <Campo
          id="nombreComercial"
          etiqueta="Nombre comercial"
          ayuda="Con el que lo conoce la gente"
          escala="grande"
        >
          <Input
            id="nombreComercial"
            className={CONTROL}
            {...form.register("nombreComercial")}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="email"
            etiqueta="Correo"
            error={errores.email?.message}
            escala="grande"
          >
            <Input
              id="email"
              type="email"
              className={CONTROL}
              {...form.register("email")}
            />
          </Campo>
          <Campo id="telefono" etiqueta="Teléfono" escala="grande">
            <Input
              id="telefono"
              className={`font-mono ${CONTROL}`}
              {...form.register("telefono")}
            />
          </Campo>
          <Campo id="direccion" etiqueta="Dirección" escala="grande">
            <Input
              id="direccion"
              className={CONTROL}
              {...form.register("direccion")}
            />
          </Campo>
          <Campo id="municipioCodigo" etiqueta="Municipio" escala="grande">
            <SelectorMunicipio
              id="municipioCodigo"
              valor={municipio || null}
              onCambio={(codigo) => form.setValue("municipioCodigo", codigo)}
              className={CONTROL}
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion
        titulo="Qué es para tu empresa"
        descripcion="Decide en qué listas aparece al digitar. Puede ser las dos cosas: el mismo NIT suele comprar y vender."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Tarjeta
            marcada={form.watch("esCliente")}
            titulo="Cliente"
            detalle="Le vendés: aparece al hacer una factura"
            alAlternar={() =>
              form.setValue("esCliente", !form.watch("esCliente"))
            }
          />
          <Tarjeta
            marcada={form.watch("esProveedor")}
            titulo="Proveedor"
            detalle="Le comprás: aparece al registrar una compra"
            alAlternar={() =>
              form.setValue("esProveedor", !form.watch("esProveedor"))
            }
          />
        </div>
        {errores.esCliente && (
          <p className="text-[13px] text-danger">{errores.esCliente.message}</p>
        )}
      </Seccion>

      <Seccion
        titulo="Calidades tributarias"
        descripcion="Deciden qué impuestos lleva cada documento que le emitas. Salen de su RUT."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {CALIDADES.map(([campo, titulo, detalle]) => (
            <Tarjeta
              key={campo}
              marcada={form.watch(campo) === true}
              titulo={titulo}
              detalle={detalle}
              alAlternar={() =>
                form.setValue(campo, !form.watch(campo) as never)
              }
            />
          ))}
        </div>
      </Seccion>

      {/* Apagada a propósito.
          
          El anexo técnico es del módulo DIAN, que es el sexto de la secuencia:
          capturar hoy códigos que nadie transmite ni valida es configurar en el
          vacío. Y el mapeo contra las calidades de arriba todavía tiene un nudo
          sin resolver —"agente retenedor" no distingue renta de IVA, y el anexo
          solo tiene código para IVA (O-23)—, que le toca a un contador.

          Se deja a la vista, y no borrada, porque el dato ya existe en la base:
          `tercero_responsabilidad_fiscal` sigue guardando lo que se haya
          cargado, y el formulario no manda el campo, así que no lo pisa. */}
      <Seccion
        titulo="Responsabilidades en la factura electrónica"
        descripcion="Se habilitan con el módulo DIAN. Son las que viajan en el XML del receptor; hasta que haya algo que transmitir, no hay nada que decidir acá."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {responsabilidades.map((r) => (
            <Tarjeta
              key={r.codigo}
              apagada
              codigo={r.codigo}
              marcada={yaCargadas.includes(r.codigo)}
              titulo={r.descripcion}
              detalle=""
              alAlternar={() => {}}
            />
          ))}
        </div>
      </Seccion>
    </form>
  );
}

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {titulo}
        </h3>
        {descripcion && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {descripcion}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Tarjeta({
  marcada,
  apagada = false,
  codigo,
  titulo,
  detalle,
  alAlternar,
}: {
  marcada: boolean;
  /** A la vista pero fuera de servicio: se ve el dato, no se toca. */
  apagada?: boolean;
  /** El código del anexo, cuando la tarjeta representa uno. */
  codigo?: string;
  titulo: string;
  detalle: string;
  alAlternar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      disabled={apagada}
      onClick={alAlternar}
      className={`flex min-h-11 items-center gap-4 rounded-xl border p-5 text-left transition-colors ${
        apagada
          ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
          : marcada
            ? "border-input bg-muted"
            : "border-border hover:bg-accent"
      }`}
    >
      <span
        className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
          marcada && !apagada
            ? "border-primary bg-primary text-primary-foreground"
            : marcada
              ? "border-input bg-muted-foreground/40 text-background"
              : "border-input"
        }`}
      >
        {marcada && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        {codigo !== undefined && (
          <span className="mb-1 block font-mono text-[11px] font-bold tracking-wide text-muted-foreground">
            {codigo}
          </span>
        )}
        <span className="block text-sm font-semibold">{titulo}</span>
        {detalle !== "" && (
          <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
            {detalle}
          </span>
        )}
      </span>
    </button>
  );
}
