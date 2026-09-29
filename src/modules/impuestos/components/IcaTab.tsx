"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP } from "@/lib/utils";
import { CLASES_TONO, estadoEnPalabras, fechaCorta, moverPeriodo, periodoEnPalabras } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import { TarjetaDeclaracion } from "./TarjetaDeclaracion";
import type { FilaCalendario, IcaDeMunicipio, IcaPantalla, ReteIcaDelPeriodo } from "../types/impuestos.types";

/**
 * Impuestos → ICA y ReteICA (lienzo «ICA y ReteICA»). Lo que se le debe al
 * municipio, no a la DIAN: el ReteICA que la empresa le practicó a sus
 * proveedores en el período, y el estimado de su propio ICA del año.
 */
export function IcaTab({
  onPresentar,
  onPagar,
}: {
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
}) {
  const [municipio, setMunicipio] = useState<string | undefined>(undefined);
  const [periodo, setPeriodo] = useState<string | undefined>(undefined);
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["impuestos", "ica", municipio ?? "", periodo ?? "actual"],
    queryFn: () => impuestosApi.ica(municipio, periodo),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudo armar el ICA" onReintentar={refetch} /> : <SkeletonTable />;
  }
  if (data.ica.length === 0 && data.reteica === null) {
    return (
      <EmptyState
        titulo="Falta decir dónde tiene sede la empresa"
        descripcion="El ICA se declara en cada municipio donde la empresa tiene sede. Con las sedes y su ICA, esta pestaña arma lo del municipio."
        icon={Building2}
        accion={{ label: "Ir a Configurar empresa", href: "/configuracion/impuestos" }}
      />
    );
  }
  return (
    <Contenido
      datos={data}
      onMunicipio={(m) => {
        setMunicipio(m);
        setPeriodo(undefined);
      }}
      onPeriodo={setPeriodo}
      onPresentar={onPresentar}
      onPagar={onPagar}
    />
  );
}

