"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export type TonoAviso = "exito" | "alarma" | "error" | "info";

const ESTILO: Record<
  TonoAviso,
  { icono: typeof Info; caja: string; marca: string; cifra: string }
> = {
  exito: {
    icono: CheckCircle2,
    caja: "border-success/30 bg-success/10",
    marca: "bg-success/15 text-success",
    cifra: "text-success",
  },
  alarma: {
    icono: AlertTriangle,
    caja: "border-warning/30 bg-warning/10",
    marca: "bg-warning/15 text-warning",
    cifra: "text-warning",
  },
  error: {
    icono: XCircle,
    caja: "border-danger/30 bg-danger/10",
    marca: "bg-danger/15 text-danger",
    cifra: "text-danger",
  },
  info: {
    icono: Info,
    caja: "border-border bg-muted/50",
    marca: "bg-brand/10 text-brand",
    cifra: "",
  },
};

/**
 * El aviso grande: lo que pasó, en qué número, y qué hacer con eso.
 *
 * Existe porque hasta hoy todo se avisaba con un *toast* chico que se va solo
 * a los pocos segundos. Sirve para confirmar que algo salió bien; no sirve
 * para decirle a alguien que su caja está descuadrada en doscientos mil pesos
 * —eso tiene que quedarse en pantalla hasta que se resuelva—.
 *
 * `cifra` es el número del que se trata el aviso, y va grande: quien está
 * cuadrando una caja necesita ver *cuánto* falta antes que ninguna otra cosa.
 * `accion` es el renglón de "y ahora qué", que es lo que convierte un aviso en
 * algo accionable en vez de un reproche.
 */
export function Aviso({
  tono,
  titulo,
  cifra,
  children,
  accion,
}: {
  tono: TonoAviso;
  titulo: string;
  /** El número del que trata el aviso, ya formateado. */
  cifra?: string;
  /** Qué significa, en una o dos frases. */
  children?: ReactNode;
  /** Qué hacer al respecto: un botón, un enlace, una instrucción. */
  accion?: ReactNode;
}) {
  const estilo = ESTILO[tono];
  const Icono = estilo.icono;

  return (
    <section
      role={tono === "error" || tono === "alarma" ? "alert" : "status"}
      className={`mb-6 flex flex-wrap items-start gap-5 rounded-3xl border p-6 ${estilo.caja}`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-2xl ${estilo.marca}`}
      >
        <Icono className="size-6" />
      </span>

      <div className="min-w-[240px] flex-1">
        <h3 className="text-xl font-semibold tracking-[-0.01em]">{titulo}</h3>
        {cifra !== undefined && (
          <p
            className={`mt-1 font-mono text-4xl font-semibold tabular-nums tracking-[-0.03em] ${estilo.cifra}`}
          >
            {cifra}
          </p>
        )}
        {children !== undefined && (
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            {children}
          </div>
        )}
      </div>

      {accion !== undefined && <div className="self-center">{accion}</div>}
    </section>
  );
}
