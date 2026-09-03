"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  ChevronDown,
  Eraser,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * La barra de un listado, igual en todos los módulos.
 *
 * Tres funciones, tres formas, y ninguna se puede confundir con otra:
 *
 *   · navegar entre listados → pestañas, que viven en `PageHeader`;
 *   · acotar lo que se ve    → este botón `Filtros`, con su panel y sus chips;
 *   · actuar sobre el negocio → un botón sólido y un menú «⋯».
 *
 * Las vistas no componen la barra: declaran QUÉ filtran y el componente decide
 * cómo se ve. Los chips y el contador se derivan de `filtros`, así que no hay
 * forma de que una pantalla se olvide de pintarlos ni de que dos módulos
 * terminen con dos disposiciones distintas — que es exactamente lo que pasó
 * cuando esto era un juego de piezas sueltas.
 */

// ── Filtros ──────────────────────────────────────────────────────────────────

export interface OpcionFiltro {
  valor: string;
  label: string;
  /** La cifra a la derecha: cuántos hay. Ahorra probar el filtro para saberlo. */
  apunte?: number | string;
}

interface GrupoUnico {
  tipo: "unico";
  id: string;
  titulo: string;
  /** El valor que significa «sin filtrar». No cuenta ni pinta chip. */
  todos: string;
  etiquetaTodos: string;
  valor: string;
  opciones: OpcionFiltro[];
  onChange: (valor: string) => void;
}

interface Interruptor {
  tipo: "interruptor";
  id: string;
  /** Abre un bloque nuevo en el panel. Sin título, se pega al anterior. */
  titulo?: string;
  /** Cómo se lee dentro del panel: «Asientos anulados». */
  texto: string;
  /** Cómo se lee como chip, ya fuera de contexto: «Anulados». */
  chip: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
}

export type FiltroListado = GrupoUnico | Interruptor;

/**
 * Declara un grupo de selección única sin perder el tipo del módulo.
 *
 * Sin esto, cada vista tendría que castear su unión (`"TODOS" | OrigenTipo`) a
 * `string` en el `onChange` y el compilador dejaría de avisar cuando la unión
 * cambie.
 */
export function grupoUnico<T extends string>(config: {
  id: string;
  titulo: string;
  todos: T;
  etiquetaTodos?: string;
  valor: T;
  opciones: { valor: T; label: string; apunte?: number | string }[];
  onChange: (valor: T) => void;
}): FiltroListado {
  return {
    tipo: "unico",
    id: config.id,
    titulo: config.titulo,
    todos: config.todos,
    etiquetaTodos: config.etiquetaTodos ?? "Todos",
    valor: config.valor,
    opciones: config.opciones,
    onChange: (valor) => config.onChange(valor as T),
  };
}

/** Declara un interruptor de inclusión: anulados, inactivos, vencidos. */
export function interruptor(config: {
  id: string;
  titulo?: string;
  texto: string;
  chip: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
}): FiltroListado {
  return { tipo: "interruptor", ...config };
}

// ── Acciones ─────────────────────────────────────────────────────────────────

