import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { formatCOP } from "@/lib/utils";

/**
 * «Así queda en el libro»: el asiento que haría un documento antes de
 * guardarlo, con la marca «Cuadra» y la fila de Totales. Lo usan la compra, el
 * documento soporte y la factura (pantallas 09, 10 y 13), igual en las tres.
 */
export function AsientoPrevio({
  lineas,
  nota,
}: {
  lineas: Array<{ codigo: string; nombre: string; centro?: string | null; debito: number; credito: number }>;
  /** Lo que va debajo: el costo aparte, en la factura. */
  nota?: ReactNode;
}) {
  const debitos = lineas.reduce((s, l) => s + l.debito, 0);
  const creditos = lineas.reduce((s, l) => s + l.credito, 0);
  const cuadra = Math.abs(debitos - creditos) < 0.005;
  return (
    <section className="rounded-3xl border border-border bg-card p-5 text-sm shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Así queda en el libro</h2>
        {cuadra ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs font-medium">
            <Check className="size-3.5" />
            Cuadra · débitos = créditos
          </span>
        ) : (
          <span className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-0.5 text-xs font-medium">
            No cuadra · diferencia {formatCOP(Math.abs(debitos - creditos))}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1.5 text-left font-medium">Cuenta</th>
              <th className="py-1.5 text-right font-medium">Débito</th>
              <th className="py-1.5 text-right font-medium">Crédito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineas.map((l, i) => (
              <tr key={i}>
                <td className="py-2 pr-2">
                  <span className="font-mono text-muted-foreground">{l.codigo}</span> {l.nombre}
                  {l.centro && <span className="block text-xs text-muted-foreground">Centro: {l.centro}</span>}
                </td>
                <td className="py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {l.debito > 0 ? formatCOP(l.debito) : ""}
                </td>
                <td className="py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {l.credito > 0 ? formatCOP(l.credito) : ""}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Totales</td>
              <td className="py-2 text-right font-mono whitespace-nowrap tabular-nums">{formatCOP(debitos)}</td>
              <td className="py-2 text-right font-mono whitespace-nowrap tabular-nums">{formatCOP(creditos)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {nota && <p className="mt-3 text-xs text-muted-foreground">{nota}</p>}
    </section>
  );
}
