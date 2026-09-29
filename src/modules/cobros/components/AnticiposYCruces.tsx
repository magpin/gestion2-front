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
import { Textarea } from "@/components/ui/textarea";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import { cobrosApi } from "../services/cobros.service";
import type { CruceCartera } from "../types/cobros.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Lo que se aplica: un anticipo (su movimiento) o el saldo a favor de una factura. */
interface Origen {
  tipo: "ANTICIPO" | "SALDO_A_FAVOR";
  id: string;
  nombre: string;
  saldo: number;
}

const INVALIDAR = [["cartera"], ["facturas"], ["cruces-cartera"]];

/**
 * Anticipos y cruces: la plata que el cliente dejó sin factura, o que le quedó
 * a favor por una nota crédito, aplicada a lo que debe. No entra ni sale plata:
 * el anticipo se cruza contra Clientes y el saldo a favor pasa de factura a
 * factura.
 */
export function AnticiposYCruces({ puedeCruzar }: { puedeCruzar: boolean }) {
  const [cliente, setCliente] = useState<TerceroResumen | null>(null);
  const [origen, setOrigen] = useState<Origen | null>(null);

  const {
    data: disponibles,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cruces-cartera", "disponibles", cliente?.id],
    queryFn: () => cobrosApi.disponibles(cliente!.id),
    enabled: cliente !== null,
    meta: SILENCIOSO,
  });

  const origenes: Origen[] = disponibles
    ? [
        ...disponibles.anticipos.map((a) => ({
          tipo: "ANTICIPO" as const,
          id: a.movimientoId,
          nombre: `Anticipo del ${a.fecha}${a.detalle ? ` · ${a.detalle}` : ""}`,
          saldo: a.saldo,
        })),
        ...disponibles.saldosAFavor.map((s) => ({
          tipo: "SALDO_A_FAVOR" as const,
          id: s.facturaId,
          nombre: `Saldo a favor en ${s.factura}`,
          saldo: s.saldo,
        })),
      ]
    : [];

  return (
    <div className="flex flex-col gap-7">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="max-w-md">
          <Campo id="cruce-cliente" etiqueta="Cliente">
            <SelectorTercero valor={cliente} onElegir={setCliente} />
          </Campo>
        </div>
        <div className="mt-5">
          {cliente === null ? (
            <p className="text-sm text-muted-foreground">
              Elegí un cliente para ver sus anticipos y saldos a favor.
            </p>
          ) : disponibles === undefined ? (
            isError ? (
              <ErrorCarga
                sinMarco
                error={error}
                titulo="No se pudo leer lo que tiene este cliente por aplicar"
                onReintentar={refetch}
              />
            ) : (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )
          ) : origenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este cliente no tiene anticipos ni saldos a favor por aplicar. Cuando deje plata adelantada, registrala
              con un recibo de caja como anticipo y aparece acá.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {origenes.map((o) => (
                <li key={`${o.tipo}-${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{o.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.tipo === "ANTICIPO" ? "Anticipo recibido (280505)" : "Nota crédito sobre una factura cobrada"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(o.saldo)}</span>
                    {puedeCruzar && (
                      <Button type="button" variant="outline" className="h-9 rounded-lg px-4" onClick={() => setOrigen(o)}>
                        Aplicar a una factura
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ListaCruces puedeAnular={puedeCruzar} />

      {cliente && (
        <DialogoCruce clienteId={cliente.id} origen={origen} onCerrar={() => setOrigen(null)} />
      )}
    </div>
  );
}

function DialogoCruce({
  clienteId,
  origen,
  onCerrar,
}: {
  clienteId: string;
  origen: Origen | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={origen !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        {origen && <ContenidoCruce key={`${origen.tipo}-${origen.id}`} clienteId={clienteId} origen={origen} onCerrar={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}

function ContenidoCruce({
  clienteId,
  origen,
  onCerrar,
}: {
  clienteId: string;
  origen: Origen;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [facturaId, setFacturaId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(hoy());

  const {
    data: facturas = [],
    isLoading,
    isError: falloFacturas,
    error: errorFacturas,
    refetch: releerFacturas,
  } = useQuery({
    queryKey: ["cartera", "facturas", clienteId],
    queryFn: () => cobrosApi.facturasDe(clienteId),
    meta: SILENCIOSO,
  });
  // El saldo a favor no se aplica a la misma factura que lo tiene.
  const destinos = facturas.filter((f) => f.id !== origen.id);
  const destino = destinos.find((f) => f.id === facturaId) ?? null;
  const tope = destino ? Math.min(destino.pendiente, origen.saldo) : origen.saldo;

  const problema =
    destino === null
      ? "Elegí la factura."
      : !(Number(valor) > 0)
        ? "Escribí cuánto se aplica."
        : Number(valor) > tope
          ? `No se puede aplicar más de ${formatCOP(tope)}.`
          : fecha === ""
            ? "Elegí la fecha."
            : null;

  const crear = useMutation({
    mutationFn: () =>
      cobrosApi.crearCruce({
        tipo: origen.tipo,
        origenId: origen.id,
        destinoFacturaId: destino!.id,
        valor: Number(valor),
        fecha,
      }),
    onSuccess: async () => {
      await Promise.all(INVALIDAR.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito("Cruce registrado", `${formatCOP(Number(valor))} aplicados a ${destino!.numero}.`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Aplicar {origen.tipo === "ANTICIPO" ? "el anticipo" : "el saldo a favor"}</DialogTitle>
          <DialogDescription>
            {origen.nombre}: quedan {formatCOP(origen.saldo)}.{" "}
            {origen.tipo === "ANTICIPO"
              ? "Se asienta débito a Anticipos de clientes (280505) y crédito a Clientes (130505)."
              : "No lleva asiento: la plata ya está en Clientes, solo cambia de factura."}
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : falloFacturas ? (
          <ErrorCarga error={errorFacturas} titulo="No se pudieron leer las facturas del cliente" onReintentar={releerFacturas} sinMarco />
        ) : destinos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este cliente no debe nada: no hay a qué aplicarlo.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {destinos.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    setFacturaId(f.id);
                    setValor(String(Math.min(f.pendiente, origen.saldo)));
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors",
                    f.id === facturaId ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <span className="font-mono font-semibold">{f.numero}</span>
                  <span className="font-mono whitespace-nowrap tabular-nums">{formatCOP(f.pendiente)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="cruce-valor" etiqueta="Valor a aplicar">
            <CampoPesos
              id="cruce-valor"
              value={valor}
              onChange={setValor}
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          <Campo id="cruce-fecha" etiqueta="Fecha">
            <Input
              id="cruce-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">{problema ?? "Listo para aplicar."}</p>
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
            Aplicar
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function ListaCruces({ puedeAnular }: { puedeAnular: boolean }) {
  const [anulando, setAnulando] = useState<CruceCartera | null>(null);
  const {
    data: cruces,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cruces-cartera", "lista"],
    queryFn: cobrosApi.cruces,
    meta: SILENCIOSO,
  });

  if (cruces === undefined) {
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudieron leer los cruces" onReintentar={refetch} />
    ) : (
      <SkeletonTable />
    );
  }
  if (cruces.length === 0) {
    return (
      <EmptyState
        titulo="Todavía no hay cruces"
        descripcion="Elegí un cliente arriba y aplicá su anticipo o saldo a favor a una factura que deba: cada cruce queda acá."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">De</th>
              <th className="px-5 py-3">A</th>
              <th className="px-5 py-3 text-right">Valor</th>
              {puedeAnular && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {cruces.map((c) => (
              <tr key={c.id} className={`border-t border-border ${c.estado === "ANULADO" ? "text-muted-foreground" : ""}`}>
                <td className="px-5 py-3 whitespace-nowrap">{c.fecha}</td>
                <td className="px-5 py-3">{c.terceroNombre}</td>
                <td className="px-5 py-3">
                  {c.origen}
                  {c.estado === "ANULADO" && (
                    <span title={c.motivoAnulacion ?? undefined} className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
                      Anulado
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-mono">{c.destino}</td>
                <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(c.valor)}
                </td>
                {puedeAnular && (
                  <td className="px-5 py-3 text-right">
                    {c.estado === "VIGENTE" && (
                      <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={() => setAnulando(c)}>
                        Anular
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DialogoAnularCruce cruce={anulando} onCerrar={() => setAnulando(null)} />
    </>
  );
}

function DialogoAnularCruce({ cruce, onCerrar }: { cruce: CruceCartera | null; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const anular = useMutation({
    mutationFn: () => cobrosApi.anularCruce(cruce!.id, motivo.trim()),
    onSuccess: async () => {
      await Promise.all(INVALIDAR.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito("Cruce anulado");
      setMotivo("");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open={cruce !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Anular el cruce</DialogTitle>
            <DialogDescription>
              {cruce?.destino} vuelve a deber {formatCOP(cruce?.valor ?? 0)} y {cruce?.origen} recupera ese saldo.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por qué se anula"
            aria-label="Motivo de la anulación"
            maxLength={300}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={motivo.trim().length < 3 || anular.isPending}
            onClick={() => anular.mutate()}
          >
            {anular.isPending && <Loader2 className="size-4 animate-spin" />}
            Anular cruce
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
