"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/core/store/authStore";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import type { ClavePaso, EstadoPaso, Paso } from "../types/configuracion.types";

export const RUTA_PASO: Record<ClavePaso, string> = {
  EMPRESA: "/configuracion/empresa",
  SEDES: "/configuracion/sedes",
  SITUACION_LEGAL: "/configuracion/situacion_legal",
  PLAN_CUENTAS: "/configuracion/plan_cuentas",
  RESOLUCIONES: "/configuracion/resoluciones",
};

/**
 * Una línea por paso, para el encabezado.
 *
 * Dice qué se resuelve ahí, no qué campos tiene. Quien configura no viene a
 * "llenar la situación legal": viene a dejar registrado lo que dice su RUT.
 */
const DESCRIPCION: Record<ClavePaso, string> = {
  EMPRESA: "Cómo se identifica y con qué políticas lleva su contabilidad.",
  SEDES: "Dónde opera. El municipio de la principal define la tarifa de ICA.",
  SITUACION_LEGAL:
    "Lo que dice el RUT: responsabilidades, representante y actividad.",
  PLAN_CUENTAS: "Las cuentas que se desprenden de lo que ya declaraste.",
  RESOLUCIONES: "La numeración que la DIAN autorizó para facturar.",
};

/** Lo que va bajo el nombre del paso mientras no haya nada concreto que decir. */
const RESUMEN_CORTO: Record<ClavePaso, string> = {
  EMPRESA: "Identificación y contabilidad",
  SEDES: "Dónde opera",
  SITUACION_LEGAL: "RUT y actividad",
  PLAN_CUENTAS: "Cuentas para registrar",
  RESOLUCIONES: "Numeración autorizada",
};

/**
 * Un solo ancho para la cabecera y la tarjeta, igual en los cinco pasos.
 *
 * Antes el plan de cuentas usaba uno más ancho porque su lista se apretujaba, y
 * el resultado era que la tarjeta cambiaba de tamaño al avanzar. Un armazón que
 * se mueve entre pasos hace parecer que cambió la pantalla, no el contenido.
 */
const ANCHO = "max-w-[1240px]";

interface Props {
  clave: ClavePaso;
  titulo: string;
  children: ReactNode;
  /** Qué hace el botón principal. Cada paso decide si guarda o solo avanza. */
  alContinuar?: () => void;
  guardando?: boolean;
  etiquetaContinuar?: string;
}

/**
 * El armazón del asistente: el recorrido a la izquierda sobre panel oscuro, el
 * paso actual a la derecha.
 *
 * El panel no es decoración. Responde las dos preguntas que se hace quien
 * configura —dónde estoy y cuánto falta— sin que tenga que buscarlas, y por eso
 * ocupa un tercio de la pantalla en vez de una barra fina arriba.
 *
 * En móvil desaparece y queda la barra de avance: cinco pasos en columna
 * empujarían el formulario debajo del pliegue, que es lo único que hay que ver.
 */
