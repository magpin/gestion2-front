"use client";

import { Fragment } from "react";

import { celda } from "../../lib/definicion";
import type { Resultado, Subtotal } from "../../types/armador.types";

/**
 * La tabla del armador: cabecera fija, una fila por grupo con su subtotal, y el
 * total general al pie.
 *
 * **Los subtotales vienen del servidor**, calculados sobre todas las filas: si
 * se muestran cinco mil de cincuenta mil, sumarlos acá mentiría. Esta tabla
 * solo los pone donde van.
 */
export function TablaResultado({
  resultado,
  agrupar,
}: {
  resultado: Resultado;
  /** Las claves de agrupación, en orden. */
  agrupar: string[];
}) {
  const { columnas, filas } = resultado;
  // Solo los grupos que el resultado trae. Mientras llega la vista previa
  // nueva se sigue mostrando la anterior, que puede no tener todavía la
  // columna por la que se acaba de agrupar.
  const indiceGrupo = agrupar
    .map((g) => columnas.findIndex((c) => c.clave === g))
    .filter((i) => i >= 0);
  const alinear = (tipo: string) =>
    tipo === "DINERO" || tipo === "CANTIDAD" ? "text-right font-mono tabular-nums" : "";
  const esCifra = (tipo: string) => tipo === "DINERO" || tipo === "CANTIDAD" || tipo === "FECHA";

  const subtotal = (nivel: number, grupo: (string | null)[]): Subtotal | undefined =>
    resultado.subtotales.find(
      (s) => s.nivel === nivel && s.grupo.slice(0, nivel).every((v, i) => v === grupo[i]),
    );

  /** Una fila de totales: el rótulo en la primera columna y las sumas en las suyas. */
  const filaSumas = (rotulo: string, s: Subtotal | undefined, clase: string, sangria = 0) => (
    <tr className={clase}>
      {columnas.map((c, i) => (
        <td
          key={c.clave}
          className={`px-3 py-2 whitespace-nowrap ${alinear(c.tipo)}`}
          style={i === 0 ? { paddingLeft: 12 + sangria } : undefined}
        >
          {i === 0 ? (
            <span className="font-semibold">
              {rotulo}
              {s && <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">{s.filas} {s.filas === 1 ? "fila" : "filas"}</span>}
            </span>
          ) : c.suma && s ? (
            <span className="font-semibold">{celda(s.sumas[i] ?? null, c.tipo)}</span>
          ) : null}
        </td>
      ))}
    </tr>
  );

  /**
   * Dónde empieza cada grupo, calculado antes de dibujar: un grupo empieza
   * donde cambia su valor o el de su grupo padre.
   */
  const inicios: number[][] = [];
  let anterior: (string | null)[] = [];
  filas.forEach((fila, n) => {
    const grupo = indiceGrupo.map((i) => fila[i] ?? null);
    inicios.push(
      grupo
        .map((_, nivel) => nivel)
        .filter((nivel) => n === 0 || grupo.slice(0, nivel + 1).some((v, i) => v !== anterior[i])),
    );
    anterior = grupo;
  });

  return (
    <div className="min-h-0 grow overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            {columnas.map((c) => (
              <th
                key={c.clave}
                scope="col"
                className={`border-b border-foreground/80 px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap ${
                  c.tipo === "DINERO" || c.tipo === "CANTIDAD" ? "text-right" : ""
                }`}
              >
                {c.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, n) => {
            const grupo = indiceGrupo.map((i) => fila[i] ?? null);
            const cabeceras = inicios[n].map((nivel) => {
              const valor = grupo[nivel];
              const c = columnas[indiceGrupo[nivel]];
              return (
                <Fragment key={`g${nivel}`}>
                  {filaSumas(
                    `${c.etiqueta}: ${valor === null ? "(sin dato)" : celda(valor, c.tipo)}`,
                    subtotal(nivel + 1, grupo),
                    nivel === 0
                      ? "border-t border-border bg-muted"
                      : "border-t border-border bg-muted/40",
                    nivel * 16,
                  )}
                </Fragment>
              );
            });
            return (
              <Fragment key={n}>
                {cabeceras}
                <tr className="border-t border-border/60 hover:bg-muted/50">
                  {fila.map((v, i) => {
                    const c = columnas[i];
                    // Dentro del grupo, su columna ya está dicha en la cabecera.
                    const repetida = indiceGrupo.includes(i);
                    return (
                      <td
                        key={c.clave}
                        className={`px-3 py-1.5 whitespace-nowrap ${alinear(c.tipo)} ${
                          esCifra(c.tipo) && c.tipo === "FECHA" ? "font-mono text-xs" : ""
                        } ${repetida ? "text-muted-foreground/60" : ""}`}
                        style={i === 0 && indiceGrupo.length > 0 ? { paddingLeft: 12 + indiceGrupo.length * 16 } : undefined}
                      >
                        {celda(v, c.tipo)}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
        {resultado.total && columnas.some((c) => c.suma) && (
          <tfoot className="sticky bottom-0 bg-card">
            {filaSumas("Total", resultado.total, "border-t-2 border-foreground")}
          </tfoot>
        )}
      </table>
    </div>
  );
}
