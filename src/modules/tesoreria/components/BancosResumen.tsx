"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Plus } from "lucide-react";

import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP, hoyEnColombia } from "@/lib/utils";
import { fechaCorta } from "@/modules/impuestos/lib/impuestos";
import { cajaBancosApi } from "../services/caja-bancos.service";
import { cuentasBancariasApi } from "../services/bancos.service";
import { cajasApi } from "../services/tesoreria.service";
import { NOMBRE_TIPO_CUENTA_BANCARIA } from "../types/bancos.types";

/** Días sin conciliar a partir de los cuales se marca en amarillo. */
const DIAS_ATRASO = 35;

const iniciales = (banco: string) =>
  banco
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Caja y bancos → Bancos (lienzo «Bancos»): cuánto hay en cada cuenta, su
 * último movimiento, hasta cuándo está conciliada con el extracto y si paga el
 * 4×1000 (E23). Abajo, lo último que se movió en los bancos.
 */
export function BancosResumen({ onVerMovimientos, onAgregar }: { onVerMovimientos: (cuentaId: string) => void; onAgregar: () => void }) {
  const puedeCrear = useTieneRol("CAJA", "DIRECTOR");
  const cuentas = useQuery({ queryKey: ["cuentas-bancarias"], queryFn: () => cuentasBancariasApi.listar(), meta: SILENCIOSO });
  const { data: cajas = [] } = useQuery({ queryKey: ["cajas"], queryFn: () => cajasApi.listar(), meta: SILENCIOSO });
  const ultimos = useQuery({ queryKey: ["tesoreria", "movimientos", "ultimos"], queryFn: () => cajaBancosApi.movimientos(), meta: SILENCIOSO });

  if (cuentas.data === undefined) {
    return cuentas.isError ? (
      <ErrorCarga error={cuentas.error} titulo="No se pudieron leer las cuentas" onReintentar={cuentas.refetch} />
    ) : (
      <SkeletonTable />
    );
  }
  const activas = cuentas.data.filter((c) => c.activa);
  const enBancos = activas.reduce((t, c) => t + Number(c.saldo), 0);
  const enCajas = cajas.filter((c) => c.activa).reduce((t, c) => t + Number(c.saldo), 0);
  const hoy = hoyEnColombia();
  const atrasada = (f: string | null) =>
    f === null || (Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${f}T00:00:00Z`)) / 86_400_000 > DIAS_ATRASO;
  const deBancos = (ultimos.data?.movimientos ?? []).filter((m) => m.medio === "BANCO").slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-3 rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Hay en los bancos</p>
          <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{formatCOP(enBancos)}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {activas.length} {activas.length === 1 ? "cuenta" : "cuentas"} · con la caja son{" "}
          <span className="font-mono font-semibold whitespace-nowrap text-foreground">{formatCOP(enBancos + enCajas)}</span>
        </p>
      </section>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activas.map((c) => (
          <li key={c.id} className="rounded-3xl border border-border bg-card px-5 py-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-xs font-bold">{iniciales(c.banco)}</span>
              <span>
                <span className="block font-semibold">{c.banco}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {NOMBRE_TIPO_CUENTA_BANCARIA[c.tipo_cuenta].split(" ")[0]} ···{c.numero_cuenta.slice(-4)}
                </span>
              </span>
            </div>
            <p className={cn("mt-4 font-mono text-2xl font-semibold whitespace-nowrap tabular-nums", Number(c.saldo) < 0 && "text-danger")}>
              {formatCOP(Number(c.saldo))}
            </p>
            {/* Los tres datos de la cuenta en una franja, como «Abrió el día /
                Hoy entró / Hoy salió» de la caja: se leen como parte de la
                cuenta y no como notas sueltas al margen. */}
            <dl className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-muted/30">
              <Indicador etiqueta="Último movimiento">
                {c.ultimo_movimiento ? fechaCorta(c.ultimo_movimiento) : <span className="text-muted-foreground">Ninguno</span>}
              </Indicador>
              <Indicador etiqueta="Conciliada" tono={atrasada(c.conciliada_hasta) ? "aviso" : "bien"}>
                {c.conciliada_hasta ? `al ${fechaCorta(c.conciliada_hasta)}` : "Nunca"}
              </Indicador>
              <Indicador etiqueta="4×1000">{c.exenta_gmf ? "Exenta" : "Paga"}</Indicador>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => onVerMovimientos(c.id)}>
                Movimientos
              </Button>
              <Button
                variant={atrasada(c.conciliada_hasta) ? "default" : "outline"}
                className="h-10 rounded-xl"
                render={<Link href="/dashboard/control" />}
              >
                {atrasada(c.conciliada_hasta) ? "Conciliar" : "Subir extracto"}
              </Button>
            </div>
          </li>
        ))}
        {puedeCrear && (
          <li>
            <button
              type="button"
              onClick={onAgregar}
              className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border px-5 py-5 text-center hover:bg-accent/50"
            >
              <span className="grid size-10 place-items-center rounded-full bg-muted">
                <Plus className="size-5" />
              </span>
              <span className="font-semibold">Agregar otra cuenta</span>
              <span className="text-xs text-muted-foreground">Ahorros, corriente, Nequi o Daviplata de la empresa, con el saldo de hoy</span>
            </button>
          </li>
        )}
      </ul>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold">Lo último en los bancos</h2>
        {deBancos.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
            <Landmark className="size-4" /> En los últimos 7 días no se movió nada en los bancos.
          </p>
        ) : (
          <ul>
            {deBancos.map((m) => (
              <li key={m.id} className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0">
                <span className="w-24 text-xs text-muted-foreground">
                  {fechaCorta(m.fecha)} · {m.hora}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{m.concepto}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.cuenta}
                    {m.documento ? ` · ${m.documento}` : ""}
                  </span>
                </span>
                <span className={cn("font-mono font-semibold whitespace-nowrap tabular-nums", m.entra > 0 && "text-success")}>
                  {m.entra > 0 ? `+ ${formatCOP(m.entra)}` : `− ${formatCOP(m.sale)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Un dato de la cuenta: la etiqueta arriba, el valor abajo; con tono, un punto de color. */
function Indicador({
  etiqueta,
  tono,
  children,
}: {
  etiqueta: string;
  tono?: "bien" | "aviso";
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-r border-border px-3 py-2.5 last:border-r-0">
      <dt className="truncate text-[11px] text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold">
        {tono && (
          <span
            aria-hidden
            className={cn("size-1.5 shrink-0 rounded-full", tono === "aviso" ? "bg-warning" : "bg-success")}
          />
        )}
        {children}
      </dd>
    </div>
  );
}