export interface AccionListado {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

interface BusquedaListado {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}

interface BarraListadoProps {
  filtros?: FiltroListado[];
  busqueda?: BusquedaListado;
  /**
   * El gesto propio del módulo: cerrar caja, registrar ajuste, crear.
   *
   * Ocupa el sitio donde antes vivía «Mostrar anulados» —el mismo botón en
   * todas las pantallas—, que era el control más llamativo del listado siendo
   * el que menos se usa. Los anulados bajaron al panel, que es su sitio: dicen
   * qué se incluye, no ejecutan nada.
   */
  accion?: AccionListado;
  /** Lo demás que se puede hacer, detrás de «⋯». */
  menu?: AccionListado[];
}

/** Un filtro puesto, ya resuelto a texto: la fuente de los chips y del contador. */
interface FiltroPuesto {
  id: string;
  texto: string;
  quitar: () => void;
}

function filtrosPuestos(filtros: FiltroListado[]): FiltroPuesto[] {
  const puestos: FiltroPuesto[] = [];

  for (const filtro of filtros) {
    if (filtro.tipo === "unico") {
      if (filtro.valor === filtro.todos) continue;
      const opcion = filtro.opciones.find((o) => o.valor === filtro.valor);
      puestos.push({
        id: filtro.id,
        texto: opcion?.label ?? filtro.valor,
        quitar: () => filtro.onChange(filtro.todos),
      });
    } else if (filtro.valor) {
      puestos.push({
        id: filtro.id,
        texto: filtro.chip,
        quitar: () => filtro.onChange(false),
      });
    }
  }

  return puestos;
}

export function BarraListado({
  filtros = [],
  busqueda,
  accion,
  menu,
}: BarraListadoProps) {
  const [abierto, setAbierto] = useState(false);
  const puestos = filtrosPuestos(filtros);

  const limpiar = () => {
    for (const filtro of filtros) {
      if (filtro.tipo === "unico") filtro.onChange(filtro.todos);
      else filtro.onChange(false);
    }
    setAbierto(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {filtros.length > 0 && (
          <Popover open={abierto} onOpenChange={setAbierto}>
            <PopoverTrigger
              render={
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
                  Filtros
                  {puestos.length > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-medium tabular-nums text-accent-foreground">
                      {puestos.length}
                    </span>
                  )}
                  <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              }
            />

            <PopoverContent align="start" className="w-[268px] gap-0 p-0">
              <PanelFiltros filtros={filtros} />

              <div className="flex justify-end border-t border-border bg-muted p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={limpiar}
                  disabled={puestos.length === 0}
                >
                  <Eraser size={15} strokeWidth={1.75} aria-hidden="true" />
                  Limpiar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Qué está filtrado, sin abrir el panel, y cómo quitarlo de un clic. */}
        {puestos.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {puestos.map((filtro) => (
              <span
                key={filtro.id}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-primary/25 bg-secondary pl-3 pr-1.5 text-xs font-semibold text-secondary-foreground"
              >
                {filtro.texto}
                <button
                  type="button"
                  onClick={filtro.quitar}
                  aria-label={`Quitar filtro ${filtro.texto}`}
                  className="grid size-[18px] place-items-center rounded-full opacity-65 transition-opacity hover:bg-primary/10 hover:opacity-100"
                >
                  <X size={12} strokeWidth={2} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          filtros.length > 0 && (
            <span className="text-sm text-muted-foreground">Sin filtros</span>
          )
        )}
      </div>

      <AccionesListado busqueda={busqueda} accion={accion} menu={menu} />
    </div>
  );
}

/**
 * El lado derecho de un listado: buscador, el gesto propio del módulo y «⋯».
 *
 * Sale aparte porque no siempre viaja con los filtros: cuando el módulo tiene
 * pestañas, las acciones suben a la fila de pestañas —como «Cobrar» en Venta— y
 * abajo quedan solo los filtros. Misma pieza en los dos sitios, para que no se
 * separen con el tiempo.
 */
export function AccionesListado({
  busqueda,
  accion,
  menu,
}: {
  busqueda?: BusquedaListado;
  accion?: AccionListado;
  menu?: AccionListado[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {busqueda && (
        <div className="relative">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={busqueda.valor}
            onChange={(evento) => busqueda.onChange(evento.target.value)}
            placeholder={busqueda.placeholder ?? "Buscar…"}
            className="h-10 w-full pl-9 sm:w-56"
          />
        </div>
      )}

      {accion && (
        <Button className="gap-2" onClick={accion.onClick} disabled={accion.disabled}>
          <accion.icon size={16} strokeWidth={1.75} aria-hidden="true" />
          {accion.label}
        </Button>
      )}

      {menu && menu.length > 0 && <MenuAcciones acciones={menu} />}
    </div>
  );
}

/** El contenido del panel: los grupos arriba, los interruptores abajo. */
function PanelFiltros({ filtros }: { filtros: FiltroListado[] }) {
  const grupos = filtros.filter((f): f is GrupoUnico => f.tipo === "unico");
  const llaves = filtros.filter((f): f is Interruptor => f.tipo === "interruptor");

  /* Los interruptores se agrupan por título: el primero abre bloque, y los que
     vienen sin título se pegan al de arriba. Así «Solo con saldo» y «Incluir
     inactivos» pueden vivir separados aunque los dos sean interruptores. */
  const bloques: { titulo?: string; llaves: Interruptor[] }[] = [];
  for (const llave of llaves) {
    if (llave.titulo || bloques.length === 0) {
      bloques.push({ titulo: llave.titulo, llaves: [llave] });
    } else {
      bloques[bloques.length - 1].llaves.push(llave);
    }
  }

  return (
    <>
      {grupos.map((grupo) => (
        <div
          key={grupo.id}
          role="radiogroup"
          aria-label={grupo.titulo}
          className="p-2 pt-2.5 not-first:border-t not-first:border-border"
        >
          <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {grupo.titulo}
          </p>

          {/* La cifra de «Todos» es la suma de las opciones, y solo se pinta si
              alguna la trae: si ninguna cuenta —porque filtra el backend— un 0
              ahí se leería como «no hay nada». */}
          <OpcionUnica
            marcada={grupo.valor === grupo.todos}
            label={grupo.etiquetaTodos}
            apunte={
              grupo.opciones.some((opcion) => typeof opcion.apunte === "number")
                ? grupo.opciones.reduce(
                    (total, opcion) =>
                      typeof opcion.apunte === "number" ? total + opcion.apunte : total,
                    0,
                  )
                : undefined
            }
            onClick={() => grupo.onChange(grupo.todos)}
          />

          {grupo.opciones.map((opcion) => (
            <OpcionUnica
              key={opcion.valor}
              marcada={grupo.valor === opcion.valor}
              label={opcion.label}
              apunte={opcion.apunte}
              onClick={() => grupo.onChange(opcion.valor)}
            />
          ))}
        </div>
      ))}

      {bloques.map((bloque, indice) => (
        <div
          key={bloque.titulo ?? indice}
          className="p-2 pt-2.5 not-first:border-t not-first:border-border"
        >
          {bloque.titulo && (
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {bloque.titulo}
            </p>
          )}

          {bloque.llaves.map((llave) => (
            <button
              key={llave.id}
              type="button"
              role="switch"
              aria-checked={llave.valor}
              onClick={() => llave.onChange(!llave.valor)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              {llave.texto}
              <span
                className={cn(
                  "relative h-5 w-[34px] shrink-0 rounded-full transition-colors",
                  llave.valor ? "bg-ring" : "bg-border",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 size-4 rounded-full bg-card shadow-sm transition-transform",
                    llave.valor && "translate-x-3.5",
                  )}
                />
              </span>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

function OpcionUnica({
  marcada,
  label,
  apunte,
  onClick,
}: {
  marcada: boolean;
  label: string;
  apunte?: number | string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
        marcada && "font-semibold",
      )}
    >
      <span className="grid size-4 shrink-0 place-items-center text-ring">
        {marcada && <Check size={14} strokeWidth={2.25} aria-hidden="true" />}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {apunte !== undefined && (
        <span className="ml-auto pl-3 font-mono text-[11px] tabular-nums text-muted-foreground">
          {apunte}
        </span>
      )}
    </button>
  );
}

function MenuAcciones({ acciones }: { acciones: AccionListado[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Más acciones">
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        }
      />

      <PopoverContent align="end" className="w-[212px] gap-0 p-1.5">
        {acciones.map((accion) => (
          <button
            key={accion.label}
            type="button"
            disabled={accion.disabled}
            onClick={() => {
              setAbierto(false);
              accion.onClick();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            <accion.icon
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
            {accion.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
