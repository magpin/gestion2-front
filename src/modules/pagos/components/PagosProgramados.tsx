"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
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
import { cuentasBancariasApi } from "@/modules/tesoreria/services/bancos.service";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { agruparPorSemana, proyectarCuentas } from "../lib/semanas";
import { pagosApi } from "../services/pagos.service";
import type { PagoProgramado, Recurrencia } from "../types/pagos.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const CADA: Record<Recurrencia, string> = { UNA_VEZ: "una vez", QUINCENAL: "cada quincena", MENSUAL: "cada mes" };

/**
 * Pagos → Programados (lienzo «Programados»): lo que va a salir, agrupado
 * por semana (desde el lunes, E24), y cómo quedan las cuentas después, con
 * el 4×1000 (E27). Recuerda, no paga: marcarlo pagado no mueve plata (eso lo
 * hace el comprobante o el pago sin factura), y no hay aprobación (D6, E26).
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
  // El nuevo lo abre la vista (su botón de arriba) o el vacío de acá.
  const [nuevoDesdeVacio, setNuevoDesdeVacio] = useState(false);
  const abiertoNuevo = nuevo || nuevoDesdeVacio;
  const cerrarNuevo = () => {
    setNuevoDesdeVacio(false);
    onCerrarNuevo();
  };
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["pagos", "programados", todos],
    queryFn: () => pagosApi.programados(todos),
    meta: SILENCIOSO,
  });
  const { data: cuentas = [] } = useQuery({
    queryKey: ["cuentas-bancarias"],
    queryFn: () => cuentasBancariasApi.listar(),
    meta: SILENCIOSO,
  });

  const cambiar = useMutation({
    mutationFn: ({ p, accion }: { p: PagoProgramado; accion: "pagado" | "cancelar" }) =>
      accion === "pagado" ? pagosApi.marcarPagado(p.id) : pagosApi.cancelarProgramado(p.id),
    onSuccess: async (_, { p, accion }) => {
      await queryClient.invalidateQueries({ queryKey: ["pagos", "programados"] });
      aviso.exito(
        accion === "pagado" ? "Marcado como pagado" : "Pago cancelado",
        accion === "pagado" && p.recurrencia !== "UNA_VEZ"
          ? `Quedó programado el de ${p.recurrencia === "QUINCENAL" ? "la quincena" : "el mes"} siguiente.`
          : undefined,
      );
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudieron leer los pagos programados" onReintentar={refetch} /> : <SkeletonTable />;
  }

  const hoyDia = hoy();
  const pendientes = data.filter((p) => p.estado === "PENDIENTE");
  const resueltos = data.filter((p) => p.estado !== "PENDIENTE");
  const grupos = agruparPorSemana(pendientes, hoyDia);
  const activas = cuentas.filter((c) => c.activa);
  const proyeccion = proyectarCuentas(
    activas.map((c) => ({ id: c.id, saldo: Number(c.saldo), exentaGmf: c.exenta_gmf })),
    pendientes.map((p) => ({ fecha: p.fecha, valor: p.valor, cuentaId: p.cuentaBancariaId })),
  ).filter((x) => x.hasta !== null);

  const Fila = ({ p }: { p: PagoProgramado }) => {
    const d = new Date(`${p.fecha}T00:00:00Z`);
    const vencido = p.estado === "PENDIENTE" && p.fecha < hoyDia;
    return (
      <li className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3.5">
        <div className="w-10 text-center leading-tight">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{DIAS[d.getUTCDay()]}</p>
          <p className="text-lg font-semibold">{d.getUTCDate()}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {p.descripcion}
            {p.terceroNombre && <span className="font-normal text-muted-foreground"> · {p.terceroNombre}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {[p.cuentaBancaria ?? null, p.conceptoNombre, CADA[p.recurrencia]].filter(Boolean).join(" · ")}
          </p>
        </div>
        {vencido ? (
          <span className="rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-medium">Ya pasó la fecha</span>
        ) : (
          p.recurrencia !== "UNA_VEZ" && <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium">Recurrente</span>
        )}
        <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(p.valor)}</span>
        {p.estado === "PENDIENTE" && (puedePagar || puedeProgramar) && (
          <div className="flex gap-2">
            {puedePagar && (
              <Button type="button" variant="outline" className="h-9 rounded-lg px-3" disabled={cambiar.isPending} onClick={() => cambiar.mutate({ p, accion: "pagado" })}>
                Ya se pagó
              </Button>
            )}
            {puedeProgramar && (
              <Button type="button" variant="ghost" className="h-9 rounded-lg px-3" disabled={cambiar.isPending} onClick={() => cambiar.mutate({ p, accion: "cancelar" })}>
                Cancelar
              </Button>
            )}
          </div>
        )}
        {p.estado !== "PENDIENTE" && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">{p.estado === "PAGADO" ? "Pagado" : "Cancelado"}</span>
        )}
      </li>
    );
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} className="size-4 accent-primary" />
          Ver también los pagados y cancelados
        </label>
      </div>
      {pendientes.length === 0 && resueltos.length === 0 ? (
        <EmptyState
          titulo={todos ? "Todavía no hay pagos programados" : "No hay pagos pendientes"}
          descripcion="Programá el arriendo, la cuota del préstamo o la nómina con su fecha, para que ninguno se te pase."
          accion={puedeProgramar ? { label: "Programar pago", onClick: () => setNuevoDesdeVacio(true) } : undefined}
          accionSecundaria={todos ? undefined : { label: "Ver pagados y cancelados", onClick: () => setTodos(true) }}
        />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {grupos.map((g) => (
              <section key={g.clave} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="flex items-baseline justify-between gap-3 bg-muted/40 px-5 py-3">
                  <h2 className="text-sm font-semibold">
                    {g.titulo}
                    {g.rango && <span className="font-normal text-muted-foreground"> · {g.rango}</span>}
                  </h2>
                  <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(g.total)}</span>
                </div>
                <ul>
                  {g.items.map((p) => (
                    <Fila key={p.id} p={p} />
                  ))}
                </ul>
              </section>
            ))}
            {pendientes.length === 0 && (
              <p className="rounded-3xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">No hay pagos pendientes.</p>
            )}
            {todos && resueltos.length > 0 && (
              <section className="overflow-hidden rounded-3xl border border-border bg-card text-muted-foreground shadow-sm">
                <h2 className="bg-muted/40 px-5 py-3 text-sm font-semibold text-foreground">Pagados y cancelados</h2>
                <ul>
                  {resueltos.map((p) => (
                    <Fila key={p.id} p={p} />
                  ))}
                </ul>
              </section>
            )}
          </div>

          {proyeccion.length > 0 && (
            <aside className="w-full lg:w-80 lg:shrink-0">
              <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Cómo quedan las cuentas</p>
                <ul className="mt-3 flex flex-col gap-4">
                  {proyeccion.map((x) => {
                    const c = activas.find((a) => a.id === x.cuentaId)!;
                    const d = new Date(`${x.hasta}T00:00:00Z`);
                    const parte = x.hoy > 0 ? Math.max(0, Math.min(1, x.queda / x.hoy)) : 0;
                    return (
                      <li key={x.cuentaId}>
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="font-semibold">{c.banco}</span>
                          <span className="text-xs text-muted-foreground">
                            hoy → {DIAS[d.getUTCDay()]} {d.getUTCDate()}
                          </span>
                        </div>
                        <div className="my-1.5 h-2 rounded-full bg-muted" role="img" aria-label={`Queda el ${Math.round(parte * 100)} % de lo que hay hoy`}>
                          <div className={cn("h-2 rounded-full", x.queda < 0 ? "bg-danger" : "bg-foreground")} style={{ width: `${parte * 100}%` }} />
                        </div>
                        <div className="flex justify-between font-mono text-xs tabular-nums">
                          <span className="text-muted-foreground">{formatCOP(x.hoy)}</span>
                          <span className={cn("font-semibold", x.queda < 0 && "text-danger")}>{formatCOP(x.queda)}</span>
                        </div>
                        {x.gmf > 0 && <p className="text-[11px] text-muted-foreground">Incluye {formatCOP(x.gmf)} de 4×1000.</p>}
                        {x.queda < 0 && <p className="text-xs text-danger">No alcanza: faltan {formatCOP(-x.queda)}.</p>}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">Sin contar lo que entre por cobros. Los pagos sin cuenta no mueven ningún banco.</p>
              </section>
            </aside>
          )}
        </div>
      )}
      <Dialog open={abiertoNuevo} onOpenChange={(a) => !a && cerrarNuevo()}>
        <DialogContent>{abiertoNuevo && <FormularioProgramado onCerrar={cerrarNuevo} />}</DialogContent>
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
  const [cuentaId, setCuentaId] = useState<string>("");
  const { data: cuentas = [] } = useQuery({ queryKey: ["cuentas-bancarias"], queryFn: () => cuentasBancariasApi.listar() });

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
        cuentaBancariaId: cuentaId || undefined,
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
        <Campo id="programado-cuenta" etiqueta="Sale de (opcional)" ayuda="Con la cuenta, se ve cómo queda después de pagar, con su 4×1000.">
          <select
            id="programado-cuenta"
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">Efectivo o sin decidir</option>
            {cuentas
              .filter((c) => c.activa)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · {c.numero_cuenta.slice(-4)}
                </option>
              ))}
          </select>
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div>
          <Campo id="programado-recurrencia" etiqueta="Se repite">
            <div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-muted p-1">
              {(["MENSUAL", "QUINCENAL", "UNA_VEZ"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurrencia(r)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
                    recurrencia === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {r === "MENSUAL" ? "Cada mes" : r === "QUINCENAL" ? "Cada quincena" : "Una vez"}
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
