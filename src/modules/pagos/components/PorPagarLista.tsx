"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HandCoins, Landmark, ListFilter, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { funcionActiva } from "@/core/config/funciones";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP } from "@/lib/utils";
import { PagarDeclaracionDialog } from "@/modules/impuestos/components/PagarDeclaracionDialog";
import { fechaCorta } from "@/modules/impuestos/lib/impuestos";
import { impuestosApi } from "@/modules/impuestos/services/impuestos.service";
import type { FilaCalendario } from "@/modules/impuestos/types/impuestos.types";
import { fechaConDia } from "@/modules/tesoreria/components/PlazoYPago";
import { diasHasta, rangoDeTramo, tramoDe } from "../lib/tramos";
import { pagosApi } from "../services/pagos.service";
import { NOMBRE_TRAMO, TRAMOS, type TramoPago } from "../types/pagos.types";
import type { ProveedorInicial } from "./ComprobanteEgresoDialog";

type Filtro = "Todo" | "Proveedores" | "Impuestos";

/** Un renglón de la lista: una compra o una declaración presentada sin pagar. */
type Renglon =
  | {
      clase: "COMPRA";
      id: string;
      quien: string;
      detalle: string;
      busqueda: string;
      vence: string;
      tramo: TramoPago;
      saldo: number;
      proveedor: ProveedorInicial;
      prontoPago: { valor: number; hasta: string | null } | null;
    }
  | {
      clase: "IMPUESTO";
      id: string;
      quien: string;
      detalle: string;
      busqueda: string;
      vence: string | null;
      tramo: TramoPago;
      saldo: number;
      fila: FilaCalendario;
    };

/** Día de la semana con mayúscula: «Mié 21 oct». */
const conDia = (f: string) => fechaConDia(f).replace(/ \d{4}$/, "");

/**
 * Pagos → Por pagar (pantalla 58): lo que se les debe a los proveedores, a la
 * DIAN y al municipio en una sola lista, con los tramos de vencimiento
 * sumando todo. Los impuestos son las declaraciones ya presentadas; si su
 * consulta falla, la lista sigue con los proveedores.
 */
