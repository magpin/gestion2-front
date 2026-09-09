"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  CircleDashed,
  FileText,
  Library,
  Loader2,
  Lock,
  Package,
  Receipt,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { buttonVariants } from "@/components/ui/button";
import { comprasApi } from "@/modules/compras/services/compras.service";
import { productosApi } from "@/modules/inventario/services/inventario.service";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import { facturasApi } from "@/modules/ventas/services/ventas.service";
import { useEstadoConfiguracion } from "@/modules/configuracion/hooks/useEstadoConfiguracion";
import type {
  ClavePaso,
  EstadoPaso,
  Paso,
} from "@/modules/configuracion/types/configuracion.types";

const ICONO: Record<ClavePaso, LucideIcon> = {
  EMPRESA: Building2,
  SEDES: Building2,
  SITUACION_LEGAL: FileText,
  PLAN_CUENTAS: BookOpen,
  RESOLUCIONES: Receipt,
};

/**
 * El color va en el icono y el punto, nunca en el texto pequeño.
 *
 * `warning` (#B26A00) da 4.2:1 sobre blanco y el reglamento exige 4.5:1 para
 * texto normal. Como elemento gráfico el umbral es 3:1 y pasa de sobra.
 */
const TONO: Record<
  EstadoPaso,
  { icono: string; punto: string; etiqueta: string }
> = {
  LISTO: { icono: "text-success", punto: "bg-success", etiqueta: "Listo" },
  FALTA: {
    icono: "text-warning",
    punto: "bg-warning",
    etiqueta: "Faltan datos",
  },
  PENDIENTE: {
    icono: "text-muted-foreground",
    punto: "bg-muted-foreground",
    etiqueta: "Pendiente",
  },
  BLOQUEADO: {
    icono: "text-muted-foreground",
    punto: "bg-muted-foreground",
    etiqueta: "Bloqueado",
  },
};

export function InicioView() {
  const { data, isLoading, isError } = useEstadoConfiguracion();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        No se pudo leer el estado de la empresa.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Configuración
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {data.completados} de {data.totalObligatorios} ·{" "}
            {/* `brand-text` (#C0421A) y no `brand`: el naranja de relleno no
                alcanza contraste de lectura sobre fondo claro. */}
            <span className="font-semibold text-brand-text">
              {data.porcentaje}%
            </span>
          </p>
        </div>
        {data.siguiente && (
          <Link
            href={`/configuracion/${data.siguiente.toLowerCase()}`}
            className={buttonVariants()}
          >
            Continuar
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>

      {/* Barra indicadora en acento, que es uno de los usos que el reglamento le
          da: forma pequeña que dirige la atención. Estaba en `success`, y el
          verde ahí significaba "va bien" cuando lo que muestra es cuánto falta. */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${data.porcentaje}%` }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {data.pasos.map((paso) => (
          <FilaPaso key={paso.clave} paso={paso} />
        ))}
      </div>

      <Atajos />
    </div>
  );
}

/**
 * Las puertas que hoy existen de verdad.
 *
 * No es un menú lateral a propósito: el armazón dice que la navegación por
 * procesos vuelve cuando existan ventas, compras e inventario, y seis puertas
 * cerradas son peores que ninguna. Inventario, Ventas y Compras ya se
 * sumaron a las que estaban abiertas.
 */
function Atajos() {
  const { data: cuentas } = useQuery({
    queryKey: ["plan-cuentas", "conteo"],
    queryFn: () => planCuentasApi.listar(),
    staleTime: 60_000,
  });
  const { data: productos } = useQuery({
    queryKey: ["productos", "conteo"],
    queryFn: () => productosApi.listar(),
    staleTime: 60_000,
  });
  const { data: facturas } = useQuery({
    queryKey: ["facturas", "conteo"],
    queryFn: () => facturasApi.listar(),
    staleTime: 60_000,
  });
  const { data: compras } = useQuery({
    queryKey: ["compras", "conteo"],
    queryFn: () => comprasApi.listar(),
    staleTime: 60_000,
  });

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Atajo
        href="/dashboard/plan-cuentas"
        icono={BookOpen}
        titulo="Plan de cuentas"
        detalle={
          cuentas === undefined
            ? "…"
            : `${cuentas.length} cuenta${cuentas.length === 1 ? "" : "s"} activa${cuentas.length === 1 ? "" : "s"}`
        }
      />
      <Atajo
        href="/dashboard/inventario"
        icono={Package}
        titulo="Inventario"
        detalle={
          productos === undefined
            ? "…"
            : `${productos.total} producto${productos.total === 1 ? "" : "s"}`
        }
      />
      <Atajo
        href="/dashboard/ventas"
        icono={ReceiptText}
        titulo="Ventas"
        detalle={
          facturas === undefined
            ? "…"
            : `${facturas.total} factura${facturas.total === 1 ? "" : "s"}`
        }
      />
      <Atajo
        href="/dashboard/compras"
        icono={ShoppingCart}
        titulo="Compras"
        detalle={
          compras === undefined
            ? "…"
            : `${compras.total} factura${compras.total === 1 ? "" : "s"}`
        }
      />
      <Atajo
        href="/dashboard/catalogos/puc"
        icono={Library}
        titulo="PUC"
        detalle="Decreto 2650 · 2 492 cuentas"
      />
      <Atajo
        href="/dashboard/catalogos/ciiu"
        icono={Briefcase}
        titulo="Actividades CIIU"
        detalle="Rev. 4 A.C. · 504 clases"
      />
    </section>
  );
}

function Atajo({
  href,
  icono: Icono,
  titulo,
  detalle,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icono className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {detalle}
        </span>
      </span>
      <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function FilaPaso({ paso }: { paso: Paso }) {
  const Icono = paso.estado === "BLOQUEADO" ? Lock : ICONO[paso.clave];
  const tono = TONO[paso.estado];
  const bloqueado = paso.estado === "BLOQUEADO";

  const contenido = (
    <>
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-md bg-muted ${tono.icono}`}
      >
        {paso.estado === "LISTO" ? (
          <Check className="size-4" strokeWidth={3} />
        ) : paso.estado === "FALTA" ? (
          <AlertTriangle className="size-4" />
        ) : paso.estado === "PENDIENTE" ? (
          <CircleDashed className="size-4" />
        ) : (
          <Icono className="size-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{paso.nombre}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {paso.faltantes.length > 0
            ? paso.faltantes.map((f) => f.etiqueta).join(" · ")
            : paso.resumen}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold">
          <span className={`size-1.5 rounded-full ${tono.punto}`} />
          {tono.etiqueta}
        </span>
        {!bloqueado && (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </span>
    </>
  );

  const clases =
    "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0";

  if (bloqueado) {
    return <div className={`${clases} opacity-60`}>{contenido}</div>;
  }

  return (
    <Link
      href={`/configuracion/${paso.clave.toLowerCase()}`}
      className={`${clases} transition-colors hover:bg-accent`}
    >
      {contenido}
    </Link>
  );
}
