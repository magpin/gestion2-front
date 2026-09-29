"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
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
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { CajaPrincipal } from "@/modules/tesoreria/components/CajaPrincipal";
import { SelectorCuentaBancaria } from "@/modules/tesoreria/components/SelectorCuentaBancaria";
import type { CuentaBancariaResumen } from "@/modules/tesoreria/types/bancos.types";
import type { CajaResumen } from "@/modules/tesoreria/types/tesoreria.types";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import {
  abonosIniciales,
  alternar,
  cambiarDescuento,
  cambiarValor,
  problemaDelRecibo,
  totalDescuentos,
  totalRecibo,
  type AbonoBorrador,
} from "../lib/recibo";
import { cobrosApi } from "../services/cobros.service";
import type { FacturaPorCobrar } from "../types/cobros.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** El cliente con que se abre: de la fila de Cobros o de la factura en Ventas. */
export interface ClienteInicial {
  id: string;
  nombre: string;
}

/**
 * El recibo de caja: un cliente, una fecha, por dónde entra la plata y cuánto
 * se le abona a cada factura suya.
 *
 * Es **el** documento de toda plata que un cliente paga por sus facturas: el
 * botón «Cobrar» de Ventas y el de Cobros abren este mismo diálogo. Por dentro
 * cada abono es el cobro de siempre, así que el libro de caja y la factura se
 * enteran igual que antes.
 */
