"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, ClipboardCheck, TriangleAlert, Wallet } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP } from "@/lib/utils";
import { Maria } from "@/modules/asistente/components/Maria";
import { fechaCorta } from "@/modules/impuestos/lib/impuestos";
import { useCajaPrincipal } from "./CajaPrincipal";
import { MovimientoConceptoDialog } from "./MovimientoConceptoDialog";
import { TrasladoDialog } from "./Traslados";
import { cajaBancosApi } from "../services/caja-bancos.service";
import { cajasApi } from "../services/tesoreria.service";
import type { DiaDeCaja } from "../types/caja-bancos.types";

/** Desde cuánto efectivo María sugiere llevar una parte al banco (lienzo 33). */
const SALDO_ALTO = 1_500_000;

/**
 * Caja y bancos → Caja (lienzo «Caja»): la caja principal por defecto, con un
 * selector para la menor y las de otras sedes (PC7); lo que hay, con qué abrió
 * el día, lo que entró y salió, el último arqueo y lo que pasó hoy.
 */
export function CajaHoy({ onVerMovimientos, onAgregar }: { onVerMovimientos: () => void; onAgregar?: () => void }) {
  const { caja: principal, cargando } = useCajaPrincipal();
  const { data: cajas = [] } = useQuery({ queryKey: ["cajas"], queryFn: () => cajasApi.listar(), meta: SILENCIOSO });
  const activas = cajas.filter((c) => c.activa);
  const [elegida, setElegida] = useState<string | null>(null);
  const cajaId = elegida ?? principal?.id ?? activas[0]?.id ?? null;
  const dia = useQuery({
    queryKey: ["cajas", "dia", cajaId],
    queryFn: () => cajaBancosApi.dia(cajaId!),
    enabled: cajaId !== null,
    meta: SILENCIOSO,
  });

  if (cargando) return <SkeletonTable />;
  if (cajaId === null) {
    return (
      <EmptyState
        titulo="Todavía no hay cajas ni cuentas"
        descripcion="Agregá la caja de la oficina y tus cuentas de banco con el saldo que tienen hoy."
        icon={Wallet}
        accion={onAgregar ? { label: "Agregar caja o cuenta", onClick: onAgregar } : undefined}
        accionSecundaria={{ label: "Subir extracto", href: "/dashboard/control" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {activas.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Caja">
          {activas.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === cajaId}
              onClick={() => setElegida(c.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                c.id === cajaId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
              )}
            >
              {c.nombre}
              {c.id === principal?.id && " · principal"}
            </button>
          ))}
        </div>
      )}
      {dia.data === undefined ? (
        dia.isError ? (
          <ErrorCarga error={dia.error} titulo="No se pudo leer la caja" onReintentar={dia.refetch} />
        ) : (
          <SkeletonTable />
        )
      ) : (
        <Contenido d={dia.data} onVerMovimientos={onVerMovimientos} />
      )}
    </div>
  );
}

