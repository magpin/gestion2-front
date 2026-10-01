"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

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
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { formatCOP, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { problemaDelMedio, SelectorMedio, type Medio } from "@/modules/tesoreria/components/SelectorMedio";
import { movimientosConceptoApi } from "@/modules/tesoreria/services/movimientos-concepto.service";
import type { CuentaBancariaResumen } from "@/modules/tesoreria/types/bancos.types";
import type { CajaResumen } from "@/modules/tesoreria/types/tesoreria.types";
import { impuestosApi } from "../services/impuestos.service";
import type { FilaCalendario, PartidaPago } from "../types/impuestos.types";

/**
 * Registrar el pago de una declaración ya presentada (lienzo «Pago a la
 * DIAN»). El pago se hace en el banco o por PSE con el recibo 490; acá se
 * registra cuando el banco confirma: sale la plata y cada retención se salda
 * con su proveedor.
 */
export function PagarDeclaracionDialog({ fila, onCerrar }: { fila: FilaCalendario | null; onCerrar: () => void }) {
  return (
    <Dialog open={fila !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">{fila?.declaracion && <Formulario fila={fila} onCerrar={onCerrar} />}</DialogContent>
    </Dialog>
  );
}

function Formulario({ fila, onCerrar }: { fila: FilaCalendario; onCerrar: () => void }) {
  const d = fila.declaracion!;
  const queryClient = useQueryClient();
  const [medio, setMedio] = useState<Medio>("BANCO");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [recibo, setRecibo] = useState("");
  const [intereses, setIntereses] = useState("0");
  const [intentado, setIntentado] = useState(false);
  const interesesQuietos = useQuieto(Number(intereses) || 0, 400);

  const previo = useQuery({
    queryKey: ["impuestos", "pago-previo", d.id, interesesQuietos],
    queryFn: () => impuestosApi.pagoPrevio(d.id, interesesQuietos),
  });
  // Las del municipio se pagan con su propio recibo, no con el 490 de la DIAN.
  const recibo490 = fila.municipio === null;
  // La renta se paga por cuotas: lo que sale ahora es la cuota que sigue.
  const cuota = previo.data?.cuota ?? null;
  const total = (cuota?.valor ?? d.valorAPagar - d.pagado) + (Number(intereses) || 0);
  const { data: gmf = 0 } = useQuery({
    queryKey: ["tesoreria", "gmf-previsto", cuenta?.id, total],
    queryFn: () => movimientosConceptoApi.gmfPrevisto(cuenta!.id, total),
    enabled: medio === "BANCO" && cuenta !== null && total > 0,
  });
  const gmfMostrado = medio === "BANCO" && cuenta !== null ? gmf : 0;

  const errores = {
    medio:
      problemaDelMedio(medio, caja, cuenta) ??
      (medio === "CAJA" && caja !== null && total > Number(caja.saldo)
        ? `No alcanza: en ${caja.nombre} hay ${formatCOP(Number(caja.saldo))}.`
        : null),
    recibo: recibo.trim() === "" ? `Escriba el número del ${recibo490 ? "recibo 490" : "recibo de pago"} con el que pagó.` : null,
    fecha: fecha === "" ? "Elija la fecha." : fecha > hoyEnColombia() ? "La fecha no puede ser futura." : null,
    previo: previo.data && !previo.data.armado.ok ? previo.data.armado.motivo : null,
  };
  const problema = Object.values(errores).some((e) => e !== null) || previo.data === undefined;
  const ver = (k: keyof typeof errores) => (intentado ? (errores[k] ?? undefined) : undefined);

  const pagar = useMutation({
    mutationFn: () =>
      impuestosApi.pagar(d.id, {
        medio,
        cajaId: medio === "CAJA" ? caja!.id : null,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : null,
        fecha,
        recibo490: recibo.trim(),
        intereses: Number(intereses) || 0,
      }),
    onSuccess: async (pagada) => {
      await Promise.all(
        [["impuestos"], ["pagos"], ["tablero"], ["tesoreria"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      aviso.exito(
        "Pago registrado",
        `${fila.etiqueta}: salieron ${formatCOP(total)}${pagada.gmf > 0 ? ` más ${formatCOP(pagada.gmf)} de 4×1000` : ""}.`,
      );
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const armado = previo.data?.armado;
  const partidas = armado?.ok ? agrupar(armado.partidas) : [];
  const dias = fila.situacion.dias;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{cuota ? `Pago de la cuota ${cuota.numero} de ${cuota.de}` : "Pago de impuesto"}</DialogTitle>
        <DialogDescription>
          {fila.etiqueta} · {fila.formulario ? `formulario ${fila.formulario} ` : ""}N.º {d.numeroFormulario}. Se asienta al
          guardar.
        </DialogDescription>
        <DialogCloseIcon />
      </DialogHeader>
      <DialogBody className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="pago-recibo" etiqueta={recibo490 ? "Recibo de pago 490" : "Recibo de pago del municipio"} error={ver("recibo")} escala="grande">
            <Input
              id="pago-recibo"
              value={recibo}
              onChange={(e) => setRecibo(e.target.value)}
              placeholder={recibo490 ? "4902600765432" : "El número que trae el recibo"}
              className="h-11 rounded-xl px-4 font-mono"
              aria-invalid={ver("recibo") !== undefined}
            />
          </Campo>
          <Campo id="pago-fecha" etiqueta="Fecha del pago" error={ver("fecha")} escala="grande">
            <Input id="pago-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-xl px-4" />
          </Campo>
        </div>
        <Campo id="pago-medio" etiqueta="Sale de" error={ver("medio")} escala="grande">
          <SelectorMedio medio={medio} onMedio={setMedio} caja={caja} onCaja={setCaja} cuenta={cuenta} onCuenta={setCuenta} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <Campo
            id="pago-intereses"
            etiqueta="Intereses de mora"
            ayuda={
              fila.situacion.vencida
                ? `Venció hace ${-(dias ?? 0)} días: corren intereses. Escriba los que liquidó MUISCA.`
                : "A tiempo: sin intereses."
            }
            escala="grande"
          >
            <CampoPesos id="pago-intereses" value={intereses} onChange={setIntereses} className="h-11 rounded-xl px-4 text-right font-mono" />
          </Campo>
          <div className="flex flex-col gap-1.5 rounded-2xl bg-muted px-4 py-3 text-sm">
            <Linea etiqueta={cuota ? `Cuota ${cuota.numero} de ${cuota.de}` : "Impuesto"} valor={formatCOP(cuota?.valor ?? d.valorAPagar)} />
            <Linea etiqueta="Intereses" valor={formatCOP(Number(intereses) || 0)} />
            {gmfMostrado > 0 && <Linea etiqueta="4×1000" valor={`+ ${formatCOP(gmfMostrado)}`} />}
            <div className="mt-1 border-t border-border pt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Sale {medio === "BANCO" ? "del banco" : "de la caja"}
              </p>
              <p className="font-mono text-2xl font-semibold whitespace-nowrap tabular-nums">{formatCOP(total + gmfMostrado)}</p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
            <h3 className="text-sm font-semibold">Así queda en el libro</h3>
            {armado?.ok && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-medium">
                <Check className="size-3.5" /> Cuadra
              </span>
            )}
          </div>
          {previo.isLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : armado && !armado.ok ? (
            <p role="alert" className="px-4 py-4 text-sm text-danger">
              {armado.motivo}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-2 text-left">Cuenta</th>
                  <th className="px-4 py-2 text-right">Débito</th>
                  <th className="px-4 py-2 text-right">Crédito</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {partidas.map((p) => (
                  <tr key={p.codigo} className="border-t border-border">
                    <td className="px-4 py-2 font-sans">
                      <span className="font-mono text-muted-foreground">{p.codigo}</span> {p.nombre}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{p.debito > 0 ? formatCOP(p.debito) : ""}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{p.credito > 0 ? formatCOP(p.credito) : ""}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-4 py-2 font-sans">{medio === "BANCO" ? (cuenta ? `Banco · ${cuenta.banco} ${cuenta.numero_cuenta}` : "Banco") : caja?.nombre ?? "Caja"}</td>
                  <td />
                  <td className="px-4 py-2 text-right whitespace-nowrap">{formatCOP(total)}</td>
                </tr>
              </tbody>
            </table>
          )}
          {armado?.ok && armado.redondeo !== 0 && (
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              El formulario va al múltiplo de mil: la diferencia con el libro ({formatCOP(Math.abs(armado.redondeo))}) va a
              ajuste al peso.
            </p>
          )}
          {gmfMostrado > 0 && (
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              El 4×1000 ({formatCOP(gmfMostrado)}) sale en su propio movimiento, como lo muestra el extracto.
            </p>
          )}
        </section>
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {intentado && problema
            ? (errores.previo ?? "Revise lo marcado en rojo.")
            : `Pague en el banco o por PSE con ${recibo490 ? "el recibo 490" : "el recibo del municipio"}, y regístrelo cuando el banco confirme.`}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={pagar.isPending}
            onClick={() => (problema ? setIntentado(true) : pagar.mutate())}
          >
            {pagar.isPending && <Loader2 className="size-4 animate-spin" />}
            Registrar pago
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

/** Una línea por cuenta: el servidor las trae por tercero, que acá no hace falta ver. */
function agrupar(partidas: PartidaPago[]): Array<{ codigo: string; nombre: string; debito: number; credito: number }> {
  const porCuenta = new Map<string, { codigo: string; nombre: string; debito: number; credito: number }>();
  for (const p of partidas) {
    const a = porCuenta.get(p.codigo) ?? { codigo: p.codigo, nombre: p.nombre, debito: 0, credito: 0 };
    a.debito += p.debito;
    a.credito += p.credito;
    porCuenta.set(p.codigo, a);
  }
  return [...porCuenta.values()];
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-mono font-medium whitespace-nowrap tabular-nums">{valor}</span>
    </div>
  );
}
