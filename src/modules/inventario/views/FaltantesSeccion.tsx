"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PackageX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCOP, formatFecha } from "@/lib/utils";
import { faltantesApi } from "../services/inventario.service";

/**
 * Lo que se vendió sin tener: la lista de qué hay que comprar.
 *
 * Cada fila la dejó una factura que alguien confirmó en descubierto. No es una
 * orden de compra —no numera, no tiene estado y nadie la cierra—: es el rastro
 * de por qué el kardex de un producto quedó en rojo, y lo que hay que reponer
 * para que vuelva a cuadrar. Cuando la compra entra, el saldo del producto
 * vuelve a positivo y la fila deja de estar pendiente.
 */
export function FaltantesSeccion() {
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [pagina, setPagina] = useState(1);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["faltantes", soloPendientes, pagina],
    queryFn: () => faltantesApi.listar({ soloPendientes, pagina }),
  });

  const faltantes = resultado?.datos ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <label className="mb-5 flex w-fit items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium">
        <Checkbox
          checked={soloPendientes}
          onCheckedChange={(marcado) => {
            setSoloPendientes(marcado === true);
            setPagina(1);
          }}
        />
        Solo los que siguen en rojo
      </label>

      {faltantes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <PackageX className="size-6" />
          </span>
          <p className="text-lg font-semibold">
            {soloPendientes
              ? "Nada pendiente de comprar"
              : "Nunca se facturó sin existencia"}
          </p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Aquí aparece lo que salió sin estar en bodega, con la factura que lo
            sacó. Se anota cuando alguien confirma una factura sin existencia.
          </p>
        </div>
      ) : (
        <section className="overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-4">
                  Producto
                </th>
                <th scope="col" className="px-5 py-4">
                  Faltaron
                </th>
                <th scope="col" className="px-5 py-4">
                  Existencia hoy
                </th>
                <th scope="col" className="px-5 py-4">
                  Costo de referencia
                </th>
                <th scope="col" className="px-5 py-4">
                  Factura
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {faltantes.map((f) => {
                const saldo = Number(f.saldo_actual);
                return (
                  <tr key={f.id}>
                    <td className="px-5 py-5">
                      <span className="block font-mono text-xs text-muted-foreground">
                        {f.producto_codigo}
                      </span>
                      <span className="block text-sm font-medium">
                        {f.producto_nombre}
                      </span>
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
                      {Number(f.cantidad_faltante)}
                    </td>
                    <td className="px-5 py-5">
                      {saldo < 0 ? (
                        <Badge variant="destructive" className="font-mono">
                          {saldo}
                        </Badge>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {saldo}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-5 font-mono text-sm">
                      {formatCOP(Number(f.costo_referencia))}
                    </td>
                    <td className="px-5 py-5 text-sm">
                      <span className="block font-mono font-semibold">
                        {f.documento}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatFecha(f.fecha)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Paginación mínima, igual que el resto del módulo. */}
      {(resultado?.total ?? 0) > faltantes.length && (
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={pagina === 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {pagina}</span>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={faltantes.length < 50}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </>
  );
}
