"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, PieChart, Receipt, Repeat, TrendingDown, TrendingUp } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { funcionActiva } from "@/core/config/funciones";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { FormularioCompra } from "@/modules/compras/components/FormularioCompra";
import { comprasApi } from "@/modules/compras/services/compras.service";
import type { CrearCompraInput } from "@/modules/compras/types/compras.types";
import { PagosProgramados } from "@/modules/pagos/components/PagosProgramados";
import { pagosApi } from "@/modules/pagos/services/pagos.service";
import { RegistrarGastoDialog, type CompraDesdeGasto } from "../components/RegistrarGastoDialog";
import { mesDeHoy, moverMes, nombreMes } from "../lib/mes";
import { gastosApi } from "../services/gastos.service";
import { NOMBRE_ORIGEN, type ResumenGastos } from "../types/gastos.types";

type Seccion = "Del mes" | "Recurrentes";

const SECCIONES: Array<[Seccion, typeof PieChart]> = [
  ["Del mes", PieChart],
  ["Recurrentes", Repeat],
];

/**
 * Egresos → Gastos: en qué se va la plata del mes, por concepto.
 *
 * No tiene documento propio: suma lo que ya se registró por concepto —las
 * líneas de gasto de las compras, los pagos sin factura, el 4×1000—. Con
 * factura se registra en Compras; sin factura, sale por Pagos. «Registrar
 * gasto» lleva a uno u otro con el concepto ya elegido.
 */
