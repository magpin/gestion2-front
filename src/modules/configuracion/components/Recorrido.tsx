"use client";

import Link from "next/link";
import { Check, Lock } from "lucide-react";

import { Marca } from "@/modules/landing/components/Marca";
import type { ClavePaso, EstadoPaso, Paso } from "../types/configuracion.types";
import { RUTA_PASO } from "./rutas";
import styles from "../asistente.module.css";

/**
 * El riel: una línea de tiempo, no una lista de círculos.
 *
 * La diferencia no es decorativa. Una lista dice qué pasos hay; una línea de
 * tiempo dice **por dónde va**: el tramo que ya se recorrió va sólido y el que
 * falta, punteado. Con una sola mirada se ve cuánto queda sin leer un número.
 *
 * El paso actual es el único que se abre en tarjeta y el único que lleva
 * naranja. Los cuatro restantes son una línea cada uno. Es la regla de dosis
 * del reglamento aplicada a una pantalla que se mira cinco veces seguidas: si
 * cada paso resuelto se pintara de acento, al cuarto el acento ya no señalaría.
 */

/** Lo que va bajo el nombre cuando no hay nada concreto que reportar. */
const RESUMEN_CORTO: Record<ClavePaso, string> = {
  EMPRESA: "Identificación y políticas contables",
  SEDES: "Dónde opera la empresa",
  SITUACION_LEGAL: "Lo que dice el RUT",
  PLAN_CUENTAS: "Cuentas para registrar",
  RESOLUCIONES: "Numeración autorizada por la DIAN",
};

interface RecorridoProps {
  pasos: Paso[];
  actual: ClavePaso | null;
  completados: number;
  porcentaje: number;
  razonSocial: string;
  /** En modo IA el riel explica que los pasos se llenan solos. */
  modoIA?: boolean;
}

