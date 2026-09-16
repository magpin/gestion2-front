"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

import { formatCOP } from "@/lib/utils";
import { retencionesApi } from "@/modules/retenciones/services/retenciones.service";

/**
 * Una retención mientras se edita. La base es texto —vacío es "sin llenar"— y
 * el valor **ya no se digita**: lo calcula el servidor con la tarifa y la base
 * mínima del catálogo del año.
 */
export interface RetencionBorrador {
  clave: number;
  conceptoId: string;
  base: string;
}

export function retencionVacia(): RetencionBorrador {
  return { clave: Date.now() + Math.random(), conceptoId: "", base: "" };
}

/**
 * Las retenciones practicadas sobre la compra, opcionales — base y valor
 * son manuales: el backend no calcula tarifas ni bases mínimas en UVT (ver
 * `docs/planes/compras-backend.md`, decisión 5). Cada certificado de
 * retención real trae los dos datos; acá se digitan tal cual.
 */
export function EditorRetenciones({
  retenciones,
  onCambiar,
  /** La del documento: decide qué catálogo rige y con qué UVT se compara. */
  fecha,
  /** Del proveedor: decide la tarifa en los conceptos que tienen dos. */
  declaranteRenta = true,
}: {
  retenciones: RetencionBorrador[];
  onCambiar: (retenciones: RetencionBorrador[]) => void;
  fecha: string;
  declaranteRenta?: boolean;
}) {
  const anio = Number(fecha.slice(0, 4));

  const { data: conceptos = [] } = useQuery({
    queryKey: ["retenciones", "conceptos", anio],
    queryFn: () => retencionesApi.conceptos(anio),
  });
  const { data: uvts = [] } = useQuery({
    queryKey: ["retenciones", "uvt"],
    queryFn: retencionesApi.uvt,
  });

  const activos = conceptos.filter((c) => c.activo);
  const uvt = Number(uvts.find((u) => u.anio === anio)?.valor ?? 0);

  const actualizar = (clave: number, cambio: Partial<RetencionBorrador>) =>
    onCambiar(
      retenciones.map((r) => (r.clave === clave ? { ...r, ...cambio } : r)),
    );

  const agregar = () => onCambiar([...retenciones, retencionVacia()]);
  const quitar = (clave: number) =>
    onCambiar(retenciones.filter((r) => r.clave !== clave));

  const usados = new Set(retenciones.map((r) => r.conceptoId));

  /**
   * Lo que el servidor va a calcular, calculado acá para que se vea antes de
   * guardar. No es la verdad —esa la dice el backend con el catálogo en la
   * mano— pero es la misma cuenta: si la base no llega al mínimo, no retiene.
   */
  const previsualizar = (r: RetencionBorrador) => {
    const concepto = activos.find((c) => c.id === r.conceptoId);
    const base = Number(r.base);
    if (concepto === undefined || !(base > 0)) return null;

    const tarifa =
      declaranteRenta || concepto.tarifa_no_declarante === null
        ? Number(concepto.tarifa)
        : Number(concepto.tarifa_no_declarante);
    const minimo = Number(concepto.base_minima_uvt) * uvt;
    if (minimo > 0 && base < minimo) {
      return { retiene: false as const, minimo };
    }
    return {
      retiene: true as const,
      valor: Math.round((base * tarifa) / 100),
      tarifa,
    };
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Retenciones</p>
        <span className="text-xs text-muted-foreground">Opcional</span>
      </div>

      {/* Sin catálogo del año no hay nada que elegir, y explicarlo acá evita
          que alguien crea que el sistema "no tiene retenciones". */}
      {activos.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          No hay conceptos cargados para {anio}. Se cargan en Contabilidad →
          Retenciones, con la tarifa y la base mínima que rigen ese año.
        </p>
      ) : (
        <>
          {retenciones.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[620px] text-left">
                <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Concepto
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Base
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Se retiene
                    </th>
                    <th scope="col" className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {retenciones.map((r, i) => {
                    const previo = previsualizar(r);
                    return (
                      <tr key={r.clave} className="align-top">
                        <td className="px-4 py-3">
                          <Select
                            value={r.conceptoId || undefined}
                            onValueChange={(v) =>
                              v && actualizar(r.clave, { conceptoId: v })
                            }
                          >
                            <SelectTrigger className="h-11 w-56 rounded-xl px-4">
                              <SelectValue placeholder="Elegí el concepto" />
                            </SelectTrigger>
                            <SelectContent>
                              {activos.map((c) => (
                                <SelectItem
                                  key={c.id}
                                  value={c.id}
                                  disabled={
                                    usados.has(c.id) && c.id !== r.conceptoId
                                  }
                                >
                                  {c.nombre} · {Number(c.tarifa)}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0.01"
                            step="any"
                            value={r.base}
                            onChange={(e) =>
                              actualizar(r.clave, { base: e.target.value })
                            }
                            placeholder="0"
                            className="h-11 w-32 rounded-xl px-4 text-right font-mono"
                            aria-label={`Base de la retención ${i + 1}`}
                          />
                        </td>
                        {/* El valor no se digita: lo calcula el servidor. Acá
                            se muestra para que no haya sorpresas al guardar. */}
                        <td className="px-4 py-3 text-right">
                          {previo === null ? (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          ) : previo.retiene ? (
                            <>
                              <span className="block font-mono text-sm font-semibold">
                                {formatCOP(previo.valor)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {previo.tarifa}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-warning">
                              no llega al mínimo ({formatCOP(previo.minimo)})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Quitar la retención ${i + 1}`}
                            className="text-muted-foreground hover:text-danger"
                            onClick={() => quitar(r.clave)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            className="h-11 self-start rounded-xl px-4 text-brand-text"
            disabled={usados.size >= activos.length}
            onClick={agregar}
          >
            <Plus className="size-4" />
            Agregar retención
          </Button>
        </>
      )}
    </div>
  );
}
