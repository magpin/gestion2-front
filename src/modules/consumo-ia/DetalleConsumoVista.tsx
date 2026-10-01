"use client";

import { Fragment, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  cop,
  ETIQUETA_CATEGORIA,
  miles,
  porcentaje,
  segundos,
  usd,
  type Categoria,
  type DetalleConsumo,
  type FilaDetalle,
  type OrdenDetalle,
} from "./consumo";

const CATEGORIAS = Object.keys(ETIQUETA_CATEGORIA) as Categoria[];

/** El nombre corto de cada categoría, para la columna de la tabla. */
const CORTA: Record<Categoria, string> = {
  AYUDA: "Ayuda",
  CONSULTA: "Consulta",
  PROPUESTA: "Propuesta",
  LECTURA: "Lectura",
};

const COLOR: Record<Categoria, string> = {
  AYUDA: "var(--chart-1)",
  CONSULTA: "var(--chart-2)",
  PROPUESTA: "var(--chart-3)",
  LECTURA: "var(--chart-4)",
};

export interface FiltroVistaDetalle {
  categoria: Categoria | null;
  orden: OrdenDetalle;
  pagina: number;
}

/**
 * El detalle del gasto: en qué se fue la plata, por categoría y por
 * herramienta, y cada llamada al modelo con su costo desarmado. Recibe los
 * datos ya pedidos; el filtro lo guarda quien la usa.
 *
 * **Solo cifras.** «En qué» son los nombres de las herramientas que usó la
 * respuesta, o el tipo de documento: nunca lo que se preguntó.
 */