export function PorPagarLista({
  onPagar,
}: {
  onPagar?: (proveedor: ProveedorInicial) => void;
}) {
  const pagaImpuestos = useTieneRol("DIRECTOR", "CONTADOR", "CAJA");
  const conImpuestos = funcionActiva("impuestos");
  const [tramo, setTramo] = useState<TramoPago | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("Todo");
  const [busqueda, setBusqueda] = useState("");
  const [pagando, setPagando] = useState<FilaCalendario | null>(null);

  const { data, isError, error, refetch } = useQuery({
    queryKey: ["pagos", "por-pagar"],
    queryFn: pagosApi.porPagar,
    meta: SILENCIOSO,
  });
  const { data: declaraciones = [] } = useQuery({
    queryKey: ["impuestos", "por-pagar"],
    queryFn: impuestosApi.porPagar,
    meta: SILENCIOSO,
    enabled: conImpuestos,
  });

  if (data === undefined) {
    return isError ? (
      <ErrorCarga
        error={error}
        titulo="No se pudo leer lo que falta pagar"
        onReintentar={refetch}
      />
    ) : (
      <SkeletonTable />
    );
  }

  const hoy = data.hoy;
  const compras: Renglon[] = data.proveedores.flatMap((p) =>
    p.compras.map((c) => ({
      clase: "COMPRA" as const,
      id: c.id,
      quien: p.nombre,
      detalle: `${p.identificacion} · ${c.numero}`,
      busqueda: `${p.nombre} ${p.identificacion} ${c.numero}`,
      vence: c.venceEfectivo,
      tramo: c.tramo,
      saldo: c.pendiente,
      proveedor: { id: p.terceroId, nombre: p.nombre },
      prontoPago:
        c.descuentoSugerido > 0
          ? { valor: c.descuentoSugerido, hasta: c.descuentoHasta }
          : null,
    })),
  );
  const impuestos: Renglon[] = (conImpuestos ? declaraciones : []).map((f) => ({
    clase: "IMPUESTO" as const,
    id: f.declaracion!.id,
    quien: f.etiqueta,
    detalle: f.municipio
      ? `${f.municipio.nombre} · presentada el ${fechaCorta(f.declaracion!.presentadaEl).toLowerCase()}`
      : `${f.formulario ? `Formulario ${f.formulario} ` : ""}presentado el ${fechaCorta(f.declaracion!.presentadaEl).toLowerCase()}`,
    busqueda: `${f.etiqueta} ${f.municipio ? `municipio ${f.municipio.nombre}` : "DIAN"}`,
    vence: f.vence,
    // Sin fecha de ley todavía: no se sabe cuándo, va al final.
    tramo: f.vence ? tramoDe(f.vence, hoy) : "DESPUES",
    saldo: f.valor ?? 0,
    fila: f,
  }));
  const todos = [...compras, ...impuestos].sort((a, b) =>
    (a.vence ?? "9999").localeCompare(b.vence ?? "9999"),
  );

  if (todos.length === 0) {
    return (
      <EmptyState
        titulo="No le debés a nadie"
        descripcion="Cuando registrés una compra a crédito o presentés una declaración, aparece acá con su vencimiento."
        icon={HandCoins}
        accion={{ label: "Registrar compra", href: "/dashboard/compras/nueva" }}
      />
    );
  }

  const sumaTramo = (t: TramoPago) =>
    todos.filter((r) => r.tramo === t).reduce((s, r) => s + r.saldo, 0);
  const total = todos.reduce((s, r) => s + r.saldo, 0);
  const deDian = impuestos.some(
    (r) => r.clase === "IMPUESTO" && r.fila.municipio === null,
  );
  const deMunicipio = impuestos.some(
    (r) => r.clase === "IMPUESTO" && r.fila.municipio !== null,
  );
  const a = [
    data.proveedores.length > 0 &&
      `${data.proveedores.length} ${data.proveedores.length === 1 ? "proveedor" : "proveedores"}`,
    deDian && "la DIAN",
    deMunicipio && "el municipio",
  ].filter(Boolean);
  const mes = nombreDelMes(hoy);

  const q = busqueda.trim().toLowerCase();
  const visibles = todos.filter(
    (r) =>
      (tramo === null || r.tramo === tramo) &&
      (filtro === "Todo" ||
        (filtro === "Proveedores") === (r.clase === "COMPRA")) &&
      (q === "" || r.busqueda.toLowerCase().includes(q)),
  );
  const limpiar = () => {
    setTramo(null);
    setFiltro("Todo");
    setBusqueda("");
  };
  // Art. 580-1 ET: el 350 presentado con saldo que no se paga en dos meses no cuenta como presentado.
  const retencionSinPagar = impuestos.some(
    (r) => r.clase === "IMPUESTO" && r.fila.obligacion === "RETENCION",
  );

  return (
    <>
      <section className="mb-7 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-1 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Debés
            </p>
            <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">
              {formatCOP(total)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="md:hidden">
              {todos.length} {todos.length === 1 ? "factura" : "facturas"}
            </span>
            <span className="max-md:hidden">{a.join(" · ")}</span>
          </p>
        </div>
        {/* En el móvil (pantalla 67), Vencido y Esta semana lado a lado; el resto, en pantallas grandes. */}
        <div className="grid grid-cols-2 gap-px border-t border-border bg-border lg:grid-cols-5">
          {TRAMOS.map((t, i) => {
            const suma = sumaTramo(t);
            const conDian =
              t !== "VENCIDO" &&
              impuestos.some(
                (r) =>
                  r.tramo === t && r.clase === "IMPUESTO" && !r.fila.municipio,
              );
            return (
              <button
                key={t}
                type="button"
                aria-pressed={tramo === t}
                onClick={() => setTramo(tramo === t ? null : t)}
                className={cn(
                  "px-6 py-4 text-left transition-colors",
                  tramo === t ? "bg-accent" : "bg-card hover:bg-accent/60",
                  i >= 2 && "max-lg:hidden",
                )}
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {t === "VENCIDO" && suma > 0 && (
                    <span className="size-2 rounded-full bg-warning" />
                  )}
                  {t === "RESTO_MES" ? `Resto de ${mes}` : NOMBRE_TRAMO[t]}
                </p>
                <p className="text-xs text-muted-foreground max-md:hidden">
                  {t === "VENCIDO" && suma === 0
                    ? "Nada vencido"
                    : rangoDeTramo(t, hoy)}
                  {conDian && " · incluye DIAN"}
                </p>
                <p className="mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(suma)}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {retencionSinPagar && (
        <p className="mb-5 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-3 text-sm">
          <strong className="font-semibold">
            Una retención presentada no está pagada.
          </strong>{" "}
          Si no se paga dentro de los dos meses siguientes al vencimiento, el
          350 queda como no presentado (art. 580-1 ET).
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tercero, NIT o factura"
            aria-label="Buscar"
            className="h-12 rounded-full pl-12"
          />
        </div>
        {conImpuestos && (
          <div
            role="group"
            aria-label="Qué mostrar"
            className="flex gap-1 rounded-full border border-border bg-card p-1"
          >
            {(["Todo", "Proveedores", "Impuestos"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filtro === f}
                onClick={() => setFiltro(f)}
                className={cn(
                  "h-[38px] rounded-full px-4 text-[13px] font-semibold transition-colors",
                  filtro === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          titulo="Nada coincide"
          descripcion="Nada de lo que debés coincide con el tramo, el filtro o la búsqueda."
          icon={ListFilter}
          accionSecundaria={{ label: "Limpiar filtros", onClick: limpiar }}
        />
      ) : (
        <>
          {/* En el móvil (pantalla 67), una tarjeta por renglón, en el orden en que vencen. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visibles.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card px-4 py-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.quien}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Vence r={r} hoy={hoy} />
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
                    {formatCOP(r.saldo)}
                  </span>
                  <Accion
                    r={r}
                    onPagar={onPagar}
                    onDeclaracion={pagaImpuestos ? setPagando : undefined}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card shadow-sm md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <th scope="col" className="border-b border-border px-5 py-4">
                    A quién
                  </th>
                  <th scope="col" className="border-b border-border px-3 py-4">
                    Vence
                  </th>
                  <th
                    scope="col"
                    className="border-b border-border px-3 py-4 text-right"
                  >
                    Saldo
                  </th>
                  <th scope="col" className="border-b border-border px-5 py-4">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border last:border-0",
                      r.clase === "IMPUESTO" && "bg-info/10",
                    )}
                  >
                    <td className="px-5 py-3">
                      {r.clase === "IMPUESTO" ? (
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-info/40 bg-card">
                            <Landmark className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-semibold">
                              {r.quien}
                              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium">
                                {r.fila.municipio ? "Municipio" : "DIAN"}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {r.detalle}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold">{r.quien}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {r.detalle}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <Vence r={r} hoy={hoy} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                      {formatCOP(r.saldo)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Accion
                        r={r}
                        onPagar={onPagar}
                        onDeclaracion={pagaImpuestos ? setPagando : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <PagarDeclaracionDialog
        fila={pagando}
        onCerrar={() => setPagando(null)}
      />
    </>
  );
}

/** Nombre del mes en minúscula a partir de un `yyyy-mm-dd`. */
function nombreDelMes(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-CO", {
    month: "long",
    timeZone: "UTC",
  });
}

function Vence({ r, hoy }: { r: Renglon; hoy: string }) {
  if (r.vence === null) return <span>Por confirmar</span>;
  const dias = diasHasta(r.vence, hoy);
  const vencido = dias < 0;
  return (
    <>
      <span
        className={cn(
          "whitespace-nowrap",
          vencido &&
            "rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs font-medium text-foreground",
        )}
      >
        {vencido
          ? `Venció hace ${-dias} ${dias === -1 ? "día" : "días"}`
          : conDia(r.vence)}
      </span>
      {r.clase === "IMPUESTO" && !vencido && dias <= 15 && (
        <span className="rounded-full border border-info/40 bg-card px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
          {dias === 0
            ? "Vence hoy"
            : `En ${dias} ${dias === 1 ? "día" : "días"}`}
        </span>
      )}
      {r.clase === "COMPRA" && r.prontoPago && (
        <span
          className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-foreground"
          title={`Pronto pago: ${formatCOP(r.prontoPago.valor)}`}
        >
          Pronto pago hasta el{" "}
          {r.prontoPago.hasta ? conDia(r.prontoPago.hasta).toLowerCase() : "—"}
        </span>
      )}
    </>
  );
}

function Accion({
  r,
  onPagar,
  onDeclaracion,
}: {
  r: Renglon;
  onPagar?: (proveedor: ProveedorInicial) => void;
  onDeclaracion?: (f: FilaCalendario) => void;
}) {
  if (r.clase === "IMPUESTO") {
    return onDeclaracion ? (
      <Button
        type="button"
        className="h-8 rounded-lg px-3.5 text-[13px]"
        onClick={() => onDeclaracion(r.fila)}
      >
        Registrar pago
      </Button>
    ) : null;
  }
  return onPagar ? (
    <Button
      type="button"
      variant={r.tramo === "VENCIDO" ? "default" : "outline"}
      className="h-8 rounded-lg px-3.5 text-[13px]"
      onClick={() => onPagar(r.proveedor)}
    >
      Pagar
    </Button>
  ) : null;
}
