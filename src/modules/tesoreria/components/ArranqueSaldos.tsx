"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, Wallet } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { SILENCIOSO } from "@/components/shared/ErrorCarga";
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
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { cajaBancosApi } from "../services/caja-bancos.service";
import type { EstadoSaldosIniciales, OrigenSaldos } from "../types/saldos-iniciales.types";

const INVALIDAR = [["tesoreria"], ["cajas"], ["cuentas-bancarias"]];

const ORIGENES: Array<{ valor: OrigenSaldos; titulo: string; ayuda: string }> = [
  { valor: "SOCIOS", titulo: "Lo pusieron los socios", ayuda: "La empresa arranca hoy: es el capital." },
  { valor: "ANTES", titulo: "Ya venía de antes", ayuda: "La empresa ya funcionaba y trae su plata." },
];

/**
 * El arranque de caja y bancos: mientras haya cajas o cuentas que nunca se
 * movieron, una tarjeta invita a poner la plata con la que se empieza. Un
 * solo guardado y un asiento de apertura (CA). Solo lo cargan el director y
 * el contador, porque asienta en el patrimonio.
 */
export function ArranqueSaldos({ onAgregarCuenta }: { onAgregarCuenta?: () => void }) {
  const puedeCargar = useTieneRol("DIRECTOR", "CONTADOR");
  const [abierto, setAbierto] = useState(false);
  const estado = useQuery({
    queryKey: ["tesoreria", "saldos-iniciales"],
    queryFn: () => cajaBancosApi.saldosIniciales(),
    enabled: puedeCargar,
    meta: SILENCIOSO,
  });

  if (!puedeCargar || !estado.data?.pendiente) return null;
  const d = estado.data;
  const cajas = d.cajas.filter((c) => c.sinMovimientos).length;
  const cuentas = d.cuentas.filter((c) => c.sinMovimientos).length;

  return (
    <section className="mb-7 rounded-3xl border border-brand/40 bg-brand/5 px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            Empezá con la plata que tenés hoy<span className="text-brand">.</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Poné cuánto hay en la caja y en cada cuenta del banco para arrancar.{" "}
            {partes(cajas, cuentas)} todavía sin saldo inicial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onAgregarCuenta && (
            <Button type="button" variant="outline" className="h-11 rounded-xl px-5" onClick={onAgregarCuenta}>
              Agregar cuenta del banco
            </Button>
          )}
          <Button type="button" className="h-11 rounded-xl px-5" onClick={() => setAbierto(true)}>
            Poner saldos iniciales
          </Button>
        </div>
      </div>
      <Dialog open={abierto} onOpenChange={(a) => !a && setAbierto(false)}>
        <DialogContent size="lg">{abierto && <Formulario estado={d} onCerrar={() => setAbierto(false)} />}</DialogContent>
      </Dialog>
    </section>
  );
}

function partes(cajas: number, cuentas: number): string {
  const lista = [
    cajas > 0 ? `${cajas} ${cajas === 1 ? "caja" : "cajas"}` : null,
    cuentas > 0 ? `${cuentas} ${cuentas === 1 ? "cuenta" : "cuentas"}` : null,
  ].filter(Boolean);
  return lista.join(" y ").replace(/^./, (c) => c.toUpperCase());
}

