"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import {
  FormularioMovimiento,
  type DatosMovimiento,
} from "../components/FormularioMovimiento";
import { SelectorProducto } from "../components/SelectorProducto";
import { kardexApi } from "../services/inventario.service";
import { NOMBRE_MOVIMIENTO } from "../types/inventario.types";
import type {
  ProductoResumen,
  TipoMovimiento,
} from "../types/inventario.types";

const TIPOS: TipoMovimiento[] = [
  "ENTRADA_INICIAL",
  "ENTRADA_AJUSTE",
  "SALIDA_AJUSTE",
];
const ID_FORMULARIO = "formulario-movimiento";

/**
 * El kardex. Requiere elegir un producto primero: a diferencia de la
 * bitácora de precios, el backend no ofrece un listado global de
 * movimientos de todos los productos a la vez — cada movimiento vive bajo
 * `/productos/:id/movimientos`.
 *
 * Una vez registrado, un movimiento no se edita ni se anula: se corrige con
 * el contrario. Por eso no hay columna de acciones en esta tabla.
 */
export function KardexSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("INVENTARIO", "DIRECTOR");

  const [producto, setProducto] = useState<ProductoResumen | null>(null);
  const [tipo, setTipo] = useState<TipoMovimiento>("ENTRADA_INICIAL");
  const [abierto, setAbierto] = useState(false);

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ["productos", "movimientos", producto?.id],
    queryFn: () => kardexApi.listar(producto!.id),
    enabled: producto !== null,
  });

  const registrar = useMutation({
    mutationFn: (d: DatosMovimiento) => {
      const id = producto!.id;
      if (tipo === "ENTRADA_INICIAL") return kardexApi.cargaInicial(id, d);
      if (tipo === "ENTRADA_AJUSTE") return kardexApi.entradaAjuste(id, d);
      // La salida no lleva costo: se valora al promedio vigente. Lleva quién
      // asume el faltante, que el formulario ya exigió.
      const { costoUnitario: _costoUnitario, tratamientoFaltante, responsableTerceroId, ...sinCosto } = d;
      return kardexApi.salidaAjuste(id, {
        ...sinCosto,
        tratamientoFaltante: tratamientoFaltante ?? "EMPRESA",
        responsableTerceroId: responsableTerceroId || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["productos", "movimientos", producto?.id],
      });
      aviso.exito("Movimiento registrado");
      setAbierto(false);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const existencia = movimientos?.datos[0]?.saldo_cantidad ?? null;

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Producto
          </span>
          <SelectorProducto valor={producto} onElegir={setProducto} />
        </div>

        <label className="flex min-h-12 min-w-[190px] flex-col justify-center rounded-2xl border border-border bg-card px-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Tipo de movimiento
          </span>
          <Select
            value={tipo}
            onValueChange={(v) => setTipo(v as TipoMovimiento)}
          >
            <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-sm font-semibold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {NOMBRE_MOVIMIENTO[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <Button
          type="button"
          disabled={!producto || !puedeOperar}
          onClick={() => setAbierto(true)}
          className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
        >
          Registrar movimiento
        </Button>
      </section>


      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Movimientos de inventario</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Una vez registrados, los movimientos no se editan ni se anulan. Se
            corrigen con el movimiento contrario.
          </p>
        </div>

        {!producto ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="font-semibold">
              Elija un producto para ver su kardex
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : movimientos && movimientos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {[
                    "Fecha",
                    "Movimiento",
                    "Cantidad",
                    "Costo unitario",
                    "Valor",
                    "Saldo cantidad",
                    "Saldo valor",
                  ].map((x) => (
                    <th key={x} scope="col" className="px-5 py-4">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimientos.datos.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(m.fecha)}
                    </td>
                    <td className="px-5 py-5">
                      <span className="rounded-full border border-border px-3 py-1.5 text-xs">
                        {NOMBRE_MOVIMIENTO[m.tipo]}
                      </span>
                    </td>
                    <td className="px-5 py-5 font-mono">{m.cantidad}</td>
                    <td className="px-5 py-5 font-mono">
                      {formatCOP(Number(m.costo_unitario))}
                    </td>
                    <td className="px-5 py-5 font-mono font-semibold">
                      {formatCOP(Number(m.valor_total))}
                    </td>
                    <td className="px-5 py-5 font-mono font-semibold">
                      {m.saldo_cantidad}
                    </td>
                    <td className="px-5 py-5 font-mono font-semibold">
                      {formatCOP(Number(m.saldo_valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="font-semibold">
              Este producto todavía no tiene movimientos
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Empiece con su carga inicial.
            </p>
          </div>
        )}
      </section>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>
                Registrar {NOMBRE_MOVIMIENTO[tipo].toLowerCase()}
              </DialogTitle>
              <DialogDescription>
                {tipo === "SALIDA_AJUSTE"
                  ? "Se valora al costo promedio vigente, no a uno nuevo."
                  : "Cada movimiento queda fijo: no se edita ni se anula."}
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioMovimiento
              id={ID_FORMULARIO}
              tipo={tipo}
              producto={producto}
              existencia={existencia}
              alGuardar={(d) => registrar.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO}
              className="h-12 rounded-xl px-6"
              disabled={registrar.isPending}
            >
              {registrar.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Registrar movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
