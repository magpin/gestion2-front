"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Loader2 } from "lucide-react";

import { Aviso } from "@/components/shared/Aviso";
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
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP, formatFecha, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCuentaBancaria } from "../components/SelectorCuentaBancaria";
import { cortesBancoApi } from "../services/bancos.service";
import {
  DIRECCION_MOVIMIENTO_BANCO,
  NOMBRE_MOVIMIENTO_BANCO,
  type CuentaBancariaResumen,
} from "../types/bancos.types";

/**
 * El corte diario de una cuenta bancaria: con cuánto amaneció, qué entró, qué
 * salió y con cuánto cerró. Es el arqueo de la caja sin contar billetes —el
 * saldo del banco se lee del portal—, y por eso leerlo es opcional.
 *
 * No es la conciliación. Esa cruza el libro contra el extracto de un período;
 * esto dice cómo cerró un día, el mismo día.
 *
 * Un corte no bloquea el libro: los cargos que el banco hace solos se
 * registran después con su fecha, que es la que permite conciliarlos. Por eso
 * el historial avisa cuando un día cortado cambió después.
 */
export function CorteBancoSeccion() {
  const queryClient = useQueryClient();
  const puedeCortar = useTieneRol("CAJA", "DIRECTOR");

  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [cortando, setCortando] = useState(false);
  const [saldoBanco, setSaldoBanco] = useState("");
  const [nota, setNota] = useState("");

  const clave = ["cuentas-bancarias", "cortes", cuenta?.id];

  const { data: previo, isLoading } = useQuery({
    queryKey: [...clave, "previo", fecha],
    queryFn: () => cortesBancoApi.previo(cuenta!.id, fecha),
    enabled: cuenta !== null && fecha !== "",
  });

  const { data: historial } = useQuery({
    queryKey: [...clave, "historial"],
    queryFn: () => cortesBancoApi.listar(cuenta!.id),
    enabled: cuenta !== null,
  });

  const cerrar = useMutation({
    mutationFn: () =>
      cortesBancoApi.cerrar(cuenta!.id, {
        fecha,
        saldoBanco: saldoBanco.trim() === "" ? undefined : Number(saldoBanco),
        nota: nota.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clave });
      aviso.exito(`Corte del ${formatFecha(fecha)} cerrado`);
      setCortando(false);
      setSaldoBanco("");
      setNota("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const corte = previo?.corte ?? null;
  const diferenciaEnVivo =
    previo && saldoBanco.trim() !== "" && Number.isFinite(Number(saldoBanco))
      ? Math.round((Number(saldoBanco) - previo.saldo_final) * 100) / 100
      : null;

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Cuenta bancaria
          </span>
          <SelectorCuentaBancaria valor={cuenta} onElegir={setCuenta} />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="fecha-corte"
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Día
          </label>
          <Input
            id="fecha-corte"
            type="date"
            max={hoyEnColombia()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-12 rounded-2xl px-4"
          />
        </div>

        <Button
          type="button"
          disabled={!cuenta || !previo || corte !== null || !puedeCortar}
          onClick={() => setCortando(true)}
          className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
        >
          {corte !== null ? "Día ya cortado" : "Cortar el día"}
        </Button>
      </section>

      {!cuenta ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-20 text-center">
          <CalendarCheck className="size-8 text-muted-foreground" />
          <p className="font-semibold">Elegí una cuenta para ver su día</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : !previo ? null : (
        <>
          {corte !== null && corte.cambios_posteriores > 0 && (
            <Aviso
              tono="alarma"
              titulo="Este día cambió después del corte"
              cifra={`${corte.cambios_posteriores} ${corte.cambios_posteriores === 1 ? "movimiento" : "movimientos"}`}
            >
              Se registraron con fecha de este día, o de uno anterior, después
              de cortarlo. El corte quedó con {formatCOP(Number(corte.saldo_final))};
              el libro hoy dice {formatCOP(previo.saldo_final)}. Suele ser un
              cargo del banco que se registró al conciliar.
            </Aviso>
          )}

          {corte !== null && corte.diferencia !== null && Number(corte.diferencia) !== 0 && (
            <Aviso
              tono="alarma"
              titulo="El banco decía otra cosa al cortar"
              cifra={formatCOP(Math.abs(Number(corte.diferencia)))}
            >
              El portal mostraba {formatCOP(Number(corte.saldo_banco))} y el
              libro {formatCOP(Number(corte.saldo_final))}. No se ajusta: lo
              explica la conciliación con el extracto.
            </Aviso>
          )}

          <section className="mb-6 grid gap-3 sm:grid-cols-4">
            {(
              [
                ["Amaneció con", corte ? Number(corte.saldo_anterior) : previo.saldo_anterior, ""],
                ["Entró", corte ? Number(corte.entradas) : previo.entradas, "text-success"],
                ["Salió", corte ? Number(corte.salidas) : previo.salidas, "text-danger"],
                ["Cerró con", corte ? Number(corte.saldo_final) : previo.saldo_final, ""],
              ] as const
            ).map(([etiqueta, valor, color]) => (
              <div key={etiqueta} className="rounded-3xl border border-border bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {etiqueta}
                </p>
                <p className={`mt-2 font-mono text-xl font-bold ${color}`}>{formatCOP(valor)}</p>
              </div>
            ))}
          </section>

          <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-card">
            <div className="border-b border-border p-6">
              <h2 className="text-2xl font-semibold">Movimientos del {formatFecha(fecha)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {corte
                  ? `Cortado el ${formatFecha(corte.cerrado_en)}: los números de arriba quedaron congelados.`
                  : "Todavía sin cortar: los números de arriba son los del libro ahora."}
              </p>
            </div>
            {previo.movimientos.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                Ese día no hubo movimientos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <tbody className="divide-y divide-border">
                    {previo.movimientos.map((m) => {
                      const entra =
                        m.tipo !== "SALDO_INICIAL" && DIRECCION_MOVIMIENTO_BANCO[m.tipo] === "ENTRADA";
                      return (
                        <tr key={m.id}>
                          <td className="px-5 py-4">
                            <span className="rounded-full border border-border px-3 py-1.5 text-xs">
                              {NOMBRE_MOVIMIENTO_BANCO[m.tipo]}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm">{m.concepto}</td>
                          <td
                            className={`px-5 py-4 text-right font-mono font-semibold ${entra ? "text-success" : "text-danger"}`}
                          >
                            {entra ? "" : "−"}
                            {formatCOP(Number(m.valor))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {cuenta && historial && historial.datos.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="border-b border-border p-6">
            <h2 className="text-2xl font-semibold">Cortes anteriores</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Día", "Amaneció", "Entró", "Salió", "Cerró", "Banco", ""].map((x) => (
                    <th key={x} scope="col" className={`px-5 py-4 ${x && x !== "Día" ? "text-right" : ""}`}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historial.datos.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setFecha(c.fecha)}>
                    <td className="px-5 py-4 text-sm">{formatFecha(c.fecha)}</td>
                    <td className="px-5 py-4 text-right font-mono">{formatCOP(Number(c.saldo_anterior))}</td>
                    <td className="px-5 py-4 text-right font-mono text-success">{formatCOP(Number(c.entradas))}</td>
                    <td className="px-5 py-4 text-right font-mono text-danger">{formatCOP(Number(c.salidas))}</td>
                    <td className="px-5 py-4 text-right font-mono font-semibold">{formatCOP(Number(c.saldo_final))}</td>
                    <td className="px-5 py-4 text-right font-mono text-muted-foreground">
                      {c.saldo_banco === null ? "—" : formatCOP(Number(c.saldo_banco))}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {c.cambios_posteriores > 0 && (
                        <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                          Cambió después
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Dialog open={cortando} onOpenChange={(a) => !a && setCortando(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Cortar el {formatFecha(fecha)}</DialogTitle>
              <DialogDescription>
                Los números del día quedan congelados. Un día se corta una sola vez.
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5">
            <p className="rounded-2xl bg-muted p-4 text-sm">
              Según el libro cierra con{" "}
              <span className="font-mono font-semibold">{formatCOP(previo?.saldo_final ?? 0)}</span>.
            </p>

            <Campo
              id="saldo-banco"
              etiqueta="Saldo que muestra el banco"
              escala="grande"
              ayuda="Opcional. Lo que dice el portal ahora; si no coincide, no se ajusta nada: lo explica la conciliación."
            >
              <Input
                id="saldo-banco"
                type="number"
                step="0.01"
                value={saldoBanco}
                onChange={(e) => setSaldoBanco(e.target.value)}
                className="h-11 rounded-xl px-4 text-right font-mono"
              />
            </Campo>

            {diferenciaEnVivo !== null && (
              <Aviso
                tono={diferenciaEnVivo === 0 ? "exito" : "alarma"}
                titulo={diferenciaEnVivo === 0 ? "Coincide con el banco" : "No coincide con el banco"}
                cifra={diferenciaEnVivo === 0 ? undefined : formatCOP(Math.abs(diferenciaEnVivo))}
              >
                {diferenciaEnVivo === 0
                  ? "El libro y el portal dicen lo mismo."
                  : diferenciaEnVivo < 0
                    ? "El banco dice menos: casi siempre es un cargo (4×1000, comisión) que el libro todavía no tiene."
                    : "El banco dice más: casi siempre es una consignación o transferencia que el libro todavía no tiene."}
              </Aviso>
            )}

            <Campo id="nota-corte" etiqueta="Nota" escala="grande">
              <Textarea
                id="nota-corte"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Opcional"
                className="min-h-20 rounded-xl px-4 py-3"
              />
            </Campo>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setCortando(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-12 rounded-xl px-6"
              disabled={cerrar.isPending}
              onClick={() => cerrar.mutate()}
            >
              {cerrar.isPending && <Loader2 className="size-4 animate-spin" />}
              Cortar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
