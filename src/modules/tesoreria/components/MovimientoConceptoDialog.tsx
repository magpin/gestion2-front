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
import { formatCOP } from "@/lib/utils";
import { SelectorProveedor } from "@/modules/compras/components/SelectorProveedor";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
import type { Concepto } from "@/modules/conceptos/types/conceptos.types";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import { movimientosConceptoApi } from "../services/movimientos-concepto.service";
import type { CuentaBancariaResumen } from "../types/bancos.types";
import type { Direccion } from "../types/movimientos-concepto.types";
import type { CajaResumen } from "../types/tesoreria.types";
import { problemaDelMedio, SelectorMedio, type Medio } from "./SelectorMedio";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Lo que se paga sin factura: lo financiero (53), los impuestos que son
 * gasto (5115) y los «no gasto». Lo demás lleva factura o documento soporte
 * y retención: va por Compras. La misma regla que el backend.
 */
export function admiteSinFactura(c: Concepto): boolean {
  if (c.tipo === "NO_GASTO" || c.tipo === "INGRESO") return true;
  const codigo = c.cuenta?.codigo ?? "";
  return codigo.startsWith("53") || codigo.startsWith("5115");
}

/**
 * Un ingreso o un egreso sin factura: se elige el concepto, nunca la cuenta.
 * Ingresos → Cobros «Ingresos sin factura»; Egresos → Pagos «Sin factura».
 */
export function MovimientoConceptoDialog({
  abierto,
  direccion,
  onCerrar,
}: {
  abierto: boolean;
  direccion: Direccion;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {abierto && <Formulario direccion={direccion} onCerrar={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ direccion, onCerrar }: { direccion: Direccion; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const entra = direccion === "ENTRADA";
  const [fecha, setFecha] = useState(hoy());
  const [concepto, setConcepto] = useState<Concepto | null>(null);
  const [tercero, setTercero] = useState<TerceroResumen | null>(null);
  const [medio, setMedio] = useState<Medio>("CAJA");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [valor, setValor] = useState("");
  const [detalle, setDetalle] = useState("");

  const problema =
    concepto === null
      ? "Elegí el concepto."
      : !(Number(valor) > 0)
        ? "Escribí el valor."
        : detalle.trim().length < 3
          ? "Contá de qué fue."
          : (problemaDelMedio(medio, caja, cuenta) ?? null);

  const guardar = useMutation({
    mutationFn: () =>
      movimientosConceptoApi.crear({
        direccion,
        medio,
        cajaId: medio === "CAJA" ? caja!.id : undefined,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : undefined,
        fecha,
        conceptoId: concepto!.id,
        terceroId: tercero?.id,
        detalle: detalle.trim(),
        valor: Number(valor),
      }),
    onSuccess: async () => {
      await Promise.all(
        [["movimientos-concepto"], ["cajas"], ["cuentas-bancarias"]].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito(entra ? "Ingreso registrado" : "Pago registrado", formatCOP(Number(valor)));
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>{entra ? "Ingreso sin factura" : "Pago sin factura"}</DialogTitle>
          <DialogDescription>
            {entra
              ? "Plata que entra sin una factura de venta: un rendimiento, un préstamo, un aporte."
              : "Lo financiero, los impuestos y lo que no es gasto (un crédito, el IVA, la nómina). Lo que lleva factura va por Compras."}
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
          <Campo id="mov-concepto" etiqueta="Concepto">
            <SelectorConcepto
              id="mov-concepto"
              tipos={entra ? ["INGRESO", "NO_GASTO"] : ["GASTO", "COSTO", "NO_GASTO"]}
              valor={concepto}
              onElegir={setConcepto}
              filtro={entra ? undefined : admiteSinFactura}
            />
          </Campo>
          <Campo id="mov-fecha" etiqueta="Fecha">
            <Input
              id="mov-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo id="mov-valor" etiqueta="Valor">
            <CampoPesos
              value={valor}
              onChange={setValor}
              placeholder="0"
              aria-label="Valor"
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          <Campo id="mov-medio" etiqueta={entra ? "Entra a" : "Sale de"}>
            <SelectorMedio
              medio={medio}
              onMedio={setMedio}
              caja={caja}
              onCaja={setCaja}
              cuenta={cuenta}
              onCuenta={setCuenta}
            />
          </Campo>
        </div>

        <Campo id="mov-tercero" etiqueta="A nombre de (opcional)">
          {entra ? (
            <SelectorTercero valor={tercero} onElegir={setTercero} />
          ) : (
            <SelectorProveedor valor={tercero} onElegir={setTercero} />
          )}
        </Campo>

        <Campo id="mov-detalle" etiqueta="De qué fue">
          <Input
            id="mov-detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            maxLength={300}
            placeholder={entra ? "Rendimientos de septiembre" : "Cuota 7 del crédito Bancolombia"}
            className="h-11 rounded-xl px-4"
          />
        </Campo>

        {concepto?.cuenta && (
          <p className="text-xs text-muted-foreground">
            Va a <span className="font-mono">{concepto.cuenta.codigo}</span> {concepto.cuenta.nombre}
            {concepto.afectaResultado ? "" : " · no toca el estado de resultados"}.
          </p>
        )}
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ?? "Se asienta al guardar. Si quedó mal, se anula desde la lista."}
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
            Guardar
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