export function AsistenteShell({
  clave,
  titulo,
  children,
  alContinuar,
  guardando,
  etiquetaContinuar = "Continuar",
}: Props) {
  const router = useRouter();
  const { data, isLoading } = useEstadoConfiguracion();
  const empresas = useAuthStore((s) => s.empresas);
  const empresaId = useAuthStore((s) => s.empresaId);
  const empresa = empresas.find((e) => e.id === empresaId);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const indice = data.pasos.findIndex((p) => p.clave === clave);
  const paso = data.pasos[indice];
  const anterior = data.pasos[indice - 1];
  const siguiente = data.pasos[indice + 1];
  const restantes = data.totalObligatorios - data.completados;

  return (
    /* Alto de pantalla y sin desbordar: la tarjeta no crece con el contenido.
       Lo que scrollea es el cuerpo del paso, adentro. Una tarjeta que crece
       empuja los botones fuera de la vista y obliga a bajar toda la página para
       encontrarlos, que es lo contrario de lo que un asistente debe hacer. */
    <main className="flex h-dvh flex-col overflow-hidden bg-background px-3 sm:px-6">
      <header
        className={`mx-auto flex h-14 w-full shrink-0 items-center gap-3 px-2 sm:h-16 ${ANCHO}`}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="size-4" />
        </span>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight">
            {empresa?.razonSocial ?? "Empresa"}
          </span>
          {empresa && (
            <span className="block font-mono text-[11px] leading-tight text-muted-foreground">
              {empresa.nit}-{empresa.dv}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground"
          onClick={() => router.push("/dashboard")}
        >
          <X className="size-4" />
          Salir
        </Button>
      </header>

      <div
        className={`mx-auto mb-5 grid min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_60px_rgba(23,23,23,0.07)] lg:grid-cols-[300px_1fr] ${ANCHO}`}
      >
        <Recorrido
          pasos={data.pasos}
          actual={clave}
          porcentaje={data.porcentaje}
          restantes={restantes}
        />

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0 px-6 pt-8 sm:px-10 sm:pt-10">
            {/* En móvil el panel no está, así que la barra carga con todo el peso
              de decir dónde estamos. */}
            <div className="mb-8 lg:hidden">
              <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                <span>
                  Paso {indice + 1} de {data.pasos.length}
                </span>
                <span className="font-mono font-semibold text-brand-text">
                  {data.porcentaje}%
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${data.porcentaje}%` }}
                />
              </div>
            </div>

            <div className="flex min-w-0 gap-4">
              <span className="hidden font-mono text-[13px] font-bold tracking-wider text-muted-foreground sm:block">
                {String(indice + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Paso {indice + 1} de {data.pasos.length}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  {titulo}
                </h1>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {DESCRIPCION[clave]}
                </p>
              </div>
            </div>
          </div>

          {/* La única región que scrollea. `overscroll-contain` evita que al
              llegar al final la rueda siga moviendo lo de atrás. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 sm:px-10">
            {children}
          </div>

          {/* Lo que conviene pero no bloquea: matrícula mercantil, credenciales
              de la DIAN, un sector sin actividad que lo respalde. Va con los
              botones y no dentro del cuerpo: es contexto del paso entero, no una
              fila más de la lista que se está mirando. */}
          {paso !== undefined && paso.opcionales.length > 0 && (
            <ul className="mx-6 mb-4 flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3.5 sm:mx-10">
              {paso.opcionales.map((o) => (
                <li
                  key={o.campo + o.etiqueta}
                  className="flex items-start gap-2 text-xs"
                >
                  <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium">{o.etiqueta}</span>
                    {o.detalle && (
                      <span className="block text-muted-foreground">
                        {o.detalle}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 items-center gap-2 border-t border-border px-6 py-4 sm:px-10">
            {anterior ? (
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => router.push(RUTA_PASO[anterior.clave])}
              >
                <ArrowLeft className="size-4" />
                Atrás
              </Button>
            ) : (
              <span />
            )}

            <div className="ml-auto flex items-center gap-2">
              {siguiente && siguiente.estado !== "BLOQUEADO" && (
                <Button
                  variant="outline"
                  onClick={() => router.push(RUTA_PASO[siguiente.clave])}
                >
                  Después
                </Button>
              )}
              {alContinuar && (
                <Button onClick={alContinuar} disabled={guardando}>
                  {guardando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {etiquetaContinuar}
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * El recorrido, sobre fondo oscuro.
 *
 * Solo el paso actual lleva acento. Los resueltos van con un check neutro y no
 * en naranja: con cuatro pasos terminados el panel tendría cuatro naranjas, y la
 * regla de dosis pide que el acento señale un punto, no cinco.
 */
function Recorrido({
  pasos,
  actual,
  porcentaje,
  restantes,
}: {
  pasos: Paso[];
  actual: ClavePaso;
  porcentaje: number;
  restantes: number;
}) {
  return (
    <aside className="hidden min-h-0 flex-col justify-between overflow-hidden bg-rail px-9 py-10 text-rail-foreground lg:flex">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rail-muted">
          Configuración
        </p>
        <h2 className="mt-3 text-[26px] font-semibold leading-[1.12] tracking-tight [@media(min-height:820px)]:text-[28px]">
          Dejemos tu empresa
          <br />
          <em className="font-serif font-normal italic">
            lista para facturar.
          </em>
        </h2>
        {/* Lo primero que se va cuando la pantalla es baja: el recorrido y el
            avance sí tienen que estar siempre, esto acompaña. */}
        <p className="mt-5 hidden max-w-[240px] text-[13px] leading-relaxed text-rail-muted [@media(min-height:820px)]:block">
          Cinco pasos. Cada dato que cargues decide algo concreto: qué impuestos
          liquidás, con qué cuentas registrás y con qué numeración emitís.
        </p>
      </div>

      <nav className="my-8 flex flex-col [@media(min-height:820px)]:my-10">
        {pasos.map((paso, i) => (
          <FilaRecorrido
            key={paso.clave}
            paso={paso}
            numero={i + 1}
            esActual={paso.clave === actual}
          />
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-rail-line pt-5">
        <ShieldCheck className="size-4 shrink-0 text-rail-muted" />
        <p className="text-[11px] leading-snug text-rail-muted">
          {restantes === 0 ? (
            <>
              Todo listo.
              <br />
              <span className="font-semibold text-rail-foreground">
                Ya podés facturar
              </span>
            </>
          ) : (
            <>
              Llevás{" "}
              <span className="font-mono font-semibold text-rail-foreground">
                {porcentaje}%
              </span>
              <br />
              Te {restantes === 1 ? "queda" : "quedan"}{" "}
              <span className="font-semibold text-rail-foreground">
                {restantes} paso{restantes === 1 ? "" : "s"}
              </span>
            </>
          )}
        </p>
      </div>
    </aside>
  );
}

function FilaRecorrido({
  paso,
  numero,
  esActual,
}: {
  paso: Paso;
  numero: number;
  esActual: boolean;
}) {
  const bloqueado = paso.estado === "BLOQUEADO";
  const listo = paso.estado === "LISTO";

  const cuerpo = (
    <>
      <Marca estado={paso.estado} numero={numero} esActual={esActual} />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] font-semibold ${
            esActual
              ? "text-rail-foreground"
              : bloqueado
                ? "text-rail-muted"
                : ""
          }`}
        >
          {paso.nombre}
        </span>
        {/* Qué falta, no cuántos faltan: "Faltan 1" no le dice nada a nadie, y
            el dato concreto ya viaja en la respuesta. */}
        <span className="mt-0.5 block truncate text-[11px] text-rail-muted">
          {bloqueado
            ? "Requiere la situación legal"
            : paso.faltantes.length > 0
              ? paso.faltantes.map((f) => f.etiqueta).join(" · ")
              : listo
                ? paso.resumen
                : RESUMEN_CORTO[paso.clave]}
        </span>
      </span>
    </>
  );

  const clases = `flex items-center gap-3.5 rounded-lg px-2.5 py-3 text-left transition-colors ${
    esActual ? "bg-rail-line/40" : ""
  }`;

  if (bloqueado) {
    return <div className={`${clases} opacity-55`}>{cuerpo}</div>;
  }

  return (
    <Link
      href={RUTA_PASO[paso.clave]}
      className={`${clases} hover:bg-rail-line/30`}
    >
      {cuerpo}
    </Link>
  );
}

/**
 * El círculo de cada paso.
 *
 * El único naranja del panel es el paso actual, y ahí el acento hace lo que el
 * reglamento le pide: dirigir la atención a un punto. El texto encima del
 * relleno va oscuro —`brand-foreground`—, nunca blanco.
 */
function Marca({
  estado,
  numero,
  esActual,
}: {
  estado: EstadoPaso;
  numero: number;
  esActual: boolean;
}) {
  if (esActual) {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-[12px] font-bold text-brand-foreground">
        {numero}
      </span>
    );
  }

  if (estado === "LISTO") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-rail-line bg-rail-line/40 text-rail-foreground">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }

  if (estado === "BLOQUEADO") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-rail-line text-rail-muted">
        <Lock className="size-3" />
      </span>
    );
  }

  if (estado === "FALTA") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-rail-line text-warning">
        <AlertTriangle className="size-3.5" />
      </span>
    );
  }

  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-rail-line text-[12px] text-rail-muted">
      {numero}
    </span>
  );
}
