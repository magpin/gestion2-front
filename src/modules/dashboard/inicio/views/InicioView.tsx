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
  Landmark,
  Library,
  Loader2,
  Lock,
  Package,
  Percent,
  Receipt,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { AvisoImpuestosInicio } from "@/modules/impuestos/components/AvisoImpuestosInicio";
import { buttonVariants } from "@/components/ui/button";
import { funcionActiva } from "@/core/config/funciones";
import { useAuthStore } from "@/core/store/authStore";
import { MariaEstaSemana } from "@/modules/asistente/components/MariaEstaSemana";
import { ROLES_MARIA } from "@/modules/asistente/hooks/usePendientes";
import { comprasApi } from "@/modules/compras/services/compras.service";
import { productosApi } from "@/modules/inventario/services/inventario.service";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import { cuentasBancariasApi } from "@/modules/tesoreria/services/bancos.service";
import { cajasApi } from "@/modules/tesoreria/services/tesoreria.service";
import { facturasApi } from "@/modules/ventas/services/ventas.service";
import { useEstadoConfiguracion } from "@/modules/configuracion/hooks/useEstadoConfiguracion";
import type {
  ClavePaso,
  EstadoPaso,
  Paso,
} from "@/modules/configuracion/types/configuracion.types";
import { AlertasMaria, TableroPlata } from "../components/TableroPlata";
import { tableroApi } from "../services/tablero.service";

const ICONO: Record<ClavePaso, LucideIcon> = {
  EMPRESA: Building2,
  SEDES: Building2,
  SITUACION_LEGAL: FileText,
  IMPUESTOS: Percent,
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

/** Quien ve la plata de la empresa: los mismos roles de `GET /tablero/plata`. */
const ROLES_PLATA = ["DIRECTOR", "CONTADOR", "CAJA", "CONSULTA"] as const; // voseo-ok: identificador

export function InicioView() {
  const { data, isError, error, refetch } = useEstadoConfiguracion();
  const roles = useAuthStore((s) => s.roles);
  const veMaria = ROLES_MARIA.some((r) => roles.includes(r));
  // D3: con la configuración completa, Inicio es el tablero de la plata.
  // Mientras falte algo, siguen los pasos.
  const conTablero =
    data !== undefined &&
    data.completados >= data.totalObligatorios &&
    funcionActiva("tableroPlata") &&
    ROLES_PLATA.some((r) => roles.includes(r)); // voseo-ok: identificador
  const tablero = useQuery({
    queryKey: ["tablero", "plata"], // voseo-ok: ruta del API
    queryFn: tableroApi.plata, // voseo-ok: identificador
    enabled: conTablero,
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudo leer el estado de la empresa" onReintentar={refetch} />
    ) : (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (conTablero) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Tablero · {fechaDeHoy()}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Inicio<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuánto dinero hay, cuánto le deben, cuánto debe y cómo va el mes.
          </p>
        </header>

        {funcionActiva("impuestos") && <AvisoImpuestosInicio />}

        {tablero.data === undefined && tablero.isError ? (
          <ErrorCarga
            error={tablero.error}
            titulo="No se pudo leer el dinero de la empresa"
            onReintentar={tablero.refetch}
          />
        ) : (
          <TableroPlata datos={tablero.data} />
        )}

        {veMaria && (
          <MariaEstaSemana>
            <AlertasMaria alertas={tablero.data?.alertas ?? []} />
          </MariaEstaSemana>
        )}

        <Atajos />
      </div>
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

      {veMaria && <MariaEstaSemana />}

      <Atajos />
    </div>
  );
}

/** «Lunes 28 sep». */
function fechaDeHoy(hoy = new Date()): string {
  const dia = hoy.toLocaleDateString("es-CO", { weekday: "long" });
  const mes = hoy.toLocaleDateString("es-CO", { month: "long" }).slice(0, 3);
  return `${dia} ${hoy.getDate()} ${mes}`;
}

/**
 * Los módulos, con una cifra al lado.
 *
 * La barra lateral ya lleva a cada uno; esto no la duplica, la completa: el
 * menú dice adónde se puede ir y estas tarjetas dicen cuánto hay ahí —cuántas
 * facturas, cuántos productos— antes de entrar.
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
  const { data: cajas } = useQuery({
    queryKey: ["cajas", "conteo"],
    queryFn: () => cajasApi.listar(),
    staleTime: 60_000,
  });
  const { data: cuentasBancarias } = useQuery({
    queryKey: ["cuentas-bancarias", "conteo"],
    queryFn: () => cuentasBancariasApi.listar(),
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
        href="/dashboard/caja-bancos"
        icono={Landmark}
        titulo="Caja y bancos"
        detalle={
          cajas === undefined || cuentasBancarias === undefined
            ? "…"
            : `${cajas.length} caja${cajas.length === 1 ? "" : "s"} · ${cuentasBancarias.length} cuenta${cuentasBancarias.length === 1 ? "" : "s"} bancaria${cuentasBancarias.length === 1 ? "" : "s"}`
        }
      />
      <Atajo
        href="/dashboard/referencia"
        icono={Library}
        titulo="PUC"
        detalle="Decreto 2650 · 2 492 cuentas"
      />
      <Atajo
        href="/dashboard/referencia?catalogo=ciiu"
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
