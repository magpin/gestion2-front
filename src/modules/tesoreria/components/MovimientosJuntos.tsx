"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Input } from "@/components/ui/input";
import { cn, formatCOP, hoyEnColombia } from "@/lib/utils";
import { fechaCorta } from "@/modules/impuestos/lib/impuestos";
import { cajaBancosApi } from "../services/caja-bancos.service";

const menosDias = (f: string, n: number) => new Date(Date.parse(`${f}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

/**
 * Caja y bancos → Movimientos (lienzo «Movimientos»): la caja y los bancos
 * juntos, cada movimiento con el saldo de su cuenta después de él, por día, y
 * lo que entró y salió en las fechas elegidas.
 */
export function MovimientosJuntos({ cuentaInicial }: { cuentaInicial?: string | null }) {
  const hoy = hoyEnColombia();
  const [desde, setDesde] = useState(menosDias(hoy, 6));
  const [hasta, setHasta] = useState(hoy);
  const [cuenta, setCuenta] = useState<string | null>(cuentaInicial ?? null);
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["tesoreria", "movimientos", desde, hasta],
    queryFn: () => cajaBancosApi.movimientos(desde, hasta),
    enabled: desde !== "" && hasta !== "" && desde <= hasta,
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudieron leer los movimientos" onReintentar={refetch} /> : <SkeletonTable />;
  }
  const cuentas = [...new Map(data.movimientos.map((m) => [m.cuentaId, m.cuenta])).entries()];
  const visibles = cuenta === null ? data.movimientos : data.movimientos.filter((m) => m.cuentaId === cuenta);
  const entro = visibles.reduce((t, m) => t + m.entra, 0);
  const salio = visibles.reduce((t, m) => t + m.sale, 0);
  const porDia = [...new Map(visibles.map((m) => [m.fecha, visibles.filter((x) => x.fecha === m.fecha)])).entries()];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm" role="group" aria-label="Cuenta">
          {[[null, "Todas"] as const, ...cuentas].map(([id, nombre]) => (
            <button
              key={id ?? "todas"}
              type="button"
              aria-pressed={cuenta === id}
              onClick={() => setCuenta(id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                cuenta === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {nombre}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Desde
          <Input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="h-9 w-40 rounded-xl" />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Hasta
          <Input type="date" value={hasta} min={desde} max={hoy} onChange={(e) => setHasta(e.target.value)} className="h-9 w-40 rounded-xl" />
        </label>
        <p className="ml-auto text-sm text-muted-foreground">
          Entró <span className="font-mono font-semibold whitespace-nowrap text-success">+ {formatCOP(entro)}</span> · Salió{" "}
          <span className="font-mono font-semibold whitespace-nowrap text-foreground">− {formatCOP(salio)}</span>
        </p>
      </div>

      {visibles.length === 0 ? (
        <EmptyState titulo="Nada se movió en esas fechas" descripcion="Cambiá las fechas o la cuenta para ver otros movimientos." icon={History} />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3">Hora</th>
                <th className="px-3 py-3">Dónde</th>
                <th className="px-3 py-3">Detalle</th>
                <th className="px-3 py-3">Documento</th>
                <th className="px-3 py-3 text-right">Entra</th>
                <th className="px-3 py-3 text-right">Sale</th>
                <th className="px-5 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {porDia.map(([fecha, movs]) => (
                <Fragment key={fecha}>
                  <tr className="bg-muted/50">
                    <th colSpan={7} scope="rowgroup" className="px-5 py-2 text-left text-xs font-semibold">
                      {fecha === hoy ? `Hoy · ${fechaCorta(fecha).toLowerCase()}` : fechaCorta(fecha)}
                    </th>
                  </tr>
                  {movs.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{m.hora}</td>
                      <td className="px-3 py-2.5">{m.cuenta}</td>
                      <td className="px-3 py-2.5">{m.concepto}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{m.documento ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-success tabular-nums">{m.entra > 0 ? formatCOP(m.entra) : ""}</td>
                      <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap tabular-nums">{m.sale > 0 ? formatCOP(m.sale) : ""}</td>
                      <td className={cn("px-5 py-2.5 text-right font-mono font-semibold whitespace-nowrap tabular-nums", m.saldo < 0 && "text-danger")}>
                        {formatCOP(m.saldo)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">El saldo es el de cada cuenta después del movimiento, como lo lleva su libro. Los traslados salen en las dos cuentas.</p>
    </div>
  );
}
