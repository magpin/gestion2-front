"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  ETIQUETA_PERIODO,
  rangoDe,
  type Periodo,
} from "@/modules/consumo-ia/consumo";
import {
  DetalleConsumoVista,
  type FiltroVistaDetalle,
} from "@/modules/consumo-ia/DetalleConsumoVista";
import { TableroConsumoVista } from "@/modules/consumo-ia/TableroConsumoVista";
import { hoyEnColombia } from "@/lib/utils";
import { fecha } from "../lib/formato";
import { useTasa } from "../lib/tasa";
import { plataformaService } from "../services/plataforma.service";
import { ErrorCarga, Pastillas, Pestanas } from "./piezas";

const campo =
  "h-9 rounded-lg border border-input bg-card px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * El consumo de la IA con el login de la consola: el mismo tablero de
 * `/consumo-ia`, con filtro por cuenta. **Solo cifras**: tokens, costos,
 * tiempos y cantidades, nunca lo que se conversó.
 *
 * Con `cuentaId` queda fijo en una cuenta: es la pestaña del detalle.
 */
export function VistaConsumo({
  cuentaId: cuentaFija,
  cuentaInicial,
}: {
  cuentaId?: string;
  cuentaInicial?: string | null;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("MES");
  const [cuentaId, setCuentaId] = useState<string | null>(cuentaFija ?? cuentaInicial ?? null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [seccion, setSeccion] = useState<"RESUMEN" | "DETALLE">("RESUMEN");
  const [filtroDetalle, setFiltroDetalle] = useState<FiltroVistaDetalle>({
    categoria: null,
    orden: "COSTO",
    pagina: 1,
  });
  const [tasa, setTasa] = useTasa();
  const [tasaTexto, setTasaTexto] = useState(String(tasa));

  const { desde, hasta } = rangoDe(periodo, hoyEnColombia());
  const filtro = { desde, hasta, cuentaId, empresaId };

  const tablero = useQuery({
    queryKey: ["plataforma", "consumo", filtro],
    queryFn: () => plataformaService.consumo(filtro),
    placeholderData: keepPreviousData,
  });

  const detalle = useQuery({
    queryKey: ["plataforma", "consumo", "detalle", filtro, filtroDetalle],
    queryFn: () => plataformaService.consumoDetalle({ ...filtro, ...filtroDetalle }),
    enabled: seccion === "DETALLE",
    placeholderData: keepPreviousData,
  });

  // Las cuentas y sus empresas que usaron la IA alguna vez, para los filtros.
  const empresas = useMemo(() => tablero.data?.empresas ?? [], [tablero.data]);
  const cuentas = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of empresas) m.set(e.cuentaId, e.cuenta);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [empresas]);
  const empresasDeCuenta = empresas.filter((e) => cuentaId === null || e.cuentaId === cuentaId);

  const reiniciarDetalle = () => setFiltroDetalle((f) => ({ ...f, pagina: 1 }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Período</span>
          <Pastillas
            etiqueta="Período"
            valor={periodo}
            alCambiar={(p) => {
              setPeriodo(p);
              reiniciarDetalle();
            }}
            opciones={(Object.keys(ETIQUETA_PERIODO) as Periodo[]).map((p) => ({
              valor: p,
              texto: ETIQUETA_PERIODO[p],
            }))}
          />
        </div>
        {!cuentaFija && (
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Cuenta
            <select
              className={campo}
              value={cuentaId ?? ""}
              onChange={(e) => {
                setCuentaId(e.target.value || null);
                setEmpresaId(null);
                reiniciarDetalle();
              }}
            >
              <option value="">Todas</option>
              {cuentas.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Empresa
          <select
            className={campo}
            value={empresaId ?? ""}
            onChange={(e) => {
              setEmpresaId(e.target.value || null);
              reiniciarDetalle();
            }}
          >
            <option value="">Todas</option>
            {empresasDeCuenta.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground lg:ml-auto">
          Pesos por dólar
          <input
            inputMode="numeric"
            value={tasaTexto}
            onChange={(e) => {
              setTasaTexto(e.target.value);
              const n = Number(e.target.value.replace(/\D/g, ""));
              if (n > 0) setTasa(n);
            }}
            className={`${campo} w-28 text-right font-mono tabular-nums`}
          />
        </label>
        <span className="w-full text-xs text-muted-foreground">
          {cuentaFija && "Solo cifras: tokens, costos, tiempos y cantidades. "}Del{" "}
          {fecha(`${desde}T12:00:00Z`)} al {fecha(`${hasta}T12:00:00Z`)}.
        </span>
      </div>

      <Pestanas
        etiqueta="Sección"
        valor={seccion}
        alCambiar={setSeccion}
        opciones={[
          { valor: "RESUMEN", texto: "Resumen" },
          { valor: "DETALLE", texto: "Detalle del gasto" },
        ]}
      />

      {seccion === "RESUMEN" ? (
        tablero.isError ? (
          <ErrorCarga que="las cifras de la IA" alReintentar={() => void tablero.refetch()} />
        ) : !tablero.data ? (
          <Cargando />
        ) : (
          <TableroConsumoVista datos={tablero.data} tasa={tasa} />
        )
      ) : detalle.isError ? (
        <ErrorCarga que="el detalle del gasto" alReintentar={() => void detalle.refetch()} />
      ) : !detalle.data ? (
        <Cargando />
      ) : (
        <DetalleConsumoVista
          datos={detalle.data}
          tasa={tasa}
          filtro={filtroDetalle}
          alCambiar={setFiltroDetalle}
        />
      )}
    </div>
  );
}

function Cargando() {
  return (
    <div className="flex justify-center py-20 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}
