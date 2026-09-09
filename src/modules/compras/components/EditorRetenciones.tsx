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
import { CONCEPTOS_RETENCION, type ConceptoRetencion } from "../types/compras.types";

/** Una retención mientras se edita. Base y valor son texto: vacío es "sin llenar". */
export interface RetencionBorrador {
  clave: number;
  concepto: ConceptoRetencion;
  base: string;
  valor: string;
}

export function retencionVacia(
  usados: ReadonlySet<ConceptoRetencion> = new Set(),
): RetencionBorrador {
  const disponible =
    CONCEPTOS_RETENCION.find((c) => !usados.has(c.valor))?.valor ?? "OTROS";
  return {
    clave: Date.now() + Math.random(),
    concepto: disponible,
    base: "",
    valor: "",
  };
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
}: {
  retenciones: RetencionBorrador[];
  onCambiar: (retenciones: RetencionBorrador[]) => void;
}) {
  const actualizar = (clave: number, cambio: Partial<RetencionBorrador>) =>
    onCambiar(
      retenciones.map((r) => (r.clave === clave ? { ...r, ...cambio } : r)),
    );

  const agregar = () =>
    onCambiar([...retenciones, retencionVacia(conceptosUsados)]);
  const quitar = (clave: number) =>
    onCambiar(retenciones.filter((r) => r.clave !== clave));

  const conceptosUsados = new Set(retenciones.map((r) => r.concepto));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Retenciones</p>
        <span className="text-xs text-muted-foreground">Opcional</span>
      </div>

      {retenciones.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Concepto
                </th>
                <th scope="col" className="px-4 py-3">
                  Base
                </th>
                <th scope="col" className="px-4 py-3">
                  Valor retenido
                </th>
                <th scope="col" className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {retenciones.map((r, i) => (
                <tr key={r.clave} className="align-top">
                  <td className="px-4 py-3">
                    <Select
                      value={r.concepto}
                      onValueChange={(v) =>
                        v &&
                        actualizar(r.clave, {
                          concepto: v as ConceptoRetencion,
                        })
                      }
                    >
                      <SelectTrigger className="h-11 w-44 rounded-xl px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONCEPTOS_RETENCION.map((c) => (
                          <SelectItem
                            key={c.valor}
                            value={c.valor}
                            disabled={
                              conceptosUsados.has(c.valor) &&
                              c.valor !== r.concepto
                            }
                          >
                            {c.etiqueta}
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
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={r.valor}
                      onChange={(e) =>
                        actualizar(r.clave, { valor: e.target.value })
                      }
                      placeholder="0"
                      className="h-11 w-32 rounded-xl px-4 text-right font-mono"
                      aria-label={`Valor de la retención ${i + 1}`}
                    />
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        className="h-11 self-start rounded-xl px-4 text-brand-text"
        disabled={conceptosUsados.size >= CONCEPTOS_RETENCION.length}
        onClick={agregar}
      >
        <Plus className="size-4" />
        Agregar retención
      </Button>
    </div>
  );
}
