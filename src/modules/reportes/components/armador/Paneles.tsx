"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAtajos } from "../../hooks/useReportes";
import { useValores } from "../../hooks/useArmador";
import { deIsoATexto, deTextoAIso, rangoCorto } from "../../lib/fechas";
import type {
  ColumnaArmador,
  Definicion,
  Filtro,
  OrigenArmador,
} from "../../types/armador.types";
import type { AtajoRango } from "../../types/reportes.types";

type Cambiar = (cambio: (d: Definicion) => Definicion) => void;

const CAMPO =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-[#f25623] focus:shadow-[0_0_0_3px_rgba(242,86,35,0.2)]";

/** Una de las cinco partes del armador, con su número: el orden en que se piensa. */
export function Seccion({
  numero,
  titulo,
  ayuda,
  children,
}: {
  numero: number;
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border px-5 py-5 last:border-b-0">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{numero}</span>
        <h2 className="m-0 text-sm font-semibold">{titulo}</h2>
      </div>
      {ayuda && <p className="-mt-1 mb-0 text-xs leading-normal text-muted-foreground">{ayuda}</p>}
      {children}
    </section>
  );
}

/** Las columnas de plata se ven distintas: son las únicas que suman. */
export function MarcaTipo({ c }: { c: Pick<ColumnaArmador, "tipo" | "suma"> }) {
  const texto = { TEXTO: "texto", FECHA: "fecha", DINERO: "dinero", CANTIDAD: "cantidad" }[c.tipo];
  return (
    <span
      className={`rounded px-1.5 py-px font-mono text-[10px] ${
        c.suma ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
      }`}
      title={c.suma ? "Suma en subtotales y total" : undefined}
    >
      {texto}
      {c.suma ? " · Σ" : ""}
    </span>
  );
}

/* ── 1. Fechas ───────────────────────────────────────────────────────────── */

const NOMBRE_ATAJO: Record<AtajoRango, string> = {
  ESTE_MES: "Este mes",
  MES_PASADO: "El mes pasado",
  PERIODO: "Período en curso",
  ESTE_ANIO: "Este año",
};

export function PanelFechas({ def, cambiar }: { def: Definicion; cambiar: Cambiar }) {
  const { data: atajos } = useAtajos();
  const aMano = !("atajo" in def.fechas);
  const [desde, setDesde] = useState("desde" in def.fechas ? deIsoATexto(def.fechas.desde) : "");
  const [hasta, setHasta] = useState("hasta" in def.fechas ? deIsoATexto(def.fechas.hasta) : "");
  const [manoActiva, setManoActiva] = useState(aMano);

  const aplicarMano = (d: string, h: string) => {
    const a = deTextoAIso(d);
    const b = deTextoAIso(h);
    if (a && b && a <= b) cambiar((x) => ({ ...x, fechas: { desde: a, hasta: b } }));
  };

  const chip = (activo: boolean) =>
    `flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:bg-muted ${
      activo ? "border-foreground bg-card" : "border-border"
    }`;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Rango de fechas">
        {(Object.keys(NOMBRE_ATAJO) as AtajoRango[]).map((a) => {
          const o = atajos?.rango.find((r) => r.atajo === a);
          const activo = !manoActiva && "atajo" in def.fechas && def.fechas.atajo === a;
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => {
                setManoActiva(false);
                cambiar((x) => ({ ...x, fechas: { atajo: a } }));
              }}
              className={chip(activo)}
            >
              <span className="text-[13px] font-medium">{NOMBRE_ATAJO[a]}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {o ? rangoCorto(o.desde, o.hasta) : "…"}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        role="radio"
        aria-checked={manoActiva}
        onClick={() => setManoActiva(true)}
        className={chip(manoActiva)}
      >
        <span className="text-[13px] font-medium">Otras fechas</span>
        <span className="text-[11px] text-muted-foreground">Quedan fijas: no se mueven con el calendario</span>
      </button>
      {manoActiva && (
        <div className="flex gap-2">
          <input
            aria-label="Desde"
            placeholder="dd/mm/aaaa"
            inputMode="numeric"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              aplicarMano(e.target.value, hasta);
            }}
            className={`${CAMPO} w-full font-mono text-xs`}
          />
          <input
            aria-label="Hasta"
            placeholder="dd/mm/aaaa"
            inputMode="numeric"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              aplicarMano(desde, e.target.value);
            }}
            className={`${CAMPO} w-full font-mono text-xs`}
          />
        </div>
      )}
    </div>
  );
}