export function DetalleConsumoVista({
  datos,
  tasa,
  filtro,
  alCambiar,
}: {
  datos: DetalleConsumo;
  tasa: number;
  filtro: FiltroVistaDetalle;
  alCambiar: (filtro: FiltroVistaDetalle) => void;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {datos.truncado && (
        <p
          role="alert"
          className="m-0 rounded-md bg-warning/10 px-4 py-2 text-sm text-warning"
        >
          El período tiene más de 100.000 registros y se cortó: las cifras están
          incompletas. Elija un rango más corto.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── En qué se gastó ── */}
        <Card>
          <CardHeader>
            <CardTitle>En qué se gastó</CardTitle>
            <CardDescription>
              Cada llamada al modelo, según para qué fue. Una respuesta que
              propuso un cobro cuenta como propuesta aunque también haya
              consultado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {datos.porCategoria.map((c) => (
              <div key={c.categoria} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{c.etiqueta}</span>
                  <span className="tabular-nums">
                    <span className="font-medium">{usd(c.costoUsd)}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {porcentaje(c.participacion)} · {miles(c.llamadas)}{" "}
                      {c.llamadas === 1 ? "llamada" : "llamadas"}
                    </span>
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.participacion * 100}%`,
                      background: COLOR[c.categoria],
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Por herramienta ── */}
        <Card>
          <CardHeader>
            <CardTitle>Qué consultas pesan más</CardTitle>
            <CardDescription>
              El costo de las respuestas que usaron cada herramienta. Una
              respuesta que usó dos cuenta en las dos, así que no suman el
              total.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Herramienta</th>
                  <th className="py-2 text-right font-medium">Respuestas</th>
                  <th className="py-2 text-right font-medium">Veces</th>
                  <th className="py-2 text-right font-medium">Costo</th>
                </tr>
              </thead>
              <tbody>
                {datos.porHerramienta.map((h) => (
                  <tr key={h.herramienta} className="border-t border-muted">
                    <td className="py-2">{h.etiqueta}</td>
                    <td className="py-2 text-right tabular-nums">
                      {miles(h.respuestas)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {miles(h.veces)}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {usd(h.costoUsd)}
                    </td>
                  </tr>
                ))}
                {datos.porHerramienta.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-muted-foreground"
                    >
                      Ninguna respuesta consultó datos en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ── Cada llamada ── */}
      <Card>
        <CardHeader>
          <CardTitle>Cada llamada</CardTitle>
          <CardDescription>
            {miles(datos.total)} {datos.total === 1 ? "llamada" : "llamadas"}{" "}
            por {usd(datos.totalUsd)} ({cop(datos.totalUsd, tasa)}). Pulse una
            fila para ver el costo desarmado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="radiogroup"
              aria-label="Categoría"
              className="flex flex-wrap gap-1.5"
            >
              {[null, ...CATEGORIAS].map((c) => (
                <Opcion
                  key={c ?? "TODAS"}
                  activa={filtro.categoria === c}
                  onClick={() =>
                    alCambiar({ ...filtro, categoria: c, pagina: 1 })
                  }
                >
                  {c === null ? "Todas" : CORTA[c]}
                </Opcion>
              ))}
            </div>
            <div role="radiogroup" aria-label="Orden" className="flex gap-1.5">
              <Opcion
                activa={filtro.orden === "FECHA"}
                onClick={() =>
                  alCambiar({ ...filtro, orden: "FECHA", pagina: 1 })
                }
              >
                Más recientes
              </Opcion>
              <Opcion
                activa={filtro.orden === "COSTO"}
                onClick={() =>
                  alCambiar({ ...filtro, orden: "COSTO", pagina: 1 })
                }
              >
                Más caras
              </Opcion>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Empresa</th>
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 font-medium">En qué</th>
                  <th className="py-2 font-medium">Modelo</th>
                  <th className="py-2 text-right font-medium">Tokens</th>
                  <th className="py-2 text-right font-medium">Tiempo</th>
                  <th className="py-2 text-right font-medium">Costo</th>
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((f) => (
                  <Fragment key={`${f.categoria}-${f.id}`}>
                    <tr
                      className="cursor-pointer border-t border-muted hover:bg-muted/50"
                      tabIndex={0}
                      aria-expanded={abierta === f.id}
                      onClick={() => setAbierta(abierta === f.id ? null : f.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setAbierta(abierta === f.id ? null : f.id);
                        }
                      }}
                    >
                      <td className="py-2 whitespace-nowrap tabular-nums">
                        {fechaHora(f.fecha)}
                      </td>
                      <td className="py-2">{f.empresa}</td>
                      <td className="py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ background: COLOR[f.categoria] }}
                          />
                          {CORTA[f.categoria]}
                        </span>
                      </td>
                      <td className="py-2">{f.enQue}</td>
                      <td className="py-2 font-mono text-xs">
                        {modeloCorto(f.modelo)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {f.tokens === null ? "—" : miles(totalTokens(f))}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {segundos(f.duracionMs)}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {f.costo === null ? "sin medir" : usd(f.costo.total)}
                      </td>
                    </tr>
                    {abierta === f.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={8} className="px-3 py-3">
                          <Desglose fila={f} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {datos.filas.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No hay llamadas con este filtro en el período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {datos.paginas > 1 && (
            <nav
              aria-label="Páginas"
              className="flex items-center justify-end gap-3 text-sm"
            >
              <span className="text-muted-foreground tabular-nums">
                Página {datos.pagina} de {datos.paginas}
              </span>
              <BotonPagina
                deshabilitado={datos.pagina <= 1}
                onClick={() =>
                  alCambiar({ ...filtro, pagina: datos.pagina - 1 })
                }
              >
                Anterior
              </BotonPagina>
              <BotonPagina
                deshabilitado={datos.pagina >= datos.paginas}
                onClick={() =>
                  alCambiar({ ...filtro, pagina: datos.pagina + 1 })
                }
              >
                Siguiente
              </BotonPagina>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** El costo de una llamada partido por clase de token, y lo que consultó. */
function Desglose({ fila }: { fila: FilaDetalle }) {
  if (fila.tokens === null || fila.costo === null) {
    return (
      <p className="m-0 text-xs text-muted-foreground">
        Esta lectura es de antes de que se midiera el consumo: no tiene tokens
        ni costo.
      </p>
    );
  }
  const t = fila.tokens;
  const c = fila.costo;
  const partes = [
    { nombre: "Entrada nueva", tokens: t.entrada, costo: c.entrada },
    { nombre: "Caché leído", tokens: t.cacheLeido, costo: c.cacheLeido },
    { nombre: "Caché escrito", tokens: t.cacheEscrito, costo: c.cacheEscrito },
    {
      nombre: "Salida (con el razonamiento)",
      tokens: t.salida,
      costo: c.salida,
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 font-medium">Tokens</th>
            <th className="py-1 text-right font-medium">Cantidad</th>
            <th className="py-1 text-right font-medium">Costo</th>
            <th className="py-1 text-right font-medium">Del total</th>
          </tr>
        </thead>
        <tbody>
          {partes.map((p) => (
            <tr key={p.nombre} className="border-t border-muted">
              <td className="py-1">{p.nombre}</td>
              <td className="py-1 text-right tabular-nums">
                {miles(p.tokens)}
              </td>
              <td className="py-1 text-right tabular-nums">{usd(p.costo)}</td>
              <td className="py-1 text-right tabular-nums">
                {c.total === 0 ? "—" : porcentaje(p.costo / c.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="m-0 grid grid-cols-2 content-start gap-x-6 gap-y-2 text-xs">
        <Dato nombre="Estado" valor={fila.estado} />
        <Dato nombre="Modelo" valor={fila.modelo ?? "—"} />
        {fila.categoria !== "LECTURA" && (
          <Dato
            nombre="Vueltas al modelo"
            valor={fila.vueltas === null ? "—" : String(fila.vueltas)}
          />
        )}
        {fila.herramientas.length > 0 && (
          <Dato
            nombre="Consultó"
            valor={fila.herramientas
              .map((h) =>
                h.veces > 1 ? `${h.etiqueta} ×${h.veces}` : h.etiqueta,
              )
              .join(", ")}
          />
        )}
      </dl>
    </div>
  );
}

function Opcion({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={`h-8 rounded-md border px-3 text-[13px] ${
        activa
          ? "border-foreground bg-muted font-medium"
          : "border-input bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function BotonPagina({
  deshabilitado,
  onClick,
  children,
}: {
  deshabilitado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={deshabilitado}
      onClick={onClick}
      className="h-8 rounded-md border border-input bg-card px-3 text-[13px] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{nombre}</dt>
      <dd className="m-0 font-medium">{valor}</dd>
    </div>
  );
}

const totalTokens = (f: FilaDetalle): number =>
  f.tokens === null
    ? 0
    : f.tokens.entrada +
      f.tokens.cacheLeido +
      f.tokens.cacheEscrito +
      f.tokens.salida;

/** «claude-opus-5» → «opus-5». */
const modeloCorto = (m: string | null): string =>
  m === null ? "—" : m.replace(/^claude-/, "");

/** La hora de Colombia, `aaaa-mm-dd hh:mm`. */
function fechaHora(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t - 5 * 3_600_000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}
