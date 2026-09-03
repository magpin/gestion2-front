"use client";

import { useId, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { cn, formatCOP } from "@/lib/utils";
import type { CuentaLookup } from "@/modules/dashboard/lookups/types";
import { useBuscarCuentas } from "@/modules/dashboard/lookups/useLookups";
import type { LineaAsientoPayload } from "../types/asientos.types";

export interface LineaEditable extends LineaAsientoPayload {
  key: string;
  cuentaCodigo: string;
  cuentaNombre: string;
}

interface LineasAsientoEditorProps {
  lineas: LineaEditable[];
  onChange: (lineas: LineaEditable[]) => void;
}

const inputSelect =
  "h-9 w-full rounded-lg border border-border bg-muted px-2 text-sm text-foreground outline-none focus:border-primary";

export function LineasAsientoEditor({ lineas, onChange }: LineasAsientoEditorProps) {
  const idBase = useId();
  // Reason: contador monotónico → keys estables aunque se agregue/quite/reagregue la misma cuenta.
  const contadorRef = useRef(0);
  const [cuentaQuery, setCuentaQuery] = useState("");
  const [cuenta, setCuenta] = useState<CuentaLookup | null>(null);
  const [lado, setLado] = useState<"debito" | "credito">("debito");
  const [valor, setValor] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const { data: cuentasRaw = [], isFetching } = useBuscarCuentas(cuentaQuery);
  // Reason: solo las cuentas transaccionales (nivel 6) admiten movimientos.
  const cuentas = cuentasRaw.filter((c) => c.transaccional);

  const totalDebitos = lineas.reduce((suma, linea) => suma + linea.debito, 0);
  const totalCreditos = lineas.reduce((suma, linea) => suma + linea.credito, 0);
  // Reason: comparar en centavos (enteros) evita falsos descuadres por aritmética IEEE-754.
  const balanceado = asientoBalanceado(lineas);

  const valorNum = Number(valor);
  const lineaInvalida = !cuenta || !(valorNum > 0);

  const agregar = () => {
    if (!cuenta || !(valorNum > 0)) {
      return;
    }
    const nueva: LineaEditable = {
      key: `${idBase}-${contadorRef.current++}`,
      cuentaId: cuenta.id,
      cuentaCodigo: cuenta.codigo,
      cuentaNombre: cuenta.nombre,
      debito: lado === "debito" ? valorNum : 0,
      credito: lado === "credito" ? valorNum : 0,
      ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
    };
    onChange([...lineas, nueva]);
    setCuenta(null);
    setCuentaQuery("");
    setValor("");
    setDescripcion("");
  };

  const quitar = (key: string) => onChange(lineas.filter((linea) => linea.key !== key));

  return (
    <div className="space-y-4">
      {lineas.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground/70">
                <th className="px-3 py-2 text-left font-medium">Cuenta</th>
                <th className="px-3 py-2 text-right font-medium">Débito</th>
                <th className="px-3 py-2 text-right font-medium">Crédito</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.key} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <p className="text-foreground">
                      <span className="font-mono text-xs text-muted-foreground/70">
                        {linea.cuentaCodigo}
                      </span>{" "}
                      {linea.cuentaNombre}
                    </p>
                    {linea.descripcion && (
                      <p className="text-xs text-muted-foreground/70">{linea.descripcion}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {linea.debito > 0 ? formatCOP(linea.debito) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {linea.credito > 0 ? formatCOP(linea.credito) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      aria-label="Quitar línea"
                      onClick={() => quitar(linea.key)}
                      className="rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-sm font-medium">
                <td className="px-3 py-2 text-muted-foreground">Totales</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatCOP(totalDebitos)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatCOP(totalCreditos)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-xs",
          balanceado
            ? "border-success/30 bg-success/10 text-success dark:text-success"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        {lineas.length < 2
          ? "Agrega al menos 2 líneas."
          : balanceado
            ? "Partida doble balanceada ✓"
            : `Descuadre: ${formatCOP(Math.abs(totalDebitos - totalCreditos))}`}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <span className="mb-1 block text-xs text-muted-foreground">Cuenta</span>
          <SearchPicker<CuentaLookup>
            query={cuentaQuery}
            onQueryChange={setCuentaQuery}
            items={cuentas}
            isLoading={isFetching}
            getKey={(item) => item.id}
            renderItem={(item) => (
              <span className="flex flex-col">
                <span className="truncate">
                  <span className="font-mono text-xs text-muted-foreground/70">
                    {item.codigo}
                  </span>{" "}
                  {item.nombre}
                </span>
              </span>
            )}
            onSelect={(item) => setCuenta(item)}
            placeholder="Buscar cuenta transaccional…"
            etiquetaSeleccion={cuenta ? `${cuenta.codigo} · ${cuenta.nombre}` : null}
            onLimpiar={() => setCuenta(null)}
          />
        </div>
        <div className="md:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">Lado</span>
          <select
            value={lado}
            onChange={(evento) => setLado(evento.target.value as "debito" | "credito")}
            className={inputSelect}
          >
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">Valor</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <span className="mb-1 block text-xs text-muted-foreground">
            Descripción (opcional)
          </span>
          <Input
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={lineaInvalida}
          onClick={agregar}
        >
          <Plus size={14} strokeWidth={2} />
          Agregar línea
        </Button>
      </div>
    </div>
  );
}

// Reason: cálculo puro reutilizado por el padre; compara en centavos (enteros) para no
// fallar por la aritmética de punto flotante (p.ej. 100.10 + 200.20 !== 300.30 en IEEE-754).
export function asientoBalanceado(lineas: LineaEditable[]): boolean {
  const deb = Math.round(lineas.reduce((suma, linea) => suma + linea.debito, 0) * 100);
  const cred = Math.round(lineas.reduce((suma, linea) => suma + linea.credito, 0) * 100);
  return lineas.length >= 2 && deb === cred && deb > 0;
}
