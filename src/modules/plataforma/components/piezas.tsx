"use client";

import Link from "next/link";
import { AlertCircle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NOMBRE_ESTADO, NOMBRE_PLAN, type EstadoCuenta, type Plan } from "../types/plataforma.types";

/**
 * Las piezas con que se arma cada pantalla de la consola
 * (`docs/plataforma-diseno/`). Ningún color escrito a mano: todo por rol.
 */

/** El título de la página: Instrument Serif, con su línea de contexto. */
export function Encabezado({
  titulo,
  subtitulo,
  ruta,
  acciones,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  ruta?: { href: string; texto: string };
  acciones?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        {ruta && (
          <nav aria-label="Ruta" className="flex gap-1.5 text-[13px] text-muted-foreground">
            <Link href={ruta.href} className="hover:text-foreground hover:underline">
              {ruta.texto}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page" className="truncate">
              {titulo}
            </span>
          </nav>
        )}
        <h1 className="m-0 font-serif text-[32px] font-normal leading-[1.1] md:text-[40px]">
          {titulo}
        </h1>
        {subtitulo && <div className="text-sm text-muted-foreground">{subtitulo}</div>}
        {children}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2.5">{acciones}</div>}
    </div>
  );
}

/** Una tarjeta: superficie `card`, borde y radio de 12 px, sin sombra. */
export function Tarjeta({
  titulo,
  accion,
  className,
  children,
  etiqueta,
}: {
  titulo?: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  etiqueta?: string;
}) {
  return (
    <section
      aria-label={etiqueta}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground",
        className,
      )}
    >
      {(titulo || accion) && (
        <div className="flex items-center justify-between gap-3">
          {titulo && <h2 className="m-0 text-[15px] font-semibold">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

/** Una cifra con su etiqueta arriba y su comparación abajo. */
export function Cifra({
  etiqueta,
  valor,
  nota,
  className,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  nota?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 px-[18px] py-4", className)}>
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      <span className="truncate font-mono text-lg font-medium tabular-nums">{valor}</span>
      {nota && <span className="text-xs text-muted-foreground">{nota}</span>}
    </div>
  );
}

/** Lo que llega con la fase 2 (precios y cobros): se dice, no se inventa. */
export function SinConfigurar({ texto = "Sin configurar" }: { texto?: string }) {
  return <span className="font-sans text-sm font-normal text-muted-foreground">{texto}</span>;
}

/** Cifras: JetBrains Mono con números tabulares. */
export function Mono({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap font-mono tabular-nums", className)} title={title}>
      {children}
    </span>
  );
}

const TONO_ESTADO: Record<EstadoCuenta, { fondo: string; punto: string }> = {
  ACTIVO: { fondo: "border-success bg-success/10", punto: "bg-success" },
  MOROSO: { fondo: "border-warning bg-warning/10", punto: "bg-warning" },
  SUSPENDIDO: { fondo: "border-danger bg-danger/10", punto: "bg-danger" },
  CANCELADO: { fondo: "border-border bg-muted", punto: "bg-muted-foreground" },
};

/** El estado en fondo y borde; el texto sigue neutro por contraste. */
export function EstadoCuentaBadge({ estado }: { estado: EstadoCuenta }) {
  const t = TONO_ESTADO[estado];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-medium text-foreground",
        t.fondo,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.punto)} aria-hidden />
      {NOMBRE_ESTADO[estado]}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return <Pastilla>{NOMBRE_PLAN[plan]}</Pastilla>;
}

export function Pastilla({
  children,
  tono = "neutro",
  className,
}: {
  children: React.ReactNode;
  tono?: "neutro" | "exito" | "advertencia" | "peligro" | "info";
  className?: string;
}) {
  const clases = {
    neutro: "border-border bg-background",
    exito: "border-success bg-success/10",
    advertencia: "border-warning bg-warning/10",
    peligro: "border-danger bg-danger/10",
    info: "border-info bg-info/10",
  }[tono];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 self-start whitespace-nowrap rounded-full border px-2 text-xs font-medium text-foreground",
        clases,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Un cupo usado: barra y cifra. Desde el 90 % avisa en ámbar. */
export function BarraCupo({
  usados,
  max,
  etiqueta,
  compacta = false,
}: {
  usados: number;
  max: number;
  etiqueta?: string;
  compacta?: boolean;
}) {
  const parte = max > 0 ? Math.min(1, usados / max) : 0;
  const cerca = max > 1 && usados >= Math.ceil(max * 0.9);
  return (
    <div className={cn("flex flex-col", compacta ? "gap-1" : "gap-1.5")}>
      {(etiqueta || !compacta) && (
        <div className="flex justify-between gap-3 text-[13px]">
          {etiqueta && <span>{etiqueta}</span>}
          <span className="flex items-center gap-2">
            {cerca && <Mono className="text-xs text-muted-foreground">{Math.round(parte * 100)} %</Mono>}
            <Mono>
              {usados} de {max}
            </Mono>
          </span>
        </div>
      )}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={usados}
        aria-label={etiqueta ? `${etiqueta}: ${usados} de ${max}` : `${usados} de ${max}`}
        className={cn("w-full overflow-hidden rounded-full bg-muted", compacta ? "h-1" : "h-1.5")}
      >
        <div
          className={cn("h-full rounded-full", cerca ? "bg-warning" : "bg-foreground/70")}
          style={{ width: `${parte * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Las pestañas: la activa lleva el subrayado naranja, que es lo que señala. */
export function Pestanas<T extends string>({
  valor,
  opciones,
  alCambiar,
  etiqueta,
}: {
  valor: T;
  opciones: { valor: T; texto: string; cuenta?: number }[];
  alCambiar: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className="-mx-4 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-border px-4 md:mx-0 md:px-0"
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              "-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 text-sm",
              activa
                ? "border-brand font-semibold text-foreground"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {o.texto}
            {o.cuenta !== undefined && (
              <Mono className="text-xs text-muted-foreground">{o.cuenta}</Mono>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Filtros en pastillas, con su conteo. */
export function Pastillas<T extends string>({
  valor,
  opciones,
  alCambiar,
  etiqueta,
}: {
  valor: T;
  opciones: { valor: T; texto: string; cuenta?: number }[];
  alCambiar: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors",
              activa
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {o.texto}
            {o.cuenta !== undefined && (
              <Mono className={cn("text-xs", activa ? "opacity-80" : "text-muted-foreground")}>
                {o.cuenta}
              </Mono>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Una pantalla sin datos todavía: una frase y, si hay, el primer paso. */
export function Vacio({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="m-0 font-medium">{titulo}</p>
      {texto && <p className="m-0 max-w-md text-sm text-muted-foreground">{texto}</p>}
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  );
}

/** Qué falló y cómo reintentar. Nunca un error mudo. */
export function ErrorCarga({
  que,
  alReintentar,
}: {
  que: string;
  alReintentar: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-14 text-center"
    >
      <AlertCircle className="size-5 text-danger" aria-hidden />
      <p className="m-0 font-medium">No se pudieron cargar {que}.</p>
      <p className="m-0 text-sm text-muted-foreground">
        Puede ser la conexión o la API. Si vuelve a fallar, revise que el servidor esté arriba.
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={alReintentar}>
        <RotateCw /> Reintentar
      </Button>
    </div>
  );
}

/** Esqueletos con la forma del contenido, no un spinner en el centro. */
export function EsqueletoPagina({ tarjetas = 3 }: { tarjetas?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: tarjetas }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Una tabla con la cabecera del diseño: 12 px, gris, línea abajo. */
export function Th({
  children,
  derecha = false,
  className,
}: {
  children?: React.ReactNode;
  derecha?: boolean;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-border px-3 py-2.5 text-xs font-medium text-muted-foreground",
        derecha ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  derecha = false,
  className,
}: {
  children?: React.ReactNode;
  derecha?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-border px-3 py-2 align-middle text-[13px] group-last/fila:border-b-0",
        derecha && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}