function Contenido({
  datos,
  onMunicipio,
  onPeriodo,
  onPresentar,
  onPagar,
}: {
  datos: IcaPantalla;
  onMunicipio: (m: string) => void;
  onPeriodo: (p: string) => void;
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
}) {
  const { reteica } = datos;
  // Las tarjetas del ICA propio son de la sede principal: ahí van los ingresos.
  const principal = datos.ica.find((i) => i.principal) ?? datos.ica[0] ?? null;
  const otras = datos.ica.filter((i) => i !== principal);

  return (
    <div className="flex flex-col gap-6">
      {reteica && (
        <div className="flex flex-wrap items-center gap-3">
          {datos.configuracion.reteica.length > 1 && (
            <div className="flex gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm" role="group" aria-label="Municipio">
              {datos.configuracion.reteica.map((m) => (
                <button
                  key={m.codigo}
                  type="button"
                  aria-pressed={m.codigo === reteica.municipio.codigo}
                  onClick={() => onMunicipio(m.codigo)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                    m.codigo === reteica.municipio.codigo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
            <Button type="button" variant="ghost" className="size-9 rounded-xl p-0" aria-label="Período anterior" onClick={() => onPeriodo(moverPeriodo(reteica.periodo, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-56 text-center text-sm font-semibold">{periodoEnPalabras(reteica.periodo)}</span>
            <Button
              type="button"
              variant="ghost"
              className="size-9 rounded-xl p-0"
              aria-label="Período siguiente"
              disabled={reteica.fila.situacion.estado === "CAUSANDOSE"}
              onClick={() => onPeriodo(moverPeriodo(reteica.periodo, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {reteica ? (
          <Tarjeta
            titulo={`ReteICA · ${periodoEnPalabras(reteica.periodo)}`}
            valor={reteica.fila.valor}
            detalle={<EstadoCorto fila={reteica.fila} />}
          />
        ) : (
          <Tarjeta titulo="ReteICA" valor={null} detalle="La empresa no es agente de ReteICA en ningún municipio." />
        )}
        {principal && (
          <Tarjeta
            titulo={`ICA ${principal.fila.periodo} · estimado a hoy`}
            valor={principal.estimado?.saldo ?? null}
            detalle={
              principal.estimado?.total == null
                ? `Sin tarifa para ${principal.municipio.nombre}`
                : `Se declara en ${Number(principal.fila.periodo) + 1} · ${principal.estimado.avisosTableros ? "incluye" : "sin"} avisos y tableros`
            }
          />
        )}
        {principal?.anterior && (
          <Tarjeta
            titulo={`ICA ${principal.anterior.periodo}`}
            valor={principal.anterior.valor}
            detalle={<EstadoCorto fila={principal.anterior} />}
          />
        )}
      </ul>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {reteica && <TablaReteIca reteica={reteica} />}
          {principal && <EstimadoIca ica={principal} />}
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Esto no es de la DIAN</p>
            <p className="mt-2 text-sm">
              ICA y ReteICA se declaran y se pagan en la Secretaría de Hacienda de cada municipio, no en MUISCA.
            </p>
            {otras.map((o) => (
              <div key={o.municipio.codigo} className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">
                <p className="font-semibold">Sede {o.municipio.nombre}</p>
                <p className="mt-0.5 text-muted-foreground">
                  Lo que vende esa sede se declara en {o.municipio.nombre}. La venta no dice de qué sede sale, así que el
                  estimado va todo en {principal?.municipio.nombre}: el de {o.municipio.nombre} lo calcula el contador.
                </p>
              </div>
            ))}
          </section>
          {reteica && (
            <>
              <TarjetaDeclaracion fila={reteica.fila} titulo={`ReteICA · ${reteica.municipio.nombre}`} onPresentar={onPresentar} onPagar={onPagar} />
              <TarjetaDeclaracion fila={reteica.anterior} titulo="ReteICA · período anterior" onPresentar={onPresentar} onPagar={onPagar} />
            </>
          )}
          {principal?.anterior && (
            <TarjetaDeclaracion fila={principal.anterior} titulo={`ICA · ${principal.municipio.nombre}`} onPresentar={onPresentar} onPagar={onPagar} />
          )}
          {otras
            .filter((o) => o.anterior !== null)
            .map((o) => (
              <TarjetaDeclaracion key={o.municipio.codigo} fila={o.anterior!} titulo={`ICA · ${o.municipio.nombre}`} onPresentar={onPresentar} onPagar={onPagar} />
            ))}
        </aside>
      </div>
    </div>
  );
}

function TablaReteIca({ reteica }: { reteica: ReteIcaDelPeriodo }) {
  const terceros = reteica.detalle?.terceros ?? [];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">ReteICA que practicaste</h2>
        <p className="text-xs text-muted-foreground">
          Municipio de {reteica.municipio.nombre} · {reteica.periodicidad.toLowerCase()} {periodoEnPalabras(reteica.periodo)}
        </p>
      </div>
      {!reteica.cuadre.cuadra && (
        <div className="flex items-start gap-3 border-b border-border bg-warning/10 px-5 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            El libro (2368) dice {formatCOP(reteica.cuadre.libro)} y las compras dicen {formatCOP(reteica.cuadre.documentos)}: hay{" "}
            {formatCOP(Math.abs(reteica.cuadre.diferencia))} de diferencia. Suele ser un asiento manual contra la 2368. Se paga lo del
            libro: revisalo antes de declarar.
          </p>
        </div>
      )}
      {terceros.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          En {periodoEnPalabras(reteica.periodo)} no le retuviste ICA a nadie en {reteica.municipio.nombre}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-3 py-3 text-right">Base</th>
                <th className="px-3 py-3 text-right">Tarifa</th>
                <th className="px-5 py-3 text-right">Retenido</th>
              </tr>
            </thead>
            <tbody>
              {terceros.map((t) => (
                <tr key={`${t.tercero}-${t.terceroDocumento}`} className="border-t border-border">
                  <th scope="row" className="px-5 py-3 text-left font-medium">
                    {t.tercero}
                    <span className="block font-mono text-xs font-normal text-muted-foreground">{t.terceroDocumento}</span>
                  </th>
                  <td className="px-3 py-3 text-right font-mono whitespace-nowrap tabular-nums">{t.base}</td>
                  <td className="px-3 py-3 text-right font-mono whitespace-nowrap tabular-nums">{t.tarifas}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">{t.retenido}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted">
                <th scope="row" colSpan={3} className="px-5 py-3.5 text-left text-base font-bold">
                  Total a pagar al municipio
                </th>
                <td className="px-5 py-3.5 text-right font-mono text-base font-bold whitespace-nowrap tabular-nums">
                  {formatCOP(reteica.cuadre.libro)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Las tarifas salen de la ley de ICA del municipio y de la actividad de cada proveedor. Lo retenido va a la 2368.
      </p>
    </section>
  );
}

/** El estimado del ICA propio del año, renglón por renglón, con la pregunta de los avisos. */
function EstimadoIca({ ica }: { ica: IcaDeMunicipio }) {
  const puede = useTieneRol("DIRECTOR", "CONTADOR");
  const queryClient = useQueryClient();
  const guardar = useMutation({
    mutationFn: (avisos: boolean) => impuestosApi.guardarAvisos(ica.municipio.codigo, avisos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["impuestos"] }),
    onError: (e: unknown) => aviso.falla(e),
  });
  const e = ica.estimado;
  if (e === null) return null;
  const aFavor = (e.saldo ?? 0) < 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Tu ICA de {e.anio}, estimado a hoy</h2>
        <p className="text-xs text-muted-foreground">Municipio de {ica.municipio.nombre}</p>
      </div>
      {e.tarifaPorMil === null ? (
        <div className="flex items-start gap-3 bg-warning/10 px-5 py-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            No hay tarifa de ICA para {ica.municipio.nombre}: la ley del municipio no está cargada y la empresa no escribió la suya.
            No se calcula: el sistema no inventa tarifas. Escribila en Configurar empresa → Impuestos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <tbody className="font-mono tabular-nums">
              <Renglon concepto="Ingresos del año en el libro" valor={e.ingresos} />
              {e.excluidos > 0 && <Renglon concepto="Menos venta de activos fijos" valor={-e.excluidos} />}
              <Renglon concepto="Base gravable" valor={e.base} fuerte />
              <Renglon
                concepto={`Impuesto de industria y comercio · ${e.tarifaPorMil.toLocaleString("es-CO")} por mil`}
                detalle={
                  e.fuenteTarifa === "LEY"
                    ? "La tarifa de tu actividad en la ley del municipio."
                    : `Tarifa provisional: la que escribiste en Configurar empresa. ${ica.tieneLey ? "" : `La ley de ${ica.municipio.nombre} no está cargada.`}`
                }
                valor={e.impuesto ?? 0}
              />
              <tr className="border-t border-border">
                <th scope="row" className="px-5 py-3 text-left font-sans font-medium">
                  <label className={cn("flex items-center gap-2.5", !puede && "text-muted-foreground")}>
                    <Checkbox
                      checked={e.avisosTableros}
                      disabled={!puede || guardar.isPending}
                      onCheckedChange={(v) => guardar.mutate(v === true)}
                    />
                    Avisos y tableros · 15 %
                  </label>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {ica.avisosRespondido
                      ? "Si la sede tiene aviso o tablero a la vista del público."
                      : "¿La sede tiene aviso o tablero a la vista? Mientras no lo digas, se incluye."}
                  </span>
                </th>
                <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">{formatCOP(e.avisos ?? 0)}</td>
              </tr>
              {e.anticipos > 0 && (
                <Renglon concepto="Menos ReteICA que te practicaron y autorretención" detalle="Lo que ya se anticipó en el año (135518)." valor={-e.anticipos} />
              )}
              <tr className="border-t-2 border-border bg-muted">
                <th scope="row" className="px-5 py-3.5 text-left font-sans text-base font-bold">
                  {aFavor ? "Saldo a favor estimado" : "Saldo a pagar estimado"}
                </th>
                <td className="px-5 py-3.5 text-right text-base font-bold whitespace-nowrap">{formatCOP(Math.abs(e.saldo ?? 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Es un estimado desde el libro, al múltiplo de mil, no la declaración: la sobretasa bomberil, el anticipo del año siguiente y
        las exenciones del acuerdo los pone el contador.
      </p>
    </section>
  );
}

function Renglon({ concepto, detalle, valor, fuerte = false }: { concepto: string; detalle?: string; valor: number; fuerte?: boolean }) {
  return (
    <tr className={cn("border-t border-border", fuerte && "bg-muted/50")}>
      <th scope="row" className={cn("px-5 py-3 text-left font-sans", fuerte ? "font-semibold" : "font-medium")}>
        {concepto}
        {detalle && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{detalle}</span>}
      </th>
      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
        {valor < 0 ? `− ${formatCOP(-valor)}` : formatCOP(valor)}
      </td>
    </tr>
  );
}

function Tarjeta({ titulo, valor, detalle }: { titulo: string; valor: number | null; detalle: React.ReactNode }) {
  return (
    <li className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{titulo}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">
        {valor === null ? "—" : valor < 0 ? `− ${formatCOP(-valor)}` : formatCOP(valor)}
      </p>
      <div className="mt-1 text-xs text-muted-foreground">{detalle}</div>
    </li>
  );
}

function EstadoCorto({ fila }: { fila: FilaCalendario }) {
  const e = estadoEnPalabras(fila);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className={cn("inline-flex rounded-full border px-2 py-0.5 font-medium text-foreground", CLASES_TONO[e.tono])}>{e.texto}</span>
      {fila.situacion.estado !== "PAGADA" && (fila.vence ? `vence ${fechaCorta(fila.vence).toLowerCase()}` : "fecha por confirmar")}
    </span>
  );
}