export function GastosView() {
  const queryClient = useQueryClient();
  const puedeRegistrar = useTieneRol("CAJA", "DIRECTOR", "COMPRAS", "CONTADOR");
  const puedePagar = useTieneRol("CAJA", "DIRECTOR");
  const [seccion, setSeccion] = useState<Seccion>("Del mes");
  const [mes, setMes] = useState(mesDeHoy());
  const [registrando, setRegistrando] = useState(false);
  const [compra, setCompra] = useState<CompraDesdeGasto | null>(null);
  const [programando, setProgramando] = useState(false);

  const crearCompra = useMutation({
    mutationFn: (datos: CrearCompraInput) => comprasApi.crear(datos),
    onSuccess: async () => {
      await Promise.all([["gastos"], ["compras"], ["pagos"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito("Compra registrada", "El gasto ya suma en su concepto.");
      setCompra(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <div className="w-full">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Egresos
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Gastos<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            En qué se va la plata del mes, por concepto. Con factura se registra en Compras; sin factura, sale por Pagos.
          </p>
        </div>
        {puedeRegistrar &&
          (seccion === "Recurrentes" ? (
            <BotonNuevo etiqueta="Programar un pago" onClick={() => setProgramando(true)} />
          ) : (
            <BotonNuevo etiqueta="Registrar gasto" onClick={() => setRegistrando(true)} />
          ))}
      </header>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          {SECCIONES.map(([nombre, Icono]) => (
            <button
              key={nombre}
              type="button"
              aria-current={seccion === nombre ? "page" : undefined}
              onClick={() => setSeccion(nombre)}
              className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                seccion === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icono className="size-4" />
              {nombre}
            </button>
          ))}
        </nav>
        {seccion === "Del mes" && (
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
            <Button type="button" variant="ghost" className="size-9 rounded-xl p-0" aria-label="Mes anterior" onClick={() => setMes(moverMes(mes, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-40 text-center text-sm font-semibold">{nombreMes(mes)}</span>
            <Button
              type="button"
              variant="ghost"
              className="size-9 rounded-xl p-0"
              aria-label="Mes siguiente"
              disabled={mes >= mesDeHoy()}
              onClick={() => setMes(moverMes(mes, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {seccion === "Del mes" && (
        <DelMes
          mes={mes}
          onVerRecurrentes={() => setSeccion("Recurrentes")}
          onRegistrar={puedeRegistrar ? () => setRegistrando(true) : undefined}
        />
      )}
      {seccion === "Recurrentes" && (
        <PagosProgramados
          puedeProgramar={puedeRegistrar}
          puedePagar={puedePagar}
          nuevo={programando}
          onCerrarNuevo={() => setProgramando(false)}
        />
      )}

      <RegistrarGastoDialog
        abierto={registrando}
        onCerrar={() => setRegistrando(false)}
        onConFactura={(c) => {
          setRegistrando(false);
          setCompra(c);
        }}
      />
      {compra && (
        <FormularioCompra
          abierto
          inicial={compra}
          onCerrar={() => setCompra(null)}
          onGuardar={(datos) => crearCompra.mutate(datos)}
          guardando={crearCompra.isPending}
        />
      )}
    </div>
  );
}

function DelMes({
  mes,
  onVerRecurrentes,
  onRegistrar,
}: {
  mes: string;
  onVerRecurrentes: () => void;
  onRegistrar?: () => void;
}) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["gastos", mes],
    queryFn: () => gastosApi.resumen(mes),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudieron leer los gastos del mes" onReintentar={refetch} />
    ) : (
      <SkeletonTable />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <Total resumen={data} />
      <div className="grid gap-7 lg:grid-cols-[1.6fr_1fr]">
        <PorConcepto resumen={data} />
        <Recurrentes onVerTodos={onVerRecurrentes} />
      </div>
      <Ultimos resumen={data} mes={mes} onRegistrar={onRegistrar} />
    </div>
  );
}

function Total({ resumen }: { resumen: ResumenGastos }) {
  const sube = (resumen.variacion ?? 0) > 0;
  return (
    <section className="flex flex-wrap items-end justify-between gap-5 rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Gastos del mes</p>
        <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">
          {formatCOP(resumen.total)}
        </p>
      </div>
      <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {resumen.registros} {resumen.registros === 1 ? "registro" : "registros"} · {nombreMes(resumen.anterior.mes).split(" ")[0].toLowerCase()}{" "}
        <span className="font-mono">{formatCOP(resumen.anterior.total)}</span>
        {resumen.variacion !== null && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {sube ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {sube ? "+" : ""}
            {resumen.variacion.toLocaleString("es-CO")} %
          </span>
        )}
      </p>
    </section>
  );
}

function PorConcepto({ resumen }: { resumen: ResumenGastos }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Por concepto</h2>
        {funcionActiva("conceptos") && (
          <Link href="/dashboard/conceptos" className="text-sm font-semibold hover:underline">
            Ver conceptos
          </Link>
        )}
      </div>
      {resumen.grupos.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          Este mes no hay gastos registrados por concepto todavía.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {resumen.grupos.map((g) => (
            <li key={g.grupo} className="py-3">
              <button
                type="button"
                aria-expanded={abierto === g.grupo}
                onClick={() => setAbierto(abierto === g.grupo ? null : g.grupo)}
                className="w-full text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{g.grupo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.conceptos.map((c) => c.nombre).join(", ")}
                    </p>
                  </div>
                  <p className="flex shrink-0 items-baseline gap-3">
                    <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(g.total)}</span>
                    <span className="w-14 text-right font-mono text-xs text-muted-foreground">
                      {g.porcentaje.toLocaleString("es-CO")} %
                    </span>
                  </p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-foreground"
                    style={{ width: `${Math.max(0, Math.min(100, g.porcentaje))}%` }}
                  />
                </div>
              </button>
              {abierto === g.grupo && (
                <ul className="mt-3 flex flex-col gap-1.5 pl-3">
                  {g.conceptos.map((c) => (
                    <li key={c.id} className="flex justify-between text-sm">
                      <span>{c.nombre}</span>
                      <span className="font-mono tabular-nums">{formatCOP(c.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Lo que se repite cada mes y está por pagar: sale de los pagos programados. */
function Recurrentes({ onVerTodos }: { onVerTodos: () => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["pagos", "programados", false],
    queryFn: () => pagosApi.programados(false),
  });
  const mensuales = data.filter((p) => p.recurrencia === "MENSUAL").slice(0, 5);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Recurrentes</h2>
      <p className="mb-3 text-xs text-muted-foreground">Los que se repiten cada mes</p>
      {isLoading ? (
        <SkeletonTable />
      ) : mensuales.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Nada programado cada mes todavía.</p>
      ) : (
        <ul className="divide-y divide-border">
          {mensuales.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{p.descripcion}</p>
                <p className="text-xs text-muted-foreground">Programado · {p.fecha}</p>
              </div>
              <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(p.valor)}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onVerTodos} className="mt-3 text-sm font-semibold hover:underline">
        Ver recurrentes →
      </button>
    </section>
  );
}

function Ultimos({ resumen, mes, onRegistrar }: { resumen: ResumenGastos; mes: string; onRegistrar?: () => void }) {
  if (resumen.ultimos.length === 0) {
    return (
      <EmptyState
        titulo={`${nombreMes(mes).split(" ")[0]} sin gastos todavía`}
        descripcion="Lo que registres con factura en Compras o sin factura en Pagos aparece acá, por concepto. Los recurrentes aparecen cuando se pagan."
        icon={Receipt}
        accion={onRegistrar ? { label: "Registrar gasto", onClick: onRegistrar } : undefined}
      />
    );
  }
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <h2 className="px-5 py-4 text-lg font-semibold">Últimos gastos</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/60 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Concepto</th>
              <th className="px-5 py-3">Tercero</th>
              <th className="px-5 py-3">Documento</th>
              <th className="px-5 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {resumen.ultimos.map((u, i) => (
              <tr key={`${u.asientoId}-${i}`} className="border-t border-border">
                <td className="px-5 py-3 whitespace-nowrap">{u.fecha}</td>
                <td className="px-5 py-3 font-medium">{u.concepto}</td>
                <td className="px-5 py-3">{u.tercero ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className="font-mono text-xs">{u.documento}</span>
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
                    {NOMBRE_ORIGEN[u.origen]}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(u.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
