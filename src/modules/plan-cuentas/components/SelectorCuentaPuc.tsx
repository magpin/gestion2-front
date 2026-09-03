"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, EyeOff, Loader2, PenLine, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { planCuentasApi } from "../services/plan-cuentas.service";
import type { CuentaCatalogo } from "../types/plan-cuentas.types";

interface Props {
  /** Se llama al elegir una cuenta. Solo se pueden elegir las imputables. */
  onElegir: (cuenta: CuentaCatalogo) => void;
}

/**
 * Elegir una cuenta del Decreto 2650 para agregarla al plan de la empresa.
 *
 * Lo que no parece de la actividad de la empresa **se pliega, no se esconde**.
 * Es la decisión que sostiene toda la pantalla: la inferencia sobre inventarios
 * y costos de producción es débil —el grupo 74 del decreto es "contratos de
 * servicios" y lo usa cualquiera que costee por contrato—, así que si se
 * equivoca, el costo tiene que ser un clic. Esconder una cuenta que alguien
 * necesitaba termina en asentar en la equivocada porque la correcta no aparecía.
 *
 * Se carga por demanda: son 2 492 cuentas y traerlas todas para mostrar nueve
 * clases sería tirar la conexión.
 */
export function SelectorCuentaPuc({ onElegir }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const consulta = busqueda.trim();
  const buscando = consulta.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["plan-cuentas", "catalogo", buscando ? consulta : "raiz"],
    queryFn: () =>
      buscando
        ? planCuentasApi.catalogo({ q: consulta })
        : planCuentasApi.catalogo({ nivel: 1 }),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Las actividades viajan una sola vez en la respuesta: van de encabezado
          y no repetidas en cada una de las cuatrocientas filas. */}
      {data && data.secciones.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Se resalta lo que corresponde a tu actividad:{" "}
          <span className="text-foreground">
            {data.secciones.length <= 2
              ? data.secciones.map((s) => s.nombre.toLowerCase()).join(" y ")
              : `${data.secciones.length} actividades declaradas`}
          </span>
          .
        </p>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Código o nombre: 1105, caja, retención…"
          className="pl-9"
          aria-label="Buscar cuenta en el catálogo"
        />
      </div>

      {isFetching && !data ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <Lista cuentas={data?.cuentas ?? []} profundidad={0} plano={buscando} onElegir={onElegir} />
      )}
    </div>
  );
}

/**
 * Un nivel del árbol, partido en dos: lo que le sirve a la empresa y lo que no.
 * Lo segundo queda detrás de un botón que dice cuántas son y por qué.
 */
function Lista({
  cuentas,
  profundidad,
  plano,
  onElegir,
}: {
  cuentas: CuentaCatalogo[];
  profundidad: number;
  plano: boolean;
  onElegir: (c: CuentaCatalogo) => void;
}) {
  const [verOtras, setVerOtras] = useState(false);

  const sirven = cuentas.filter((c) => c.pertinente);
  const otras = cuentas.filter((c) => !c.pertinente);

  if (cuentas.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {sirven.map((c) => (
        <Nodo key={c.codigo} cuenta={c} profundidad={profundidad} plano={plano} onElegir={onElegir} />
      ))}

      {otras.length > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setVerOtras((v) => !v)}
            aria-expanded={verOtras}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent"
            style={{ paddingLeft: `${profundidad * 18 + 12}px` }}
          >
            <EyeOff className="size-3.5 shrink-0" />
            {verOtras ? "Ocultar" : "Ver"} {otras.length}{" "}
            {otras.length === 1 ? "cuenta que no parece" : "cuentas que no parecen"} de tu actividad
            {!verOtras && otras[0]?.motivo && ` — ${otras[0].motivo.toLowerCase()}`}
          </button>
        </li>
      )}

      {verOtras &&
        otras.map((c) => (
          <Nodo
            key={c.codigo}
            cuenta={c}
            profundidad={profundidad}
            plano={plano}
            onElegir={onElegir}
          />
        ))}
    </ul>
  );
}

function Nodo({
  cuenta,
  profundidad,
  plano,
  onElegir,
}: {
  cuenta: CuentaCatalogo;
  profundidad: number;
  plano: boolean;
  onElegir: (c: CuentaCatalogo) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const hoja = cuenta.es_imputable;

  // Buscando se devuelve una lista plana de todos los niveles, sin arbol que
  // desplegar. Una cuenta de agrupacion ahi no lleva a ningun lado: se muestra
  // para ubicar el resultado, pero no finge ser un boton.
  const inerte = plano && !hoja;

  const { data, isFetching } = useQuery({
    queryKey: ["plan-cuentas", "catalogo", "hijas", cuenta.codigo],
    queryFn: () => planCuentasApi.catalogo({ padre: cuenta.codigo }),
    enabled: abierto && !plano,
    staleTime: 5 * 60_000,
  });

  return (
    <li>
      <button
        type="button"
        disabled={inerte}
        onClick={() => (hoja ? onElegir(cuenta) : setAbierto((a) => !a))}
        aria-expanded={hoja || inerte ? undefined : abierto}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors enabled:hover:bg-accent disabled:cursor-default ${
          cuenta.pertinente ? "" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${(plano ? 0 : profundidad) * 18 + 12}px` }}
      >
        <ChevronRight
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
            hoja || inerte ? "opacity-0" : abierto ? "rotate-90" : ""
          }`}
        />
        <span className="w-20 shrink-0 font-mono text-xs">{cuenta.codigo}</span>
        <span className="min-w-0 flex-1 truncate">{cuenta.nombre}</span>

        {/* Ya hay una cuenta de la empresa anclada acá: agregar otra es legítimo
            —un banco más, otra caja— pero conviene saberlo antes. */}
        {cuenta.ya_en_el_plan && (
          <span className="shrink-0 rounded bg-muted px-1.5 text-[10px]">en tu plan</span>
        )}
        {hoja ? (
          <span className="shrink-0 text-[11px] text-muted-foreground">{cuenta.naturaleza}</span>
        ) : (
          inerte && (
            <span className="shrink-0 text-[11px] text-muted-foreground">agrupa</span>
          )
        )}
      </button>

      {abierto && !plano && (
        <>
          {isFetching && (
            <p className="py-2 pl-12 text-xs text-muted-foreground">
              <Loader2 className="inline size-3 animate-spin" /> Cargando…
            </p>
          )}

          {/* El decreto no numera este nivel. No es una rama vacía por falta de
              datos: es donde la empresa pone las suyas. */}
          {data && data.cuentas.length === 0 && cuenta.rango_libre && (
            <p
              className="flex items-start gap-2 bg-muted/40 py-2 pr-3 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(profundidad + 1) * 18 + 12}px` }}
            >
              <PenLine className="mt-0.5 size-3 shrink-0" />
              <span>
                El decreto no numera este nivel: las cuentas de acá para abajo las creás vos, con
                el código que elijas dentro del rango.
              </span>
            </p>
          )}

          {data && data.cuentas.length > 0 && (
            <div className="border-t border-border">
              <Lista
                cuentas={data.cuentas}
                profundidad={profundidad + 1}
                plano={false}
                onElegir={onElegir}
              />
            </div>
          )}
        </>
      )}
    </li>
  );
}
