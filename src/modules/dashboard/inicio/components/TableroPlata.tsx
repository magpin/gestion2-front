"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";

import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { funcionActiva } from "@/core/config/funciones";
import { cn, formatCOP } from "@/lib/utils";
import { nombreMes } from "@/modules/gastos/lib/mes";
import type { Alerta, Tablero } from "../types/tablero.types";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «jue 1 oct». */
function diaCorto(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  return `${DIAS[d.getUTCDay()].toLowerCase()} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/**
 * Inicio → tablero de la plata (lienzo «Inicio · tablero de la plata»):
 * cuánta plata hay, quién le debe a la empresa, a quién le debe ella, qué
 * entra y sale en la semana y cómo va el mes. Va encima de «María esta
 * semana» y los atajos, y solo cuando la configuración está completa (D3).
 */
export function TableroPlata({ datos }: { datos: Tablero | undefined }) {
  if (datos === undefined) return <SkeletonCard />;

  return (
    <div className="flex flex-col gap-6">
      <PlataHoy datos={datos} />

      {/* En el móvil (pantalla 66), las dos cuentas lado a lado y en corto: el
          detalle está a un toque, en Cobros y en Pagos. */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <TarjetaCorta
          etiqueta="Le deben"
          valor={datos.teDeben.total}
          vencido={datos.teDeben.vencido}
          href={funcionActiva("cobros") ? "/dashboard/cobros" : "/dashboard/ventas"}
        />
        <TarjetaCorta
          etiqueta="Debe"
          valor={datos.debes.total}
          vencido={datos.debes.vencido}
          href={funcionActiva("pagos") ? "/dashboard/pagos" : "/dashboard/compras"}
        />
      </div>

      <div className="hidden gap-6 md:grid md:grid-cols-2">
        <TarjetaCuenta
          etiqueta="Le deben"
          valor={datos.teDeben.total}
          resumen={`${datos.teDeben.facturas} ${datos.teDeben.facturas === 1 ? "factura" : "facturas"} · ${datos.teDeben.clientes} ${datos.teDeben.clientes === 1 ? "cliente" : "clientes"}`}
          vencido={datos.teDeben.vencido}
          vacio="Nadie le debe nada vencido."
          filas={datos.teDeben.masVencidos.map((c) => ({
            id: c.terceroId,
            titulo: c.nombre,
            detalle: `${c.facturas} ${c.facturas === 1 ? "factura" : "facturas"} · la más vieja vencida hace ${c.dias} ${c.dias === 1 ? "día" : "días"}`,
            valor: c.vencido,
          }))}
          enlace={funcionActiva("cobros") ? { href: "/dashboard/cobros", texto: "Ir a Cobros" } : { href: "/dashboard/ventas", texto: "Ir a Ventas" }}
        />
        <TarjetaCuenta
          etiqueta="Debe"
          valor={datos.debes.total}
          resumen={`${datos.debes.facturas} ${datos.debes.facturas === 1 ? "factura" : "facturas"} · ${datos.debes.proveedores} ${datos.debes.proveedores === 1 ? "proveedor" : "proveedores"}`}
          vencido={datos.debes.vencido}
          vacio="No le debe a ningún proveedor."
          filas={datos.debes.proximos.map((f) => ({
            id: f.compraId,
            titulo: f.proveedor,
            detalle: `${f.vencida ? "Venció" : "Vence"} el ${diaCorto(f.vence)}${
              f.descuentoPct !== null && f.descuentoHasta !== null && f.descuentoHasta >= datos.hoy
                ? ` · ${f.descuentoPct.toLocaleString("es-CO")} % si paga hasta el ${diaCorto(f.descuentoHasta)}`
                : ""
            }`,
            valor: f.valor,
          }))}
          enlace={funcionActiva("pagos") ? { href: "/dashboard/pagos", texto: "Ir a Pagos" } : { href: "/dashboard/compras", texto: "Ir a Compras" }}
        />
      </div>

      <div className={cn("grid gap-6", datos.resultadoMes !== null && "lg:grid-cols-[2fr_1fr]")}>
        {/* En el móvil (lienzo 66) no va: el dinero y lo que se debe caben primero. */}
        <div className="max-md:hidden">
          <Semana datos={datos} />
        </div>
        {datos.resultadoMes !== null && <ResultadoMes resultado={datos.resultadoMes} />}
      </div>
    </div>
  );
}

function PlataHoy({ datos }: { datos: Tablero }) {
  const { total, lugares } = datos.plataHoy;
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-5 sm:px-6">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Dinero hoy · caja + bancos</h2>
          <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{formatCOP(total)}</p>
        </div>
        <span className="hidden sm:inline">
          <Enlace href="/dashboard/caja-bancos">Ver caja y bancos</Enlace>
        </span>
      </div>
      {lugares.length > 0 && (
        <ul className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {lugares.map((l) => (
            // En el móvil, una fila por lugar: nombre a la izquierda, saldo a la derecha.
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:block sm:border-r sm:px-6 sm:py-4 sm:last:border-b"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{l.nombre}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">{l.medio === "CAJA" ? "Efectivo" : "Banco"}</p>
              </div>
              <p className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums sm:mt-1 sm:text-lg">{formatCOP(l.saldo)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** «Le deben» o «Debe» en corto, para el móvil: el total y lo vencido. */
function TarjetaCorta({
  etiqueta,
  valor,
  vencido,
  href,
}: {
  etiqueta: string;
  valor: number;
  vencido: number;
  href: string;
}) {
  return (
    <Link href={href} className="flex flex-col gap-2 rounded-3xl border border-border bg-card px-4 py-4 shadow-sm">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{etiqueta}</h2>
      <p className="font-mono text-lg font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums">{formatCOP(valor)}</p>
      {vencido > 0 && (
        <span className="w-fit rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 font-mono text-[11px] font-medium whitespace-nowrap">
          {formatCOP(vencido)} vencido
        </span>
      )}
    </Link>
  );
}

function TarjetaCuenta({
  etiqueta,
  valor,
  resumen,
  vencido,
  vacio,
  filas,
  enlace,
}: {
  etiqueta: string;
  valor: number;
  resumen: string;
  vencido: number;
  vacio: string;
  filas: Array<{ id: string; titulo: string; detalle: string; valor: number }>;
  enlace: { href: string; texto: string };
}) {
  return (
    <section className="flex flex-col rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{etiqueta}</h2>
          <p className="font-mono text-2xl font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums">{formatCOP(valor)}</p>
        </div>
        <span className="text-xs text-muted-foreground">{resumen}</span>
      </div>
      {vencido > 0 && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/15 px-3.5 py-2.5 text-[13px]">
          <TriangleAlert className="size-4 shrink-0 text-warning" />
          <strong className="font-semibold">Vencido</strong>
          <span className="ml-auto font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(vencido)}</span>
        </div>
      )}
      {filas.length === 0 ? (
        <p className="py-5 text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="mt-2">
          {filas.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 border-b border-border py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.titulo}</p>
                <p className="text-xs text-muted-foreground">{f.detalle}</p>
              </div>
              <span className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums">{formatCOP(f.valor)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-4">
        <Enlace href={enlace.href}>{enlace.texto}</Enlace>
      </div>
    </section>
  );
}

function Semana({ datos }: { datos: Tablero }) {
  const entra = datos.semana.reduce((t, d) => t + d.entra, 0);
  const sale = datos.semana.reduce((t, d) => t + d.sale, 0);
  const neto = entra - sale;
  const maximo = Math.max(1, ...datos.semana.flatMap((d) => [d.entra, d.sale]));
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Esta semana entra y sale</h2>
          <p className="text-xs text-muted-foreground">
            Lo que vence en los próximos siete días y los pagos programados. Lo ya vencido está arriba.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Neto</p>
          <p className="font-mono text-lg font-semibold whitespace-nowrap tabular-nums">
            {neto >= 0 ? "+ " : "− "}
            {formatCOP(Math.abs(neto))}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-brand" />
          Entra <span className="font-mono font-semibold whitespace-nowrap text-foreground">{formatCOP(entra)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-foreground/70" />
          Sale <span className="font-mono font-semibold whitespace-nowrap text-foreground">{formatCOP(sale)}</span>
        </span>
      </div>
      <div
        role="img"
        aria-label={`Por día: ${datos.semana.map((d) => `${diaCorto(d.dia)}: entra ${formatCOP(d.entra)}, sale ${formatCOP(d.sale)}`).join("; ")}`}
      >
        <div className="grid h-40 grid-cols-7 items-end border-b border-border">
          {datos.semana.map((d) => (
            <div key={d.dia} className="flex h-full items-end justify-center gap-1">
              <Barra valor={d.entra} maximo={maximo} clase="bg-brand" />
              <Barra valor={d.sale} maximo={maximo} clase="bg-foreground/70" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 pt-2 text-center text-xs text-muted-foreground">
          {datos.semana.map((d) => {
            const [dia, numero] = diaCorto(d.dia).split(" ");
            return (
              <span key={d.dia} className={cn(d.dia === datos.hoy && "font-semibold text-foreground")}>
                {d.dia === datos.hoy ? "Hoy" : `${dia.charAt(0).toUpperCase()}${dia.slice(1)}`} · {numero}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Barra({ valor, maximo, clase }: { valor: number; maximo: number; clase: string }) {
  return valor > 0 ? (
    <span className={cn("w-3 rounded-t sm:w-4", clase)} style={{ height: `${Math.max(2, (valor / maximo) * 100)}%` }} />
  ) : (
    <span className="h-0.5 w-3 bg-muted-foreground/30 sm:w-4" />
  );
}

function ResultadoMes({ resultado }: { resultado: NonNullable<Tablero["resultadoMes"]> }) {
  const sube = (resultado.variacion ?? 0) >= 0;
  return (
    <section className="flex flex-col rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
      <h2 className="text-base font-semibold">Resultado del mes</h2>
      <p className="text-xs text-muted-foreground">{nombreMes(resultado.mes)}, hasta hoy</p>
      <div className="mt-4 flex flex-col gap-2.5 text-sm">
        <Linea etiqueta="Ingresos" valor={formatCOP(resultado.ingresos)} />
        <Linea etiqueta="Costos y gastos" valor={`− ${formatCOP(resultado.costosYGastos)}`} />
      </div>
      <div className="mt-3.5 border-t border-border pt-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Utilidad</p>
        <p className="font-mono text-2xl font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums">{formatCOP(resultado.utilidad)}</p>
        {resultado.variacion !== null && resultado.mesAnterior !== null && (
          <span
            className={cn(
              "mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              sube ? "border-success/30 bg-success/15" : "border-warning/30 bg-warning/15",
            )}
          >
            {sube ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {resultado.variacion > 0 ? "+" : ""}
            {resultado.variacion.toLocaleString("es-CO")} % frente a {nombreMes(resultado.mesAnterior).split(" ")[0].toLowerCase()}
          </span>
        )}
      </div>
      {funcionActiva("estadosFinancieros") && (
        <div className="mt-auto pt-4">
          <Enlace href="/dashboard/estados-financieros">Ver estado de resultados</Enlace>
        </div>
      )}
    </section>
  );
}

/**
 * Lo que María ve en la plata. Solo ofrece lo que existe (C4): abrir el chat
 * con la pregunta escrita —la persona la manda si quiere— o ir a la pantalla
 * donde se resuelve.
 */
export function AlertasMaria({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2.5 border-t border-border pt-3">
      {alertas.map((a) => (
        <li
          key={a.clave}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px]"
        >
          <p>
            {a.partes.map((p, i) =>
              typeof p === "number" ? (
                <span key={i} className="font-mono font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(p)}
                </span>
              ) : (
                <span key={i}>{p}</span>
              ),
            )}
          </p>
          {a.accion.tipo === "MARIA" ? (
            <BotonAlerta href={`/dashboard/asistente?pregunta=${encodeURIComponent(a.accion.pregunta)}`}>
              Preguntarle a María
            </BotonAlerta>
          ) : (
            <BotonAlerta href={a.accion.href}>{a.accion.etiqueta}</BotonAlerta>
          )}
        </li>
      ))}
    </ul>
  );
}

function BotonAlerta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="w-full shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-center text-xs font-semibold transition-colors hover:bg-accent sm:w-auto sm:py-1.5"
    >
      {children}
    </Link>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-mono font-medium whitespace-nowrap tabular-nums">{valor}</span>
    </div>
  );
}

function Enlace({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline">
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}