/* ── 2. Columnas ─────────────────────────────────────────────────────────── */

export function PanelColumnas({
  def,
  origen,
  cambiar,
}: {
  def: Definicion;
  origen: OrigenArmador;
  cambiar: Cambiar;
}) {
  const col = (k: string) => origen.columnas.find((c) => c.clave === k)!;
  const libres = origen.columnas.filter((c) => !def.columnas.includes(c.clave));

  const mover = (i: number, delta: number) =>
    cambiar((d) => {
      const cols = [...d.columnas];
      const j = i + delta;
      if (j < 0 || j >= cols.length) return d;
      [cols[i], cols[j]] = [cols[j], cols[i]];
      return { ...d, columnas: cols };
    });

  const quitar = (k: string) =>
    cambiar((d) => ({
      ...d,
      columnas: d.columnas.filter((c) => c !== k),
      // Lo que se agrupa o se ordena por una columna que ya no está, tampoco.
      agrupar: d.agrupar.filter((g) => g !== k),
      orden: d.orden?.columna === k ? null : d.orden,
    }));

  return (
    <div className="flex flex-col gap-2">
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {def.columnas.map((k, i) => {
          const c = col(k);
          if (!c) return null;
          const agrupada = def.agrupar.includes(k);
          return (
            <li
              key={k}
              className="flex items-center gap-2 rounded-lg border border-border bg-card py-1 pr-1 pl-2.5"
            >
              <span className="grow truncate text-[13px]">{c.etiqueta}</span>
              <MarcaTipo c={c} />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Subir ${c.etiqueta}`}
                // Las de agrupación van primero y no se mueven.
                disabled={i === 0 || agrupada || def.agrupar.includes(def.columnas[i - 1])}
                onClick={() => mover(i, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Bajar ${c.etiqueta}`}
                disabled={i === def.columnas.length - 1 || agrupada}
                onClick={() => mover(i, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Quitar ${c.etiqueta}`}
                disabled={def.columnas.length === 1 || agrupada}
                title={agrupada ? "Se está agrupando por esta columna" : undefined}
                onClick={() => quitar(k)}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ol>
      {libres.length > 0 && (
        <label className="flex items-center gap-2">
          <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <select
            aria-label="Agregar una columna"
            value=""
            onChange={(e) => {
              const k = e.target.value;
              if (k) cambiar((d) => ({ ...d, columnas: [...d.columnas, k] }));
            }}
            className={`${CAMPO} w-full text-[13px]`}
          >
            <option value="">Agregar una columna…</option>
            {libres.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/* ── 3. Filtros ──────────────────────────────────────────────────────────── */

export function PanelFiltros({
  def,
  origen,
  cambiar,
}: {
  def: Definicion;
  origen: OrigenArmador;
  cambiar: Cambiar;
}) {
  const filtrables = origen.columnas.filter(
    (c) => c.filtro !== null && !def.filtros.some((f) => f.columna === c.clave),
  );

  const agregar = (c: ColumnaArmador) => {
    const nuevo: Filtro =
      c.filtro === "LISTA"
        ? { columna: c.clave, forma: "LISTA", valores: [] }
        : c.filtro === "RANGO"
          ? { columna: c.clave, forma: "RANGO", minimo: null, maximo: null }
          : { columna: c.clave, forma: "SI_NO", valor: true };
    cambiar((d) => ({ ...d, filtros: [...d.filtros, nuevo] }));
  };

  const poner = (i: number, f: Filtro) =>
    cambiar((d) => ({ ...d, filtros: d.filtros.map((x, j) => (j === i ? f : x)) }));
  const quitar = (i: number) =>
    cambiar((d) => ({ ...d, filtros: d.filtros.filter((_, j) => j !== i) }));

  return (
    <div className="flex flex-col gap-2">
      {def.filtros.map((f, i) => {
        const c = origen.columnas.find((x) => x.clave === f.columna);
        if (!c) return null;
        return (
          <div key={f.columna} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium">{c.etiqueta}</span>
              <Button variant="ghost" size="icon-xs" aria-label={`Quitar el filtro de ${c.etiqueta}`} onClick={() => quitar(i)}>
                <X />
              </Button>
            </div>
            {f.forma === "LISTA" && (
              <FiltroLista origen={origen} columna={c} valores={f.valores} onCambiar={(v) => poner(i, { ...f, valores: v })} />
            )}
            {f.forma === "RANGO" && (
              <div className="flex items-center gap-2">
                <input
                  aria-label={`${c.etiqueta} desde`}
                  placeholder="Desde"
                  inputMode="decimal"
                  defaultValue={f.minimo ?? ""}
                  onChange={(e) => poner(i, { ...f, minimo: aNumero(e.target.value) })}
                  className={`${CAMPO} w-full font-mono text-xs`}
                />
                <span className="text-xs text-muted-foreground">a</span>
                <input
                  aria-label={`${c.etiqueta} hasta`}
                  placeholder="Hasta"
                  inputMode="decimal"
                  defaultValue={f.maximo ?? ""}
                  onChange={(e) => poner(i, { ...f, maximo: aNumero(e.target.value) })}
                  className={`${CAMPO} w-full font-mono text-xs`}
                />
              </div>
            )}
            {f.forma === "SI_NO" && (
              <div className="flex gap-1.5" role="radiogroup" aria-label={c.etiqueta}>
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={f.valor === v}
                    onClick={() => poner(i, { ...f, valor: v })}
                    className={`h-8 rounded-lg border px-3 text-[13px] ${
                      f.valor === v ? "border-foreground font-medium" : "border-border hover:bg-muted"
                    }`}
                  >
                    {v ? "Sí" : "No"}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {filtrables.length > 0 && (
        <label className="flex items-center gap-2">
          <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <select
            aria-label="Agregar un filtro"
            value=""
            onChange={(e) => {
              const c = filtrables.find((x) => x.clave === e.target.value);
              if (c) agregar(c);
            }}
            className={`${CAMPO} w-full text-[13px]`}
          >
            <option value="">Agregar un filtro…</option>
            {filtrables.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/** «1.200.000» o «1200000,50» → número. Vacío es «sin borde». */
function aNumero(texto: string): number | null {
  const limpio = texto.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function FiltroLista({
  origen,
  columna,
  valores,
  onCambiar,
}: {
  origen: OrigenArmador;
  columna: ColumnaArmador;
  valores: string[];
  onCambiar: (v: string[]) => void;
}) {
  const { data, isPending, isError } = useValores(origen.clave, columna.clave, columna.valores === null);
  const opciones = columna.valores ?? data ?? [];
  const [busca, setBusca] = useState("");
  const visibles = opciones.filter((o) => o.toLowerCase().includes(busca.toLowerCase())).slice(0, 100);

  if (columna.valores === null && isPending) {
    return <span className="text-xs text-muted-foreground">Trayendo los valores…</span>;
  }
  if (isError) return <span className="text-xs text-muted-foreground">No se pudieron traer los valores.</span>;
  if (opciones.length === 0) {
    return <span className="text-xs text-muted-foreground">Todavía no hay datos con qué filtrar.</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {opciones.length > 8 && (
        <label className="relative">
          <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" aria-hidden />
          <input
            aria-label={`Buscar en ${columna.etiqueta}`}
            placeholder="Buscar"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={`${CAMPO} w-full pl-8 text-xs`}
          />
        </label>
      )}
      <div className="flex max-h-44 flex-col gap-0.5 overflow-auto">
        {visibles.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[13px] hover:bg-muted">
            <input
              type="checkbox"
              checked={valores.includes(o)}
              onChange={(e) =>
                onCambiar(e.target.checked ? [...valores, o] : valores.filter((v) => v !== o))
              }
              className="size-3.5 accent-foreground"
            />
            <span className="truncate">{o}</span>
          </label>
        ))}
      </div>
      {valores.length === 0 && (
        <span className="text-[11px] text-muted-foreground">Sin nada marcado, este filtro no se aplica.</span>
      )}
    </div>
  );
}

/* ── 4 y 5. Agrupación y orden ───────────────────────────────────────────── */

export function PanelAgrupar({
  def,
  origen,
  cambiar,
}: {
  def: Definicion;
  origen: OrigenArmador;
  cambiar: Cambiar;
}) {
  const agrupables = origen.columnas.filter((c) => c.agrupable);
  const poner = (nivel: 0 | 1, clave: string) =>
    cambiar((d) => {
      const g = [...d.agrupar];
      if (clave === "") g.splice(nivel);
      else g[nivel] = clave;
      const agrupar = g.filter(Boolean).slice(0, 2);
      // Las columnas de agrupación van adelante y en su orden, como las pone
      // el servidor: la lista de la izquierda es el orden en que van a salir.
      const columnas = [...new Set([...agrupar, ...d.columnas])];
      return { ...d, agrupar: [...new Set(agrupar)], columnas };
    });

  return (
    <div className="flex flex-col gap-2">
      <select
        aria-label="Agrupar por"
        value={def.agrupar[0] ?? ""}
        onChange={(e) => poner(0, e.target.value)}
        className={`${CAMPO} text-[13px]`}
      >
        <option value="">Sin agrupar</option>
        {agrupables.map((c) => (
          <option key={c.clave} value={c.clave}>
            {c.etiqueta}
          </option>
        ))}
      </select>
      {def.agrupar[0] && (
        <select
          aria-label="Y después por"
          value={def.agrupar[1] ?? ""}
          onChange={(e) => poner(1, e.target.value)}
          className={`${CAMPO} text-[13px]`}
        >
          <option value="">Sin segundo nivel</option>
          {agrupables
            .filter((c) => c.clave !== def.agrupar[0])
            .map((c) => (
              <option key={c.clave} value={c.clave}>
                y después por {c.etiqueta.toLowerCase()}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}

export function PanelOrden({
  def,
  origen,
  cambiar,
}: {
  def: Definicion;
  origen: OrigenArmador;
  cambiar: Cambiar;
}) {
  const elegidas = origen.columnas.filter((c) => def.columnas.includes(c.clave));
  return (
    <div className="flex gap-2">
      <select
        aria-label="Ordenar por"
        value={def.orden?.columna ?? ""}
        onChange={(e) =>
          cambiar((d) => ({
            ...d,
            orden: e.target.value
              ? { columna: e.target.value, direccion: d.orden?.direccion ?? "ASC" }
              : null,
          }))
        }
        className={`${CAMPO} grow text-[13px]`}
      >
        <option value="">Por fecha</option>
        {elegidas.map((c) => (
          <option key={c.clave} value={c.clave}>
            {c.etiqueta}
          </option>
        ))}
      </select>
      <select
        aria-label="Dirección"
        disabled={!def.orden}
        value={def.orden?.direccion ?? "ASC"}
        onChange={(e) =>
          cambiar((d) =>
            d.orden ? { ...d, orden: { ...d.orden, direccion: e.target.value as "ASC" | "DESC" } } : d,
          )
        }
        className={`${CAMPO} text-[13px]`}
      >
        <option value="ASC">De menor a mayor</option>
        <option value="DESC">De mayor a menor</option>
      </select>
    </div>
  );
}
