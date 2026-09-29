"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Copy,
  FileQuestion,
  Loader2,
  RefreshCw,
  Scale,
  Tags,
} from "lucide-react";

import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { Maria } from "@/modules/asistente/components/Maria";
import { cn, formatCOP } from "@/lib/utils";
import { revisionApi } from "../services/contabilidad.service";
import type {
  Certeza,
  GrupoHallazgo,
  Hallazgo,
} from "../types/contabilidad.types";

/** Los grupos, en el orden en que importan. */
const GRUPOS: Array<{
  grupo: GrupoHallazgo;
  titulo: string;
  explicacion: string;
  Icono: typeof Scale;
}> = [
  {
    grupo: "DESCUADRE",
    titulo: "Lo que no cuadra",
    explicacion:
      "Dos registros de la misma plata que tendrían que dar igual y no dan.",
    Icono: Scale,
  },
  {
    grupo: "DUPLICADO",
    titulo: "Lo que está dos veces",
    explicacion:
      "La misma factura, el mismo cobro o el mismo tercero, repetido.",
    Icono: Copy,
  },
  {
    grupo: "FECHAS",
    titulo: "Fechas que no pueden ser ciertas a la vez",
    explicacion:
      "Un dato que contradice a otro. Cuál está mal lo decide una persona.",
    Icono: CalendarClock,
  },
  {
    grupo: "FALTANTE",
    titulo: "Lo que parece faltar",
    explicacion: "Retenciones, cierres o registros que no están.",
    Icono: FileQuestion,
  },
  {
    grupo: "CLASIFICACION",
    titulo: "Lo que parece mal clasificado",
    explicacion: "Cuentas, productos o terceros que no están donde deberían.",
    Icono: Tags,
  },
];

/** Cómo se dice cada nivel de certeza, en la etiqueta de la tarjeta. */
const CERTEZA: Record<Certeza, { etiqueta: string; clase: string }> = {
  AFIRMADO: {
    etiqueta: "Comprobado",
    clase: "bg-danger/10 text-danger",
  },
  VISTA: {
    etiqueta: "Lo vi, me parece",
    clase: "bg-warning/15 text-warning-foreground",
  },
  DEDUCIDA: {
    etiqueta: "Lo deduzco",
    clase: "bg-muted text-muted-foreground",
  },
};

/**
 * Lo que María encontró revisando los libros.
 *
 * **Dos mitades, y la diferencia es lo que se dice.** Arriba, lo comprobado:
 * comparaciones exactas —esto dice un lado, esto el otro— o algo que está dos
 * veces. Abajo, lo que pide criterio: el hecho puede estar claro —julio sigue
 * abierto— o ser una deducción, pero si es un error lo decide una persona. Por
 * eso cada tarjeta dice su certeza, y las de abajo hablan con «me parece».
 *
 * Y no hay botón de corregir en ninguna tarjeta, a propósito: encontrar es de
 * María, corregir es de una persona, por la pantalla de siempre.
 */
export function RevisionSeccion() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["revision"],
    queryFn: revisionApi.revisar,
    meta: SILENCIOSO,
    // Una revisión es una foto: se pide al entrar y cuando alguien la pide.
    staleTime: Infinity,
  });

  const hallazgos = data ?? [];
  const afirmados = hallazgos.filter((h) => h.certeza === "AFIRMADO");
  const criterio = hallazgos.filter((h) => h.certeza !== "AFIRMADO");

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Maria
            estado={
              isFetching
                ? "pensando"
                : isError
                  ? "noPude"
                  : hallazgos.length === 0
                    ? "lista"
                    : "espera"
            }
            tamano={36}
          />
          <div>
            <p className="text-sm font-semibold">
              {isLoading
                ? "Revisando los libros…"
                : isError
                  ? "No pude revisar los libros ahora."
                  : hallazgos.length === 0
                    ? "Revisé los libros y no encontré nada."
                    : resumen(afirmados.length, criterio.length)}
            </p>
            <p className="text-xs text-muted-foreground">
              Asientos, cierres, kardex, cajas, bancos, facturas, cobros, pagos,
              retenciones, productos y terceros. No corrijo nada: eso lo hace
              una persona.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-xl"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Revisar de nuevo
        </Button>
      </div>

      {data === undefined && isError && (
        <ErrorCarga error={error} titulo="No se pudo hacer la revisión de los libros" onReintentar={refetch} />
      )}
      {afirmados.length > 0 && (
        <Mitad
          titulo="Lo que comprobé"
          explicacion="Comparaciones exactas: o cuadra o no cuadra."
          hallazgos={afirmados}
        />
      )}
      {criterio.length > 0 && (
        <Mitad
          titulo="Lo que me parece"
          explicacion="Puede ser un error o no: lo decide quien lleva la contabilidad."
          hallazgos={criterio}
        />
      )}
    </section>
  );
}

function resumen(afirmados: number, criterio: number): string {
  const partes = [
    ...(afirmados > 0
      ? [
          `${afirmados} ${afirmados === 1 ? "cosa comprobada" : "cosas comprobadas"}`,
        ]
      : []),
    ...(criterio > 0
      ? [
          `${criterio} que ${criterio === 1 ? "me parece" : "me parecen"} para revisar`,
        ]
      : []),
  ];
  return `Revisé los libros: ${partes.join(" y ")}.`;
}

function Mitad({
  titulo,
  explicacion,
  hallazgos,
}: {
  titulo: string;
  explicacion: string;
  hallazgos: Hallazgo[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-border pb-2">
        <h3 className="text-base font-semibold">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{explicacion}</p>
      </div>
      {GRUPOS.map(({ grupo, titulo: tituloGrupo, explicacion: exp, Icono }) => {
        const delGrupo = hallazgos.filter((h) => h.grupo === grupo);
        if (delGrupo.length === 0) return null;
        return (
          <div key={grupo} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <Icono className="size-4 self-center text-muted-foreground" />
              <h4 className="text-sm font-semibold">{tituloGrupo}</h4>
              <span className="text-xs text-muted-foreground">{exp}</span>
            </div>
            {delGrupo.map((h, i) => (
              <Tarjeta key={`${h.tipo}-${i}`} hallazgo={h} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Tarjeta({ hallazgo }: { hallazgo: Hallazgo }) {
  const { cifras } = hallazgo;
  const certeza = CERTEZA[hallazgo.certeza];
  return (
    <article
      className={cn(
        "rounded-2xl border p-5",
        hallazgo.certeza === "AFIRMADO"
          ? "border-warning/40 bg-warning/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h5 className="text-sm font-semibold">{hallazgo.titulo}</h5>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            certeza.clase,
          )}
        >
          {certeza.etiqueta}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{hallazgo.detalle}</p>

      {/* La diferencia en grande solo cuando es una diferencia entre dos
          lados; en un duplicado el número ya está en el texto. */}
      {cifras !== undefined && hallazgo.grupo === "DESCUADRE" && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {formatCOP(cifras.uno)} · {formatCOP(cifras.otro)} ·{" "}
          <span className="font-semibold text-foreground">
            diferencia {formatCOP(cifras.diferencia)}
          </span>
        </p>
      )}

      {hallazgo.referencias.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {hallazgo.referencias.slice(0, 12).map((r) => (
            <li
              key={`${r.tipo}-${r.id}`}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {r.etiqueta}
            </li>
          ))}
          {hallazgo.referencias.length > 12 && (
            <li className="px-1 text-[11px] text-muted-foreground">
              y {hallazgo.referencias.length - 12} más
            </li>
          )}
        </ul>
      )}
    </article>
  );
}