function Contenido({ d, onVerMovimientos }: { d: DiaDeCaja; onVerMovimientos: () => void }) {
  const puedeMover = useTieneRol("CAJA", "DIRECTOR");
  const [dialogo, setDialogo] = useState<"ENTRADA" | "SALIDA" | "TRASLADO" | null>(null);
  const a = d.ultimoArqueo;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
      <section className="rounded-3xl border border-border bg-card px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{d.caja.nombre}</h2>
            <p className="text-xs text-muted-foreground">
              Efectivo{d.caja.tipo === "MENOR" ? " · caja menor" : ""}
              {d.caja.sede ? ` · ${d.caja.sede}` : ""}
              {d.caja.responsable ? ` · la maneja ${d.caja.responsable}` : ""}
            </p>
          </div>
          {a === null ? (
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">Nunca se ha contado</span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                a.resultado === "CUADRO" ? "border-success/30 bg-success/15" : "border-warning/30 bg-warning/15",
              )}
            >
              {a.resultado === "CUADRO" ? <Check className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              Contada el {fechaCorta(a.fecha).toLowerCase()} ·{" "}
              {a.resultado === "CUADRO"
                ? "cuadró"
                : `${a.resultado === "SOBRANTE" ? "sobraron" : "faltaron"} ${formatCOP(Math.abs(a.diferencia))}`}
            </span>
          )}
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Hay en la caja</p>
        <p className="font-mono text-5xl font-semibold tracking-[-0.04em] whitespace-nowrap tabular-nums">{formatCOP(d.saldo)}</p>
        <ul className="mt-5 grid overflow-hidden rounded-2xl border border-border sm:grid-cols-3">
          <li className="border-b border-border px-4 py-3 sm:border-r sm:border-b-0">
            <p className="text-xs text-muted-foreground">Abrió el día con</p>
            <p className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(d.abrioCon)}</p>
          </li>
          <li className="border-b border-border px-4 py-3 sm:border-r sm:border-b-0">
            <p className="text-xs text-muted-foreground">Hoy entró</p>
            <p className="font-mono font-semibold whitespace-nowrap text-success tabular-nums">+ {formatCOP(d.entro)}</p>
          </li>
          <li className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Hoy salió</p>
            <p className="font-mono font-semibold whitespace-nowrap tabular-nums">− {formatCOP(d.salio)}</p>
          </li>
        </ul>
        {puedeMover && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Accion icono={ArrowDownLeft} principal onClick={() => setDialogo("ENTRADA")}>
              Entró plata
            </Accion>
            <Accion icono={ArrowUpRight} onClick={() => setDialogo("SALIDA")}>
              Salió plata
            </Accion>
            <Button variant="outline" className="h-auto flex-col gap-1.5 rounded-2xl py-4" render={<Link href="/dashboard/control" />}>
              <ClipboardCheck className="size-5" />
              Contar la caja
            </Button>
            <Accion icono={ArrowLeftRight} onClick={() => setDialogo("TRASLADO")}>
              Llevar al banco
            </Accion>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Hoy en la caja</h2>
          <button type="button" onClick={onVerMovimientos} className="text-sm font-medium underline underline-offset-4">
            Ver todos los movimientos
          </button>
        </div>
        <ul>
          {d.movimientos.map((m) => (
            <li key={m.id} className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0">
              <span className="w-12 font-mono text-xs text-muted-foreground">{m.hora}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.concepto}</span>
                {(m.tercero || m.documento) && (
                  <span className="text-xs text-muted-foreground">
                    {m.tercero}
                    {m.tercero && m.documento && " · "}
                    {m.documento && <span className="font-mono">{m.documento}</span>}
                  </span>
                )}
              </span>
              <span className={cn("font-mono font-semibold whitespace-nowrap tabular-nums", m.entra > 0 && "text-success")}>
                {m.entra > 0 ? `+ ${formatCOP(m.entra)}` : `− ${formatCOP(m.sale)}`}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-4 bg-muted/40 px-5 py-3">
            <span className="w-12" />
            <span className="flex-1 font-medium">Abrió el día</span>
            <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(d.abrioCon)}</span>
          </li>
        </ul>
      </section>
      </div>

      <aside className="w-full lg:w-80 lg:shrink-0">
        <section className="rounded-3xl border border-border bg-card px-5 py-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <Maria estado="reposo" tamano={28} />
            <div>
              <p className="text-sm font-semibold">María</p>
              <p className="text-xs text-muted-foreground">Ve lo mismo que vos</p>
            </div>
          </div>
          {d.saldo > SALDO_ALTO && (
            <p className="mb-2 text-sm">
              Hay más de <span className="font-mono font-semibold">{formatCOP(SALDO_ALTO)}</span> en efectivo. Si no los vas a
              usar esta semana, llevá una parte al banco.
            </p>
          )}
          <p className="text-sm text-muted-foreground">Contá la caja al cerrar el día.</p>
        </section>
      </aside>

      <MovimientoConceptoDialog
        abierto={dialogo === "ENTRADA" || dialogo === "SALIDA"}
        direccion={dialogo === "SALIDA" ? "SALIDA" : "ENTRADA"}
        onCerrar={() => setDialogo(null)}
      />
      <TrasladoDialog abierto={dialogo === "TRASLADO"} onCerrar={() => setDialogo(null)} desdeCaja={d.caja.id} />
    </div>
  );
}

function Accion({
  icono: Icono,
  principal = false,
  onClick,
  children,
}: {
  icono: typeof Wallet;
  principal?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" variant={principal ? "default" : "outline"} className="h-auto flex-col gap-1.5 rounded-2xl py-4" onClick={onClick}>
      <Icono className="size-5" />
      {children}
    </Button>
  );
}
