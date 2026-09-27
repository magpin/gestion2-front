"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";

import { hoyEnColombia } from "@/lib/utils";
import {
  ErrorTablero,
  ETIQUETA_PERIODO,
  pedirDetalle,
  pedirTablero,
  rangoDe,
  type Periodo,
} from "./consumo";
import {
  DetalleConsumoVista,
  type FiltroVistaDetalle,
} from "./DetalleConsumoVista";
import { TableroConsumoVista } from "./TableroConsumoVista";

/** Las dos partes del tablero: el resumen y el detalle de cada llamada. */
type Seccion = "RESUMEN" | "DETALLE";

const LLAVE_SESION = "consumo-ia-clave";

const leerClave = (): string => {
  try {
    return sessionStorage.getItem(LLAVE_SESION) ?? "";
  } catch {
    return "";
  }
};

/** `true` solo en el navegador, después de hidratar: la clave vive ahí. */
const useEnElNavegador = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/**
 * El tablero de consumo de la IA (`docs/planes/consumo-ia.md`): **aparte del
 * sistema**, sin menú ni sesión de empresa, y privado.
 *
 * La clave se escribe una vez y queda en `sessionStorage`: se pierde al
 * cerrar la pestaña. Va en una cabecera, nunca en la URL. Si el servidor la
 * rechaza, se borra y se vuelve a pedir.
 */
export function ConsumoIaView() {
  const enElNavegador = useEnElNavegador();
  const [clave, setClave] = useState<string | null>(null);
  const claveActual = clave ?? (enElNavegador ? leerClave() : "");
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [tasa, setTasa] = useState("4000");
  const [seccion, setSeccion] = useState<Seccion>("RESUMEN");
  const [filtroDetalle, setFiltroDetalle] = useState<FiltroVistaDetalle>({
    categoria: null,
    orden: "FECHA",
    pagina: 1,
  });
  const { desde, hasta } = rangoDe(periodo, hoyEnColombia());

  // El resumen se pide siempre: trae la lista de empresas del filtro.
  const consulta = useQuery({
    queryKey: ["consumo-ia", claveActual, desde, hasta, empresaId],
    queryFn: () => pedirTablero(claveActual, { desde, hasta, empresaId }),
    enabled: claveActual !== "",
    retry: false,
    // Los errores de esta página los dice la página —una clave errada vuelve a
    // pedirla—: el aviso general de «no se pudo conectar» no corresponde.
    meta: { silencioso: true },
  });

  const detalle = useQuery({
    queryKey: [
      "consumo-ia",
      "detalle",
      claveActual,
      desde,
      hasta,
      empresaId,
      filtroDetalle,
    ],
    queryFn: () =>
      pedirDetalle(claveActual, { desde, hasta, empresaId, ...filtroDetalle }),
    enabled: claveActual !== "" && seccion === "DETALLE",
    retry: false,
    placeholderData: (anterior) => anterior,
    meta: { silencioso: true },
  });

  // Otro período u otra empresa: el detalle vuelve a la primera página.
  const cambiarPeriodo = (p: Periodo) => {
    setPeriodo(p);
    setFiltroDetalle((f) => ({ ...f, pagina: 1 }));
  };
  const cambiarEmpresa = (id: string | null) => {
    setEmpresaId(id);
    setFiltroDetalle((f) => ({ ...f, pagina: 1 }));
  };

  const guardarClave = (nueva: string) => {
    try {
      if (nueva === "") sessionStorage.removeItem(LLAVE_SESION);
      else sessionStorage.setItem(LLAVE_SESION, nueva);
    } catch {
      // Sin sessionStorage la clave vive solo en esta pantalla.
    }
    setClave(nueva);
  };

  const rechazada = [consulta.error, detalle.error].some(
    (e) => e instanceof ErrorTablero && e.estado === 401,
  );

  if (!enElNavegador) return null;

  if (claveActual === "" || rechazada) {
    return (
      <Entrada
        error={rechazada ? "La clave no es correcta." : null}
        alEntrar={(c) => guardarClave(c)}
      />
    );
  }

  const tasaNumero = Number(tasa.replace(/\./g, "").replace(",", ".")) || 0;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-xl font-semibold">Consumo de la IA</h1>
          <p className="m-0 text-sm text-muted-foreground">
            Cuánto cuesta, en qué se va y con qué eficiencia. Solo cifras: nada
            de lo conversado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => guardarClave("")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Salir
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div
          role="radiogroup"
          aria-label="Período"
          className="flex flex-wrap gap-1.5"
        >
          {(Object.keys(ETIQUETA_PERIODO) as Periodo[]).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={periodo === p}
              onClick={() => cambiarPeriodo(p)}
              className={`h-8 rounded-md border px-3 text-[13px] ${
                periodo === p
                  ? "border-foreground bg-muted font-medium"
                  : "border-input bg-card"
              }`}
            >
              {ETIQUETA_PERIODO[p]}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Empresa
          <select
            value={empresaId ?? ""}
            onChange={(e) =>
              cambiarEmpresa(e.target.value === "" ? null : e.target.value)
            }
            className="h-8 rounded-md border border-input bg-card px-2 text-[13px] text-foreground"
          >
            <option value="">Todas</option>
            {(consulta.data?.empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Pesos por dólar
          <input
            inputMode="decimal"
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            className="h-8 w-24 rounded-md border border-input bg-card px-2 text-right text-[13px] text-foreground tabular-nums"
          />
        </label>
      </div>

      <div
        role="tablist"
        aria-label="Sección"
        className="flex gap-4 border-b border-border"
      >
        {(
          [
            ["RESUMEN", "Resumen"],
            ["DETALLE", "Detalle del gasto"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={seccion === valor}
            onClick={() => setSeccion(valor)}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm ${
              seccion === valor
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {seccion === "RESUMEN" && (
        <>
          {consulta.isPending && (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          )}
          {consulta.error !== null && !rechazada && (
            <p role="alert" className="text-sm text-warning">
              {consulta.error.message}
            </p>
          )}
          {consulta.data !== undefined && (
            <TableroConsumoVista datos={consulta.data} tasa={tasaNumero} />
          )}
        </>
      )}

      {seccion === "DETALLE" && (
        <>
          {detalle.isPending && (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          )}
          {detalle.error !== null && !rechazada && (
            <p role="alert" className="text-sm text-warning">
              {detalle.error.message}
            </p>
          )}
          {detalle.data !== undefined && (
            <DetalleConsumoVista
              datos={detalle.data}
              tasa={tasaNumero}
              filtro={filtroDetalle}
              alCambiar={setFiltroDetalle}
            />
          )}
        </>
      )}
    </main>
  );
}

function Entrada({
  error,
  alEntrar,
}: {
  error: string | null;
  alEntrar: (clave: string) => void;
}) {
  const [valor, setValor] = useState("");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valor.trim() !== "") alEntrar(valor.trim());
        }}
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-6"
      >
        <h1 className="m-0 text-lg font-semibold">Consumo de la IA</h1>
        <p className="m-0 text-sm text-muted-foreground">
          Página privada. Escribí la clave del tablero (
          <code className="text-xs">CLAVE_CONSUMO_IA</code>).
        </p>
        <input
          type="password"
          aria-label="Clave del tablero"
          autoComplete="off"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
        />
        {error !== null && (
          <p role="alert" className="m-0 text-sm text-warning">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="h-9 rounded-md bg-primary text-sm font-medium text-primary-foreground"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
