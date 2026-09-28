"use client";

import { useQuery } from "@tanstack/react-query";

import { formatCOP } from "@/lib/utils";
import { cuentasBancariasApi } from "../services/bancos.service";
import { cajasApi } from "../services/tesoreria.service";
import { NOMBRE_TIPO_CAJA } from "../types/tesoreria.types";

/**
 * Cuánta plata hay: el total de cajas y bancos, y debajo cada una con lo suyo.
 *
 * Suma en el cliente porque las dos listas vienen completas —una empresa tiene
 * pocas cajas y pocas cuentas—; el saldo de cada una lo calcula la API sobre
 * su último movimiento, que es la única fuente de esa verdad.
 */
export function SaldosTesoreria() {
  const { data: cajas } = useQuery({
    queryKey: ["cajas"],
    queryFn: () => cajasApi.listar(),
  });
  const { data: cuentas } = useQuery({
    queryKey: ["cuentas-bancarias"],
    queryFn: () => cuentasBancariasApi.listar(),
  });

  const renglones = [
    ...(cajas ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      detalle: NOMBRE_TIPO_CAJA[c.tipo],
      saldo: Number(c.saldo),
    })),
    ...(cuentas ?? []).map((c) => ({
      id: c.id,
      nombre: c.banco,
      detalle: c.numero_cuenta,
      saldo: Number(c.saldo),
    })),
  ];

  if (renglones.length === 0) return null;

  const total = renglones.reduce((t, r) => t + r.saldo, 0);
  const nCajas = cajas?.length ?? 0;
  const nCuentas = cuentas?.length ?? 0;

  return (
    <section className="mb-7 rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-5 px-6 py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Saldo total
          </p>
          {/* En rojo cuando está en negativo: el banco admite sobregiro, y un
              saldo negativo tiene que verse como lo que es. */}
          <p
            className={`font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums ${
              total < 0 ? "text-danger" : ""
            }`}
          >
            {formatCOP(total)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {nCajas} {nCajas === 1 ? "caja" : "cajas"} · {nCuentas}{" "}
          {nCuentas === 1 ? "cuenta bancaria" : "cuentas bancarias"}
        </p>
      </div>

      {/* Cada caja o cuenta con lo suyo. Con una sola, el desglose repetiría
          el total y no se muestra. */}
      {renglones.length > 1 && (
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {renglones.map((r) => (
            <div key={r.id} className="bg-card px-6 py-4">
              <p className="truncate text-sm font-semibold">{r.nombre}</p>
              <p className="text-xs text-muted-foreground">{r.detalle}</p>
              <p
                className={`mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums ${
                  r.saldo < 0 ? "text-danger" : ""
                }`}
              >
                {formatCOP(r.saldo)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