export function ReciboCajaDialog({
  abierto,
  cliente,
  facturaId,
  onCerrar,
}: {
  abierto: boolean;
  cliente?: ClienteInicial | null;
  /** La factura desde la que se abrió: arranca marcada por su saldo. */
  facturaId?: string;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="xl">
        {abierto && (
          <Contenido
            key={`${cliente?.id ?? "nuevo"}-${facturaId ?? ""}`}
            clienteInicial={cliente ?? null}
            facturaId={facturaId}
            onCerrar={onCerrar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  clienteInicial,
  facturaId,
  onCerrar,
}: {
  clienteInicial: ClienteInicial | null;
  facturaId?: string;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  // `SelectorTercero` trabaja con el tercero completo; del que viene de una
  // fila solo se conocen el id y el nombre, que es lo que muestra.
  const [cliente, setCliente] = useState<TerceroResumen | null>(
    clienteInicial ? ({ id: clienteInicial.id, nombre: clienteInicial.nombre } as TerceroResumen) : null,
  );
  const [fecha, setFecha] = useState(hoy());
  const [medio, setMedio] = useState<"CAJA" | "BANCO">("CAJA");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  // `null` mientras llegan las facturas del cliente: los renglones arrancan
  // de lo que la API diga, no de una lista vacía que después haya que pisar.
  const [abonos, setAbonos] = useState<AbonoBorrador[] | null>(null);
  const [anticipo, setAnticipo] = useState("");
  const [comision, setComision] = useState("");

  const { data: facturas, isFetching } = useQuery({
    queryKey: ["cartera", "facturas", cliente?.id],
    queryFn: () => cobrosApi.facturasDe(cliente!.id),
    enabled: cliente !== null,
  });
  const renglones: AbonoBorrador[] =
    abonos ?? (facturas ? abonosIniciales(facturas, facturaId) : []);
  const cambiar = (f: (a: AbonoBorrador[]) => AbonoBorrador[]) => setAbonos(f(renglones));

  const descuentos = totalDescuentos(renglones);
  const conComision = medio === "BANCO" ? comision : "";
  const entra = totalRecibo(renglones) + Number(anticipo || 0) - Number(conComision || 0);
  const destino = medio === "CAJA" ? caja : cuenta;
  const problema =
    cliente === null
      ? "Elegí el cliente."
      : fecha === ""
        ? "Elegí la fecha."
        : destino === null
          ? medio === "CAJA"
            ? "No hay caja principal."
            : "Elegí la cuenta bancaria."
          : problemaDelRecibo(renglones, anticipo, conComision);

  const guardar = useMutation({
    mutationFn: () =>
      cobrosApi.crearRecibo({
        terceroId: cliente!.id,
        fecha,
        medio,
        cajaId: medio === "CAJA" ? caja!.id : undefined,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : undefined,
        aplicaciones: renglones
          .filter((a) => a.marcada)
          .map((a) => ({
            facturaId: a.factura.id,
            valor: Number(a.valor || 0),
            descuento: Number(a.descuento) > 0 ? Number(a.descuento) : undefined,
          })),
        anticipo: Number(anticipo) > 0 ? Number(anticipo) : undefined,
        comision: Number(conComision) > 0 ? Number(conComision) : undefined,
      }),
    onSuccess: async (r) => {
      await Promise.all(
        [["cartera"], ["recibos-caja"], ["facturas"], ["cajas"], ["cuentas-bancarias"], ["movimientos-concepto"]].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito(`Recibo ${r.numero} registrado`, `Entraron ${formatCOP(r.total - r.comision)}.`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Recibo de caja</DialogTitle>
          <DialogDescription>
            Recaudo de una o varias facturas del mismo cliente. Se asienta al guardar.
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_1.2fr]">
          <Campo id="recibo-cliente" etiqueta="Cliente">
            <SelectorTercero
              valor={cliente}
              onElegir={(t) => {
                setCliente(t);
                setAbonos(null);
              }}
            />
          </Campo>
          <Campo id="recibo-fecha" etiqueta="Fecha">
            <Input
              id="recibo-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
          <Campo id="recibo-medio" etiqueta="Entra a">
            <div className="flex flex-col gap-2">
              <div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-muted p-1">
                {(["CAJA", "BANCO"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMedio(m)}
                    className={cn(
                      "rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors",
                      medio === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {m === "CAJA" ? "Caja" : "Banco"}
                  </button>
                ))}
              </div>
              {/* El efectivo de una venta entra siempre a la caja principal. */}
              {medio === "CAJA" ? (
                <CajaPrincipal valor={caja} onElegir={setCaja} />
              ) : (
                <SelectorCuentaBancaria valor={cuenta} onElegir={setCuenta} />
              )}
            </div>
          </Campo>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border">
          <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">
            Facturas por cobrar de este cliente
          </h3>
          {cliente === null ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Elegí el cliente para ver lo que debe.</p>
          ) : isFetching && facturas === undefined ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : renglones.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Este cliente no debe nada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="bg-muted/60 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="w-10 px-4 py-2" />
                    <th className="px-4 py-2">Factura</th>
                    <th className="px-4 py-2">Vence</th>
                    <th className="px-4 py-2 text-right">Saldo</th>
                    <th className="w-40 px-4 py-2 text-right">Descuento</th>
                    <th className="w-44 px-4 py-2 text-right">Abono</th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((a) => (
                    <tr key={a.factura.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={a.marcada}
                          onChange={() => cambiar((x) => alternar(x, a.factura.id))}
                          aria-label={`Abonar a ${a.factura.numero}`}
                          className="size-4 accent-primary"
                        />
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold">{a.factura.numero}</td>
                      <td className="px-4 py-2">
                        <Vence factura={a.factura} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                        {formatCOP(a.factura.pendiente)}
                      </td>
                      <td className="px-4 py-2">
                        <CampoPesos
                          value={a.descuento}
                          onChange={(v) => cambiar((x) => cambiarDescuento(x, a.factura.id, v))}
                          placeholder="—"
                          aria-label={`Descuento a ${a.factura.numero}`}
                          className="h-10 rounded-xl px-3 text-right font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <CampoPesos
                          value={a.valor}
                          onChange={(v) => cambiar((x) => cambiarValor(x, a.factura.id, v))}
                          placeholder="—"
                          aria-label={`Abono a ${a.factura.numero}`}
                          className="h-10 rounded-xl px-3 text-right font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo id="recibo-anticipo" etiqueta="Anticipo (plata de más, sin factura)">
            <CampoPesos
              id="recibo-anticipo"
              value={anticipo}
              onChange={setAnticipo}
              placeholder="—"
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          {medio === "BANCO" && (
            <Campo id="recibo-comision" etiqueta="Comisión del datáfono o del banco">
              <CampoPesos
                id="recibo-comision"
                value={comision}
                onChange={setComision}
                placeholder="—"
                className="h-11 rounded-xl px-4 text-right font-mono"
              />
            </Campo>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            Cada abono se registra como el cobro de su factura: débito a{" "}
            {medio === "CAJA" ? "la caja" : "la cuenta bancaria"} y crédito a Clientes (130505), con el
            número del recibo en el libro. La retención que el cliente practicó ya se descontó al facturar.
            {descuentos > 0 && " El descuento por pronto pago va al gasto y salda la factura sin plata."}
            {Number(anticipo) > 0 && " El anticipo queda a nombre del cliente (280505) para cruzarlo después."}
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Entra {medio === "CAJA" ? "a la caja" : "al banco"}
            </p>
            <p className="font-mono text-3xl font-semibold whitespace-nowrap tabular-nums">{formatCOP(entra)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {renglones.filter((a) => a.marcada).length} de {renglones.length} facturas
              {descuentos > 0 && ` · descuentos ${formatCOP(descuentos)}`}
              {Number(conComision) > 0 && ` · comisión ${formatCOP(Number(conComision))}`}
            </p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ?? "Un recibo guardado no se edita: se anula y queda en su historial."}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={problema !== null || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar recibo
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

/** «Venció 25 jul · 65 días» en ámbar, o «2 oct · en 4 días». */
function Vence({ factura }: { factura: FacturaPorCobrar }) {
  const fecha = new Date(`${factura.venceEfectivo}T00:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
  if (factura.diasVencidos > 0) {
    return (
      <span className="rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
        Venció {fecha} · {factura.diasVencidos} {factura.diasVencidos === 1 ? "día" : "días"}
      </span>
    );
  }
  const faltan = -factura.diasVencidos;
  return (
    <span className="text-muted-foreground whitespace-nowrap">
      {fecha} · {faltan === 0 ? "vence hoy" : `en ${faltan} ${faltan === 1 ? "día" : "días"}`}
    </span>
  );
}