export function Recorrido({
  pasos,
  actual,
  completados,
  porcentaje,
  razonSocial,
  modoIA = false,
}: RecorridoProps) {
  return (
    <aside
      className={`${styles.trama} hidden min-h-0 w-full shrink-0 flex-col gap-7 overflow-y-auto p-7 text-rail-foreground lg:flex lg:w-100`}
    >
      <Marca invertido />

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[1.2px] text-rail-muted">
            Configuración inicial
          </span>
          {/* La razón social en serif y grande: es de quién es esta
              configuración, y un contador que lleva quince empresas necesita
              verlo sin buscarlo. */}
          <span className="font-serif text-[28px] leading-[1.1]">{razonSocial}</span>
        </div>

        <BarraSegmentada pasos={pasos} actual={actual} />

        <div className="flex justify-between text-xs text-rail-muted">
          <span>
            {completados} de {pasos.length} listos
          </span>
          <span className="font-mono text-rail-foreground">{porcentaje} %</span>
        </div>
      </div>

      <ol aria-label="Pasos de la configuración" className="m-0 flex list-none flex-col p-0">
        {pasos.map((paso, i) => (
          <FilaRecorrido
            key={paso.clave}
            paso={paso}
            numero={i + 1}
            esActual={paso.clave === actual}
            esUltimo={i === pasos.length - 1}
            anteriorListo={pasos[i - 1]?.estado === "LISTO"}
            modoIA={modoIA}
          />
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-3.5">
        {modoIA && (
          <p className="m-0 rounded-lg border border-rail-line bg-rail-foreground/6 p-3.5 text-xs leading-relaxed text-rail-muted">
            <span className="font-medium text-rail-foreground">Modo IA.</span> Los pasos se
            llenan a medida que la IA lee tus documentos. Tú confirmas cada uno.
          </p>
        )}
        <Link
          href="/dashboard"
          className="text-[13px] text-rail-muted no-underline hover:text-rail-foreground"
        >
          Guardar y salir al tablero
        </Link>
      </div>
    </aside>
  );
}

/**
 * Cinco segmentos, uno por paso — no una barra continua.
 *
 * Una barra de 60% no dice cuál de los cinco falta. Cinco segmentos sí, y de
 * paso hacen coincidir lo que se ve arriba con lo que se lee abajo.
 *
 * El actual va en gris medio y **no** en naranja: el naranja del riel está
 * reservado al punto del paso actual en la línea de tiempo. Dos naranjas a diez
 * píxeles uno del otro se anulan.
 */
function BarraSegmentada({ pasos, actual }: { pasos: Paso[]; actual: ClavePaso | null }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {pasos.map((paso) => {
        const color =
          paso.estado === "LISTO"
            ? "bg-secondary"
            : paso.clave === actual
              ? "bg-muted-foreground"
              : "bg-rail-line";
        return <span key={paso.clave} className={`h-1 grow rounded-full ${color}`} />;
      })}
    </div>
  );
}

function FilaRecorrido({
  paso,
  numero,
  esActual,
  esUltimo,
  anteriorListo,
  modoIA,
}: {
  paso: Paso;
  numero: number;
  esActual: boolean;
  esUltimo: boolean;
  anteriorListo: boolean;
  modoIA: boolean;
}) {
  const bloqueado = paso.estado === "BLOQUEADO";

  // Qué falta, no cuántos faltan. "Faltan 2" no le dice a nadie qué hacer; el
  // dato concreto ya viaja en la respuesta del backend.
  const resumen = bloqueado
    ? `Requiere ${paso.bloqueadoPor === "SITUACION_LEGAL" ? "la situación legal" : "un paso anterior"}`
    : paso.faltantes.length > 0
      ? paso.faltantes.map((f) => f.etiqueta).join(" · ")
      : paso.estado === "LISTO"
        ? paso.resumen
        : RESUMEN_CORTO[paso.clave];

  const contenido = esActual ? (
    <span className="mb-3.5 flex flex-col gap-1.5 rounded-lg border border-rail-line bg-rail-foreground/6 px-4 py-3.5">
      <span className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[1px] text-rail-muted">
          PASO {String(numero).padStart(2, "0")}
        </span>
        <span className="rounded-full border border-muted-foreground px-2 py-0.5 text-[11px] text-secondary">
          {modoIA ? "Llenando" : "En curso"}
        </span>
      </span>
      <span className="font-serif text-[26px] leading-[1.05] text-rail-foreground">
        {paso.nombre}
      </span>
      <span className="text-[13px] leading-[1.45] text-rail-muted">{resumen}</span>
    </span>
  ) : (
    <span className="flex flex-col gap-0.5 px-4 pt-0.5 pb-4">
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-2.5">
          <span className="font-mono text-[11px] text-rail-muted">
            {String(numero).padStart(2, "0")}
          </span>
          <span className="text-sm font-medium text-rail-foreground">{paso.nombre}</span>
        </span>
        <EtiquetaEstado estado={paso.estado} />
      </span>
      {/* La sangría alinea el resumen con el nombre, no con el número: el
          número es una referencia, el nombre es el asunto. */}
      <span className="pl-6.5 text-xs leading-[1.45] text-rail-muted">{resumen}</span>
    </span>
  );

  const columnaMarca = (
    <span className={`flex flex-col items-center ${esActual ? "pt-4" : ""}`}>
      <span className="flex size-6 shrink-0 items-center justify-center">
        <MarcaPaso estado={paso.estado} esActual={esActual} />
      </span>
      {/* El tramo hasta el paso siguiente. Sólido si el de arriba está listo,
          punteado si no: el camino recorrido se ve distinto del que falta. */}
      {!esUltimo && (
        <span
          className={`my-1 min-h-3.5 w-0 grow border-l ${
            paso.estado === "LISTO" || (esActual && anteriorListo)
              ? "border-solid border-secondary"
              : "border-dashed border-muted-foreground"
          }`}
        />
      )}
    </span>
  );

  const clases = `grid grid-cols-[24px_minmax(0,1fr)] gap-x-1.5 ${bloqueado ? "opacity-55" : ""}`;

  // Un paso bloqueado no es un enlace. Entrar a uno que exige otro antes no
  // lleva a ninguna parte, y un enlace que no lleva a ninguna parte es peor que
  // no tenerlo: se descubre solo después de hacer clic.
  if (bloqueado) {
    return (
      <li className={clases}>
        {columnaMarca}
        <div>{contenido}</div>
      </li>
    );
  }

  return (
    <li className={clases} {...(esActual ? { "aria-current": "step" as const } : {})}>
      {columnaMarca}
      <Link href={RUTA_PASO[paso.clave]} className="no-underline">
        {contenido}
      </Link>
    </li>
  );
}

/**
 * El estado en palabras, además de en forma y color.
 *
 * Sin esto, "listo" y "incompleto" se distinguen solo por un ícono y un tono —
 * y quien no distingue esos tonos se queda sin la información.
 */
function EtiquetaEstado({ estado }: { estado: EstadoPaso }) {
  if (estado === "LISTO") {
    return <span className="text-[11px] text-rail-muted">Listo</span>;
  }
  if (estado === "FALTA") {
    // Fondo y borde con el color de estado, texto neutro. Un texto en `warning`
    // sobre el riel oscuro no alcanza contraste de lectura.
    return (
      <span className="rounded-full border border-warning/45 bg-warning/18 px-2 py-0.5 text-[11px] text-rail-foreground">
        Incompleto
      </span>
    );
  }
  if (estado === "BLOQUEADO") {
    return <span className="text-[11px] text-rail-muted">Bloqueado</span>;
  }
  return null;
}

/** La marca de la línea de tiempo. Cinco estados, cinco formas distintas. */
function MarcaPaso({ estado, esActual }: { estado: EstadoPaso; esActual: boolean }) {
  if (esActual) {
    return <span className={`${styles.halo} size-3.5 rounded-full bg-brand`} />;
  }

  if (estado === "LISTO") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-secondary text-rail">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }

  if (estado === "FALTA") {
    // Triángulo y no círculo: la forma ya avisa antes que el color.
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="fill-warning">
        <path d="M12 3.2 22.4 21H1.6z" />
      </svg>
    );
  }

  if (estado === "BLOQUEADO") {
    return <Lock className="size-[15px] text-rail-muted" strokeWidth={2} />;
  }

  return <span className="size-3 rounded-full border-[1.5px] border-muted-foreground" />;
}
