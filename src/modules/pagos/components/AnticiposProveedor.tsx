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
import { SelectorProveedor } from "@/modules/compras/components/SelectorProveedor";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { pagosApi } from "../services/pagos.service";
import type { AnticipoProveedor, CrucePago } from "../types/pagos.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const INVALIDAR = [["pagos"], ["compras"], ["cruces-pago"]];

/**
 * Anticipos: la plata que se le adelantó a un proveedor, cruzada contra la
 * compra cuando llega la factura. No sale plata: se cruza el anticipo
 * (133005) contra Proveedores (220505), y la retención que se le hizo al
 * anticipo pasa a ser la de la compra en la parte cruzada.
 */
export function AnticiposProveedor({ puedeCruzar }: { puedeCruzar: boolean }) {
  const [proveedor, setProveedor] = useState<TerceroResumen | null>(null);
  const [anticipo, setAnticipo] = useState<AnticipoProveedor | null>(null);

  const {
    data: anticipos,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cruces-pago", "anticipos", proveedor?.id],
    queryFn: () => pagosApi.anticiposDe(proveedor!.id),
    enabled: proveedor !== null,
    meta: SILENCIOSO,
  });
  const conSaldo = (anticipos ?? []).filter((a) => a.saldo > 0);

  return (
    <div className="flex flex-col gap-7">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="max-w-md">
          <Campo id="anticipo-proveedor" etiqueta="Proveedor">
            <SelectorProveedor valor={proveedor} onElegir={setProveedor} />
          </Campo>
        </div>
        <div className="mt-5">
          {proveedor === null ? (
            <p className="text-sm text-muted-foreground">Elegí un proveedor para ver sus anticipos.</p>
          ) : anticipos === undefined ? (
            isError ? (
              <ErrorCarga
                sinMarco
                error={error}
                titulo="No se pudieron leer los anticipos de este proveedor"
                onReintentar={refetch}
              />
            ) : (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )
          ) : conSaldo.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este proveedor no tiene anticipos por cruzar. Si le adelantás plata, registrala como anticipo en un
              comprobante de egreso y aparece acá para cruzarla cuando llegue la factura.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {conSaldo.map((a) => (
                <li key={a.movimientoId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Anticipo del {a.fecha}
                      {a.detalle ? ` · ${a.detalle}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCOP(a.valor)} entregados
                      {a.retenido > 0 && ` · retención ${formatCOP(a.retenido)}`}
                      {a.cruzado > 0 && ` · cruzados ${formatCOP(a.cruzado)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(a.saldo)}</span>
                    {puedeCruzar && (
                      <Button type="button" variant="outline" className="h-9 rounded-lg px-4" onClick={() => setAnticipo(a)}>
                        Cruzar con una compra
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

      {proveedor && (
        <Dialog open={anticipo !== null} onOpenChange={(a) => !a && setAnticipo(null)}>
          <DialogContent>
            {anticipo && (
              <ContenidoCruce
                key={anticipo.movimientoId}
                proveedorId={proveedor.id}
                anticipo={anticipo}
                onCerrar={() => setAnticipo(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ContenidoCruce({
  proveedorId,
  anticipo,
  onCerrar,
}: {
  proveedorId: string;
  anticipo: AnticipoProveedor;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [compraId, setCompraId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(hoy());

  const {
    data: compras = [],
    isLoading,
    isError: falloCompras,
    error: errorCompras,
    refetch: releerCompras,
  } = useQuery({
    queryKey: ["pagos", "compras", proveedorId],
    queryFn: () => pagosApi.comprasDe(proveedorId),
    meta: SILENCIOSO,
  });
  const compra = compras.find((c) => c.id === compraId) ?? null;
  // El cruce baja la compra en el valor menos la retención que se reversa:
  // el tope práctico es el saldo del anticipo; el servidor valida el de la compra.
  const tope = anticipo.saldo;

  const problema =
    compra === null
      ? "Elegí la compra."
      : !(Number(valor) > 0)
        ? "Escribí cuánto se cruza."
        : Number(valor) > tope
          ? `El anticipo solo tiene ${formatCOP(tope)}.`
          : fecha === ""
            ? "Elegí la fecha."
            : null;

  const crear = useMutation({
    mutationFn: () =>
      pagosApi.crearCruce({ origenId: anticipo.movimientoId, destinoCompraId: compra!.id, valor: Number(valor), fecha }),
    onSuccess: async (c) => {
      await Promise.all(INVALIDAR.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito(
        "Cruce registrado",
        `${formatCOP(c.valor)} del anticipo aplicados a ${c.destino}${c.retencionReversada > 0 ? `; se reversaron ${formatCOP(c.retencionReversada)} de retención` : ""}.`,
      );
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Cruzar el anticipo</DialogTitle>
          <DialogDescription>
            Quedan {formatCOP(anticipo.saldo)} del anticipo del {anticipo.fecha}. Se asienta débito a
            Proveedores (220505) y crédito a Anticipos (133005); la retención del anticipo en la parte cruzada
            se reversa, porque la compra ya lleva la suya.
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : falloCompras ? (
          <ErrorCarga error={errorCompras} titulo="No se pudieron leer las compras del proveedor" onReintentar={releerCompras} sinMarco />
        ) : compras.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se le debe nada a este proveedor: no hay con qué cruzarlo.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {compras.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCompraId(c.id);
                    setValor(String(Math.min(c.pendiente, anticipo.saldo)));
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors",
                    c.id === compraId ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <span className="font-mono font-semibold">{c.numero}</span>
                  <span className="font-mono whitespace-nowrap tabular-nums">{formatCOP(c.pendiente)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="cruce-pago-valor" etiqueta="Valor del anticipo a cruzar">
            <CampoPesos
              id="cruce-pago-valor"
              value={valor}
              onChange={setValor}
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          <Campo id="cruce-pago-fecha" etiqueta="Fecha">
            <Input
              id="cruce-pago-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">{problema ?? "Listo para cruzar."}</p>
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
            Cruzar
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function ListaCruces({ puedeAnular }: { puedeAnular: boolean }) {
  const [anulando, setAnulando] = useState<CrucePago | null>(null);
  const {
    data: cruces,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cruces-pago", "lista"],
    queryFn: pagosApi.cruces,
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
        descripcion="Cuando llegue la factura de un proveedor al que le adelantaste plata, elegilo arriba y cruzá su anticipo con la compra: cada cruce queda acá."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Proveedor</th>
              <th className="px-5 py-3">Anticipo</th>
              <th className="px-5 py-3">Compra</th>
              <th className="px-5 py-3 text-right">Retención reversada</th>
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
                <td className="px-5 py-3 text-right font-mono whitespace-nowrap tabular-nums">
                  {c.retencionReversada > 0 ? formatCOP(c.retencionReversada) : "—"}
                </td>
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

function DialogoAnularCruce({ cruce, onCerrar }: { cruce: CrucePago | null; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const anular = useMutation({
    mutationFn: () => pagosApi.anularCruce(cruce!.id, motivo.trim()),
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
              {cruce?.destino} vuelve a deber lo cruzado, el anticipo recupera {formatCOP(cruce?.valor ?? 0)} y su
              retención vuelve a estar viva.
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