function Formulario({ estado, onCerrar }: { estado: EstadoSaldosIniciales; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const cajas = estado.cajas.filter((c) => c.sinMovimientos);
  const cuentas = estado.cuentas.filter((c) => c.sinMovimientos);
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [origen, setOrigen] = useState<OrigenSaldos>("SOCIOS");
  const [valores, setValores] = useState<Record<string, string>>({});

  const conValor = (id: string) => Number(valores[id]) > 0;
  const lineas = [
    ...cajas.filter((c) => conValor(c.id)).map((c) => ({ nombre: c.nombre, valor: Number(valores[c.id]) })),
    ...cuentas.filter((c) => conValor(c.id)).map((c) => ({ nombre: c.nombre, valor: Number(valores[c.id]) })),
  ];
  const total = lineas.reduce((s, l) => s + l.valor, 0);
  const contrapartida = estado.contrapartidas[origen];

  const problema =
    fecha === ""
      ? "Elegí la fecha de corte."
      : lineas.length === 0
        ? "Poné al menos un valor."
        : contrapartida === null
          ? origen === "SOCIOS"
            ? "Falta la cuenta del capital en el plan de cuentas."
            : "Falta la 370505 (utilidades acumuladas) en el plan de cuentas."
          : null;

  const cargar = useMutation({
    mutationFn: () =>
      cajaBancosApi.cargarSaldosIniciales({
        fecha,
        origen,
        cajas: cajas.filter((c) => conValor(c.id)).map((c) => ({ cajaId: c.id, valor: Number(valores[c.id]) })),
        cuentas: cuentas
          .filter((c) => conValor(c.id))
          .map((c) => ({ cuentaBancariaId: c.id, valor: Number(valores[c.id]) })),
      }),
    onSuccess: async (x) => {
      await Promise.all(INVALIDAR.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito("Saldos iniciales cargados", `${formatCOP(x.total)} con el asiento ${x.numero}.`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const fila = (id: string, nombre: string, Icono: typeof Wallet, detalle: string) => (
    <li key={id} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <Icono className="size-4 shrink-0 text-muted-foreground" />
      <label htmlFor={`saldo-${id}`} className="min-w-0 flex-1">
        <span className="block font-medium">{nombre}</span>
        <span className="text-xs text-muted-foreground">{detalle}</span>
      </label>
      <CampoPesos
        id={`saldo-${id}`}
        value={valores[id] ?? ""}
        onChange={(v) => setValores((a) => ({ ...a, [id]: v }))}
        className="h-11 w-44 rounded-xl px-4 text-right font-mono"
      />
    </li>
  );

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Saldos iniciales</DialogTitle>
          <DialogDescription>
            La plata que hay el día de corte en la caja y en cada cuenta. Se carga una sola vez, antes del primer
            movimiento.
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>
      <DialogBody className="flex flex-col gap-5">
        <Campo id="saldos-fecha" etiqueta="Día de corte">
          <Input
            id="saldos-fecha"
            type="date"
            value={fecha}
            max={hoyEnColombia()}
            onChange={(e) => setFecha(e.target.value)}
            className="h-11 w-48 rounded-xl px-4"
          />
        </Campo>

        <ul className="overflow-hidden rounded-2xl border border-border">
          {cajas.map((c) => fila(c.id, c.nombre, Wallet, c.tipo === "PRINCIPAL" ? "Caja principal · efectivo" : "Caja menor · efectivo"))}
          {cuentas.map((c) => fila(c.id, c.nombre, Landmark, `Cuenta ${c.tipoCuenta.toLowerCase()}`))}
        </ul>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">¿De dónde salió esta plata?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ORIGENES.map((o) => (
              <label
                key={o.valor}
                className={cn(
                  "cursor-pointer rounded-2xl border px-4 py-3 transition-colors",
                  origen === o.valor ? "border-foreground bg-accent" : "border-border hover:bg-accent/50",
                )}
              >
                <input
                  type="radio"
                  name="saldos-origen"
                  value={o.valor}
                  checked={origen === o.valor}
                  onChange={() => setOrigen(o.valor)}
                  className="sr-only"
                />
                <span className="block font-medium">{o.titulo}</span>
                <span className="text-xs text-muted-foreground">{o.ayuda}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {lineas.length > 0 && (
          <section className="rounded-2xl border border-border px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              En el libro · comprobante de apertura
            </p>
            <table className="w-full text-sm">
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.nombre}>
                    <td className="py-1">{l.nombre}</td>
                    <td className="py-1 text-right font-mono whitespace-nowrap tabular-nums">D {formatCOP(l.valor)}</td>
                  </tr>
                ))}
                {contrapartida && (
                  <tr className="border-t border-border">
                    <td className="py-1">
                      <span className="font-mono">{contrapartida.codigo}</span> · {contrapartida.nombre}
                    </td>
                    <td className="py-1 text-right font-mono whitespace-nowrap tabular-nums">C {formatCOP(total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ?? (
            <>
              Arrancás con <span className="font-mono font-semibold whitespace-nowrap text-foreground">{formatCOP(total)}</span>
            </>
          )}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={problema !== null || cargar.isPending}
            onClick={() => cargar.mutate()}
          >
            {cargar.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar saldos
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
