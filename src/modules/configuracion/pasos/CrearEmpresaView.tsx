"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, FileUp, Pencil } from "lucide-react";
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
import { api, mensajeDeError } from "@/core/api/api";
import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { digitoVerificacion } from "@/lib/nit";
import { Maria } from "@/modules/asistente/components/Maria";
import { asistenteService } from "@/modules/asistente/services/asistente.service";
import { useCerrarSesion, useElegirEmpresa } from "@/modules/auth/hooks/useAuth";
import { SelectorFormaAsociativa } from "@/modules/catalogos/components/SelectorFormaAsociativa";
import { SelectorSectores } from "@/modules/catalogos/components/SelectorSectores";
import { Destello } from "@/modules/landing/components/Marca";
import { RUTA_MODO_IA } from "../components/AsistenteShell";
import { Campo } from "../components/Campo";
import { Recorrido } from "../components/Recorrido";
import { RUTA_PASO } from "../components/rutas";
import { empresaApi } from "../services/nucleo.service";
import type { ClavePaso, Paso } from "../types/configuracion.types";
import { PUNTOS_IA, PUNTOS_MANUAL, TarjetaModo } from "./BienvenidaView";
import styles from "../asistente.module.css";

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

/** Lo que el RUT dice de quién es la empresa (`POST /altas/rut/identificar`). */
interface Identidad {
  esRut: boolean;
  razonSocial: string | null;
  nit: string | null;
  dv: string | null;
  tipoPersona: "JURIDICA" | "NATURAL" | null;
  resumen: string;
}

/** Lo que se lee: PDF o foto. */
const TIPOS_RUT = "application/pdf,image/jpeg,image/png,image/webp";

/**
 * Los cinco pasos sin empezar, para el riel. La empresa todavía no existe, así
 * que no hay estado que pedirle al backend: es el recorrido en blanco.
 */
const PASOS_EN_BLANCO: Paso[] = (
  [
    ["EMPRESA", "Empresa"],
    ["SEDES", "Sedes"],
    ["SITUACION_LEGAL", "Situación legal"],
    ["PLAN_CUENTAS", "Plan de cuentas"],
    ["RESOLUCIONES", "Resoluciones"],
  ] as Array<[ClavePaso, string]>
).map(([clave, nombre], i) => ({
  clave,
  nombre,
  orden: i + 1,
  obligatorio: true,
  estado: "PENDIENTE",
  resumen: "",
  faltantes: [],
  opcionales: [],
}));

/**
 * La entrada de una cuenta sin empresa. **Lo primero es preguntar cómo**: con
 * IA o a mano. Después:
 *
 * - **A mano**: los datos de la empresa, y al crearla, directo al paso 2.
 * - **Con IA**: se sube el RUT, María lee quién es la empresa —razón social,
 *   NIT, tipo de persona—, la persona lo revisa y completa lo que el RUT no
 *   dice, y al crearla se entra al chat con ese mismo RUT ya leyéndose para
 *   llenar el resto de los pasos.
 *
 * Todo en el marco de la bienvenida: el riel en 0 % con «Empresa» en curso.
 */
