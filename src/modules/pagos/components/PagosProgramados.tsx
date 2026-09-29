"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
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
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP } from "@/lib/utils";
import { SelectorProveedor } from "@/modules/compras/components/SelectorProveedor";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
import type { Concepto } from "@/modules/conceptos/types/conceptos.types";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { pagosApi } from "../services/pagos.service";
import type { PagoProgramado, Recurrencia } from "../types/pagos.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Lo que hay que pagar y todavía no tiene factura: el arriendo de cada mes,
 * la cuota del préstamo, la nómina. Es un recordatorio: marcarlo pagado no
 * mueve plata (eso lo hace el comprobante o el pago sin factura); un mensual
 * crea solo el del mes siguiente.
 */
export function PagosProgramados({
  puedeProgramar,
  puedePagar,
  nuevo,
  onCerrarNuevo,
}: {
  puedeProgramar: boolean;
  puedePagar: boolean;
  nuevo: boolean;
  onCerrarNuevo: () => void;
}) {
  const queryClient = useQueryClient();
  const [todos, setTodos] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["pagos", "programados", todos],
    queryFn: () => pagosApi.programados(todos),
  });

  const cambiar = useMutation({
    mutationFn: ({ p, accion }: { p: PagoProgramado; accion: "pagado" | "cancelar" }) =>
      accion === "pagado" ? pagosApi.marcarPagado(p.id) : pagosApi.cancelarProgramado(p.id),
    onSuccess: async (_, { p, accion }) => {
      await queryClient.invalidateQueries({ queryKey: ["pagos", "programados"] });
      aviso.exito(
        accion === "pagado" ? "Marcado como pagado" : "Pago cancelado",
        accion === "pagado" && p.recurrencia === "MENSUAL" ? "Quedó programado el del mes siguiente." : undefined,
      );
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const vencido = (fecha: string) => fecha < hoy();

  return (
    <>
      <div className="mb-4 flex justify-end">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} className="size-4 accent-primary" />
          Ver también los pagados y cancelados
        </label>
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : data.length === 0 ? (
        <EmptyState
          titulo="Nada programado"
          descripcion="Programá lo que se paga cada mes o en una fecha, para que no se pase."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Qué</th>
                <th className="px-5 py-3">A quién</th>
                <th className="px-5 py-3">Cada</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className={cn("border-t border-border", p.estado !== "PENDIENTE" && "text-muted-foreground")}>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {p.estado === "PENDIENTE" && vencido(p.fecha) ? (
                      <span className="rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-medium">
                        {p.fecha}
                      </span>
                    ) : (
                      p.fecha
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold">{p.descripcion}</span>
                    {p.conceptoNombre && <p className="text-xs text-muted-foreground">{p.conceptoNombre}</p>}
                    {p.estado !== "PENDIENTE" && (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
                        {p.estado === "PAGADO" ? "Pagado" : "Cancelado"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">{p.terceroNombre ?? "—"}</td>
                  <td className="px-5 py-3">{p.recurrencia === "MENSUAL" ? "Mes" : "Una vez"}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                    {formatCOP(p.valor)}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {p.estado === "PENDIENTE" && (
                      <div className="inline-flex gap-2">
                        {puedePagar && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-lg px-3"
                            disabled={cambiar.isPending}
                            onClick={() => cambiar.mutate({ p, accion: "pagado" })}
                          >
                            Ya se pagó
                          </Button>
                        )}
                        {puedeProgramar && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 rounded-lg px-3"
                            disabled={cambiar.isPending}
                            onClick={() => cambiar.mutate({ p, accion: "cancelar" })}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={nuevo} onOpenChange={(a) => !a && onCerrarNuevo()}>
        <DialogContent>{nuevo && <FormularioProgramado onCerrar={onCerrarNuevo} />}</DialogContent>
      </Dialog>
    </>
  );
}

function FormularioProgramado({ onCerrar }: { onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [descripcion, setDescripcion] = useState("");
  const [proveedor, setProveedor] = useState<TerceroResumen | null>(null);
  const [concepto, setConcepto] = useState<Concepto | null>(null);
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [recurrencia, setRecurrencia] = useState<Recurrencia>("MENSUAL");

  const problema =
    descripcion.trim().length < 3
      ? "Escribí qué se paga."
      : !(Number(valor) > 0)
        ? "Escribí el valor."
        : fecha === ""
          ? "Elegí la fecha."
          : null;

  const crear = useMutation({
    mutationFn: () =>
      pagosApi.crearProgramado({
        descripcion: descripcion.trim(),
        terceroId: proveedor?.id,
        conceptoId: concepto?.id,
        valor: Number(valor),
        fecha,
        recurrencia,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pagos", "programados"] });
      aviso.exito("Pago programado");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Programar un pago</DialogTitle>
          <DialogDescription>Un recordatorio: no mueve plata hasta que se paga.</DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <Campo id="programado-descripcion" etiqueta="Qué se paga">
          <Input
            id="programado-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Arriendo del local"
            maxLength={200}
            className="h-11 rounded-xl px-4"
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="programado-proveedor" etiqueta="A quién (opcional)">
            <SelectorProveedor valor={proveedor} onElegir={setProveedor} />
          </Campo>
          <Campo id="programado-concepto" etiqueta="Concepto (opcional)">
            <SelectorConcepto valor={concepto} onElegir={setConcepto} tipos={["GASTO", "COSTO", "NO_GASTO"]} />
          </Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="programado-valor" etiqueta="Valor">
            <CampoPesos
              id="programado-valor"
              value={valor}
              onChange={setValor}
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          <Campo id="programado-fecha" etiqueta="Fecha">
            <Input
              id="programado-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
          <Campo id="programado-recurrencia" etiqueta="Se repite">
            <div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-muted p-1">
              {(["MENSUAL", "UNA_VEZ"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurrencia(r)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
                    recurrencia === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {r === "MENSUAL" ? "Cada mes" : "Una vez"}
                </button>
              ))}
            </div>
          </Campo>
        </div>
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">{problema ?? "Listo para programar."}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={problema !== null || crear.isPending}
            onClick={() => crear.mutate()}
          >
            {crear.isPending && <Loader2 className="size-4 animate-spin" />}
            Programar
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
