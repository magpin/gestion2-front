"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { cn, formatCOP, hoyEnColombia } from "@/lib/utils";
import { cobrosApi } from "@/modules/cobros/services/cobros.service";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { CajaPrincipal } from "@/modules/tesoreria/components/CajaPrincipal";
import { SelectorCuentaBancaria } from "@/modules/tesoreria/components/SelectorCuentaBancaria";
import type { CuentaBancariaResumen } from "@/modules/tesoreria/types/bancos.types";
import type { CajaResumen } from "@/modules/tesoreria/types/tesoreria.types";
import {
  EditorLineasVenta,
  lineaVentaVacia,
  type LineaVentaBorrador,
} from "@/modules/ventas/components/EditorLineasVenta";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import { useTotalesBorrador } from "@/modules/ventas/hooks/useTotalesBorrador";

/**
 * Recibir un anticipo: el cliente, para qué productos es (cantidad y precio,
 * como una cotización) y cuánto paga ahora, que puede ser una parte. Queda
 * en 280505 a nombre del cliente hasta que se facture o se devuelva; al
 * facturarlo, la factura arranca con estos mismos productos.
 */
export function RecibirAnticipoDialog({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="xl">{abierto && <Contenido onCerrar={onCerrar} />}</DialogContent>
    </Dialog>
  );
}

function Contenido({ onCerrar }: { onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [cliente, setCliente] = useState<TerceroResumen | null>(null);
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [lineas, setLineas] = useState<LineaVentaBorrador[]>([lineaVentaVacia()]);
  const [valor, setValor] = useState("");
  const [medio, setMedio] = useState<"CAJA" | "BANCO">("CAJA");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);

  const { porLinea, totales } = useTotalesBorrador(lineas);
  // Lo que vale el pedido, con IVA: se propone como lo que paga, y se cambia
  // si deja solo una parte.
  const pedido = totales.total;
  const paga = valor === "" ? pedido : Number(valor);

  const destino = medio === "CAJA" ? caja : cuenta;
  const problema =
    cliente === null
      ? "Falta elegir el cliente."
      : fecha === ""
        ? "Falta la fecha."
        : lineas.some((l) => l.producto === null)
          ? "Falta elegir el producto en cada renglón, o quitar el renglón."
          : lineas.some((l) => !(Number(l.cantidad) > 0))
            ? "La cantidad tiene que ser mayor que cero."
            : porLinea.some((c) => c === null)
              ? "Falta el precio de algún producto: no tiene precio de lista."
              : !(paga > 0)
                ? "Falta cuánto paga el cliente."
                : destino === null
                  ? medio === "CAJA"
                    ? "No hay caja principal."
                    : "Falta elegir la cuenta bancaria."
                  : null;

  const guardar = useMutation({
    mutationFn: () =>
      cobrosApi.crearRecibo({
        terceroId: cliente!.id,
        fecha,
        medio,
        cajaId: medio === "CAJA" ? caja!.id : undefined,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : undefined,
        aplicaciones: [],
        anticipo: paga,
        // El precio sin IVA por unidad: el digitado, o el de lista.
        productosAnticipo: lineas.map((l, i) => ({
          productoId: l.producto!.id,
          cantidad: Number(l.cantidad),
          precioUnitario:
            l.precioUnitario.trim() !== ""
              ? Number(l.precioUnitario)
              : Math.round((porLinea[i]!.subtotal / Number(l.cantidad)) * 100) / 100,
        })),
      }),
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ["cartera"] });
      aviso.exito(`Anticipo ${r.numero} recibido`, `${formatCOP(paga)} de ${cliente!.nombre}.`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Recibir anticipo</DialogTitle>
          <DialogDescription>
            Dinero que el cliente deja para un pedido. Queda a su nombre hasta que se facture.
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
          <Campo id="anticipo-cliente" etiqueta="Cliente">
            <SelectorTercero valor={cliente} onElegir={setCliente} />
          </Campo>
          <Campo id="anticipo-fecha" etiqueta="Fecha">
            <Input
              id="anticipo-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>

        {/* Como en la cotización: el editor sin marco, para que la lista de
            productos tenga ancho y se abra hacia abajo. */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Para qué productos es</h3>
          <EditorLineasVenta lineas={lineas} onCambiar={setLineas} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo id="anticipo-valor" etiqueta="Cuánto paga ahora">
            <CampoPesos
              id="anticipo-valor"
              value={valor === "" && pedido > 0 ? String(pedido) : valor}
              onChange={setValor}
              placeholder="$ 0"
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          <Campo id="anticipo-medio" etiqueta="Entra a">
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
              {medio === "CAJA" ? (
                <CajaPrincipal valor={caja} onElegir={setCaja} />
              ) : (
                <SelectorCuentaBancaria valor={cuenta} onElegir={setCuenta} />
              )}
            </div>
          </Campo>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            Débito a {medio === "CAJA" ? "la caja" : "la cuenta bancaria"} y crédito a Anticipos de clientes
            (280505), a nombre del cliente. No es venta todavía: la venta es la factura, que arranca con estos
            productos y aplica este anticipo sin volver a mover la caja.
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Entra {medio === "CAJA" ? "a la caja" : "al banco"}
            </p>
            <p className="font-mono text-3xl font-semibold whitespace-nowrap tabular-nums">{formatCOP(paga || 0)}</p>
            {pedido > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                El pedido vale {formatCOP(pedido)}
                {paga > 0 && paga < pedido && ` · queda por pagar ${formatCOP(pedido - paga)} al facturar`}
              </p>
            )}
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <p className="flex-grow text-[13px] text-muted-foreground">{problema ?? ""}</p>
        <Button variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button type="button" disabled={problema !== null || guardar.isPending} onClick={() => guardar.mutate()}>
          {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
          Recibir {paga > 0 ? formatCOP(paga) : "anticipo"}
        </Button>
      </DialogFooter>
    </>
  );
}