export function CrearEmpresaView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const cerrarSesion = useCerrarSesion();
  const yaTieneEmpresa = useAuthStore((s) => s.empresas.length > 0);

  const [modo, setModo] = useState<"IA" | "MANUAL" | null>(null);
  /** El RUT que se subió, para volver a subirlo ya dentro de la empresa. */
  const [rut, setRut] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [identidad, setIdentidad] = useState<Identidad | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const elegir = useElegirEmpresa(
    modo === "IA"
      ? {
          destino: RUTA_MODO_IA,
          // Ya dentro de la empresa, el RUT entra por el camino de siempre y
          // se lee entero: lo que falta de los otros pasos sale de ahí.
          despues: async () => {
            if (rut === null) return;
            const { url, clave } = await asistenteService.urlDeCarga("RUT", rut.type);
            await asistenteService.subirAlBucket(url, rut, rut.type);
            await asistenteService.registrar("RUT", clave);
          },
        }
      : { destino: RUTA_PASO.SEDES },
  );

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
  // rechaza la fila si no coincide.
  const dv = digitoVerificacion(form.watch("nit"));

  const leerRut = async (archivo: File | undefined) => {
    if (archivo === undefined) return;
    if (!TIPOS_RUT.split(",").includes(archivo.type)) {
      aviso.error("Subí el RUT en PDF o en foto (JPG, PNG o WEBP).");
      return;
    }
    setLeyendo(true);
    setIdentidad(null);
    try {
      const { url, clave } = await api
        .post<{ url: string; clave: string }>("/altas/rut/carga", { tipoMime: archivo.type })
        .then((r) => r.data);
      const subida = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": archivo.type },
        body: archivo,
      });
      if (!subida.ok) throw new Error(`El archivo no se pudo subir (${subida.status}).`);
      const leida = await api
        .post<Identidad>("/altas/rut/identificar", { clave })
        .then((r) => r.data);
      setIdentidad(leida);
      if (leida.esRut) {
        setRut(archivo);
        if (leida.razonSocial) form.setValue("razonSocial", leida.razonSocial);
        if (leida.nit) form.setValue("nit", leida.nit);
        if (leida.tipoPersona) form.setValue("tipoPersona", leida.tipoPersona);
      }
    } catch (error) {
      aviso.error("No pude leer el RUT", mensajeDeError(error));
    } finally {
      setLeyendo(false);
    }
  };

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
      aviso.falla(error);
    }
  });

  const errores = form.formState.errors;
  const enviando = form.formState.isSubmitting || elegir.isPending;
  const dvNoCoincide =
    identidad?.dv != null && dv !== "" && identidad.dv !== dv && form.watch("nit") === identidad.nit;

  const salida = yaTieneEmpresa ? (
    <Button variant="ghost" onClick={() => router.push("/dashboard")}>
      Cancelar
    </Button>
  ) : (
    <Button variant="ghost" onClick={() => cerrarSesion.mutate()}>
      Salir
    </Button>
  );

  const volver = (
    <button
      type="button"
      onClick={() => {
        setModo(null);
        setIdentidad(null);
        setRut(null);
      }}
      className="flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Cambiar cómo configurarla
    </button>
  );

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div
        className={`${styles.sombraTarjeta} mx-auto flex h-full max-h-[calc(100dvh-64px)] w-full max-w-[1240px] overflow-hidden rounded-[1.05rem] border border-border bg-card`}
      >
        <Recorrido
          pasos={PASOS_EN_BLANCO}
          actual="EMPRESA"
          completados={0}
          porcentaje={0}
          razonSocial={form.watch("razonSocial").trim() || "Tu empresa"}
          modoIA={modo === "IA"}
          sinSalida
        />

        <section className="flex min-w-0 grow flex-col gap-8 overflow-y-auto px-6 pt-14 pb-10 sm:px-16">
          {modo === null && (
            <>
              <div className={`${styles.up} flex flex-col gap-4`}>
                <span className="font-mono text-[11px] uppercase tracking-[1.2px] text-muted-foreground">
                  Bienvenido · Configuración inicial
                </span>
                <h1 className="m-0 font-serif text-[clamp(2.25rem,4.5vw,3.375rem)] leading-[1.02] tracking-[-1.2px]">
                  ¿Cómo querés configurar <span className="italic">tu empresa?</span>
                </h1>
                <p className="m-0 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">
                  Son cinco pasos. Podés llenarlos vos o dejar que la IA los complete a partir de
                  tus documentos. En los dos casos, nada se guarda sin que lo confirmes.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TarjetaModo
                  oscura
                  retraso={styles.d1}
                  icono={<Destello size={22} className="text-brand" />}
                  insignia="Recomendado"
                  titulo="Con "
                  tituloCursiva="IA"
                  texto="Subí el RUT y la IA arma la empresa. Después sigue con la Cámara de Comercio y la resolución, y te pregunta solo lo que los papeles no dicen."
                  puntos={PUNTOS_IA}
                  accion="Empezar con IA"
                  alElegir={() => setModo("IA")}
                />
                <TarjetaModo
                  retraso={styles.d2}
                  icono={<Pencil className="size-[22px] text-foreground" strokeWidth={1.6} />}
                  titulo="A "
                  tituloCursiva="mano"
                  texto="Llená cada paso vos mismo, con los formularios de siempre. Ideal si ya tenés los datos a mano."
                  puntos={PUNTOS_MANUAL}
                  accion="Configurar a mano"
                  alElegir={() => setModo("MANUAL")}
                />
              </div>
              <div>{salida}</div>
            </>
          )}

          {modo === "IA" && identidad?.esRut !== true && (
            <>
              <div className={`${styles.up} flex flex-col gap-4`}>
                {volver}
                <span className="font-mono text-[11px] uppercase tracking-[1.2px] text-muted-foreground">
                  Con IA · Paso 01
                </span>
                <h1 className="m-0 font-serif text-[clamp(2.25rem,4.5vw,3.375rem)] leading-[1.02] tracking-[-1.2px]">
                  Empecemos por <span className="italic">el RUT.</span>
                </h1>
                <p className="m-0 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">
                  De ahí saco el nombre, el NIT y el tipo de persona para crear la empresa. Antes de
                  crearla te lo muestro para que lo revises.
                </p>
              </div>

              <input
                ref={entrada}
                type="file"
                accept={TIPOS_RUT}
                className="sr-only"
                aria-label="Elegir el RUT"
                onChange={(e) => {
                  void leerRut(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={leyendo}
                onClick={() => entrada.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void leerRut(e.dataTransfer.files?.[0]);
                }}
                className={`${styles.up} ${styles.d1} flex max-w-2xl flex-col items-center gap-4 rounded-[1.05rem] border border-dashed border-input px-6 py-12 text-center transition-colors hover:border-foreground disabled:cursor-wait`}
              >
                {leyendo ? (
                  <>
                    <Maria estado="leyendo" tamano={56} />
                    <span className="text-sm font-medium" aria-live="polite">
                      Leyendo el RUT…
                    </span>
                  </>
                ) : (
                  <>
                    <FileUp className="size-7 text-muted-foreground" strokeWidth={1.6} />
                    <span className="text-sm font-medium">
                      Arrastrá el RUT acá, o hacé clic para elegirlo
                    </span>
                    <span className="text-xs text-muted-foreground">PDF o foto</span>
                  </>
                )}
              </button>
              {identidad !== null && !identidad.esRut && (
                <p className="m-0 max-w-2xl rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                  {identidad.resumen}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setModo("MANUAL")}>
                  No tengo el RUT a mano: seguir a mano
                </Button>
                {salida}
              </div>
            </>
          )}

          {(modo === "MANUAL" || (modo === "IA" && identidad?.esRut === true)) && (
            <>
              <div className={`${styles.up} flex flex-col gap-4`}>
                {volver}
                <span className="font-mono text-[11px] uppercase tracking-[1.2px] text-muted-foreground">
                  {modo === "IA" ? "Con IA · Paso 01" : "A mano · Paso 01"} · Empresa
                </span>
                <h1 className="m-0 font-serif text-[clamp(2.25rem,4.5vw,3.375rem)] leading-[1.02] tracking-[-1.2px]">
                  {modo === "IA" ? "Esto dice el RUT. " : "Primero, "}
                  <span className="italic">{modo === "IA" ? "¿Está bien?" : "tu empresa."}</span>
                </h1>
                <p className="m-0 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">
                  {modo === "IA"
                    ? "Revisá el nombre, el NIT y el tipo de persona, y elegí lo que el RUT no dice. Al crearla sigo con el resto del RUT en el chat."
                    : "Con estos datos la creamos, y seguís con el paso 2."}
                </p>
              </div>

              <form
                className={`${styles.up} ${styles.d1} flex max-w-2xl flex-col gap-4`}
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid gap-3 sm:grid-cols-[176px_1fr]">
                  <Campo
                    id="tipoPersona"
                    etiqueta="Tipo de persona"
                    ayuda={modo === "IA" && identidad?.tipoPersona ? "Del RUT" : undefined}
                  >
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
                    ayuda={modo === "IA" && identidad?.razonSocial ? "Del RUT" : undefined}
                    error={errores.razonSocial?.message}
                  >
                    <Input id="razonSocial" {...form.register("razonSocial")} />
                  </Campo>
                </div>

                <div className="grid gap-3 sm:grid-cols-[160px_72px_1fr]">
                  <Campo
                    id="nit"
                    etiqueta="NIT"
                    ayuda={modo === "IA" && identidad?.nit ? "Del RUT" : undefined}
                    error={errores.nit?.message}
                  >
                    <Input
                      id="nit"
                      className="font-mono"
                      placeholder="900123456"
                      {...form.register("nit")}
                    />
                  </Campo>

                  {/* De solo lectura: el DV es una función del NIT, no una decisión. */}
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
                {dvNoCoincide && (
                  <p className="m-0 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                    El RUT dice dígito de verificación {identidad?.dv} y con este NIT da {dv}. Revisá
                    el NIT: puede que lo haya leído mal.
                  </p>
                )}

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
                  <Campo id="grupoNiif" etiqueta="Grupo NIIF" ayuda="Grupo 2 es lo habitual">
                    <Select
                      value={form.watch("grupoNiif")}
                      onValueChange={(v) => form.setValue("grupoNiif", v as Datos["grupoNiif"])}
                    >
                      <SelectTrigger id="grupoNiif">
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

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={crear} disabled={enviando}>
                    {modo === "IA" ? "Crear y seguir con IA" : "Crear y seguir"}
                    <ChevronRight className="size-4" />
                  </Button>
                  {salida}
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
