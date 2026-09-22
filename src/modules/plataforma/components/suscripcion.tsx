"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { cn, hoyEnColombia } from "@/lib/utils";
import { fecha, nombreMes, pesos, plural } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";
import {
  MEDIOS_PAGO,
  NOMBRE_PLAN,
  type Cuenta,
  type EstadoCargo,
  type Plan,
  type Suscripcion,
} from "../types/plataforma.types";
import { ErrorCarga, Mono, Pastilla, SinConfigurar, Tarjeta, Td, Th, Vacio } from "./piezas";

const campo =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const TONO_CARGO: Record<EstadoCargo, { tono: "exito" | "advertencia" | "peligro" | "neutro"; texto: string }> = {
  PAGADO: { tono: "exito", texto: "Pagado" },
  PARCIAL: { tono: "advertencia", texto: "Parcial" },
  PENDIENTE: { tono: "neutro", texto: "Por vencer" },
  VENCIDO: { tono: "peligro", texto: "Vencido" },
};

/** `2026-09` → «Septiembre 2026». */
const periodo = (p: string) => {
  const m = nombreMes(p);
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${p.slice(0, 4)}`;
};

const dia = (d: string) => fecha(`${d}T12:00:00Z`);

/** «Al día», «Vencido hace 3 días» o «Morosa: 22 días sin pagar». */
export function EstadoPago({ diasMora, vencido }: { diasMora: number; vencido: number }) {
  if (vencido <= 0) return <Pastilla tono="exito">Al día</Pastilla>;
  return (
    <Pastilla tono={diasMora >= 15 ? "peligro" : "advertencia"}>
      {diasMora >= 15 ? `${diasMora} días sin pagar` : `Vencido hace ${plural(diasMora, "día")}`}
    </Pastilla>
  );
}

/**
 * La pestaña Suscripción: lo que paga, lo que debe, los cargos de cada período
 * y los pagos. Nada se edita ni se borra: un pago mal registrado se compensa.
 */
export function PestanaSuscripcion({ cuenta }: { cuenta: Cuenta }) {
  const [dialogo, setDialogo] = useState<"pago" | "precio" | null>(null);
  const consulta = useQuery({
    queryKey: ["plataforma", "suscripcion", cuenta.id],
    queryFn: () => plataformaService.suscripcion(cuenta.id),
  });

  if (consulta.isError)
    return <ErrorCarga que="la suscripción" alReintentar={() => void consulta.refetch()} />;
  if (!consulta.data)
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );

  const s = consulta.data;
  const e = s.estado;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Lo que paga"
          className="gap-2"
          accion={
            <Button variant="outline" size="sm" onClick={() => setDialogo("precio")}>
              Cambiar
            </Button>
          }
        >
          {s.precio === null ? (
            <SinConfigurar />
          ) : (
            <Mono className="text-2xl font-medium">{pesos(s.precio)}</Mono>
          )}
          <span className="text-[13px] text-muted-foreground">
            {s.precioPactado !== null
              ? "Precio pactado para esta cuenta."
              : `Al mes, el precio del plan ${NOMBRE_PLAN[cuenta.plan]}.`}{" "}
            Corte el día {s.diaCorte}.
          </span>
        </Tarjeta>
        <Tarjeta titulo="Estado" className="gap-2">
          <EstadoPago diasMora={e.diasMora} vencido={e.vencido} />
          <span className="text-[13px] text-muted-foreground">
            {e.vencido > 0
              ? `${pesos(e.vencido)} vencido. ${
                  e.diasMora >= 15 ? "Ya pasó a morosa." : "A los 15 días pasa sola a morosa."
                }`
              : "Sin nada vencido."}
          </span>
        </Tarjeta>
        <Tarjeta titulo="Saldo" className="gap-2">
          <Mono className={cn("text-2xl font-medium", e.saldo < 0 && "text-success")}>
            {pesos(Math.abs(e.saldo))}
          </Mono>
          <span className="text-[13px] text-muted-foreground">
            {e.saldo < 0 ? "A favor de la cuenta." : e.saldo === 0 ? "No debe nada." : "Por pagar, vencido o no."}
          </span>
        </Tarjeta>
        <Tarjeta titulo="Próximo cobro" className="gap-2">
          <Mono className="text-2xl font-medium">{dia(s.proximoCobro)}</Mono>
          <span className="text-[13px] text-muted-foreground">
            {s.ultimoPago
              ? `Último pago: ${pesos(s.ultimoPago.monto)} el ${dia(s.ultimoPago.fecha)}.`
              : "Todavía no registra pagos."}
          </span>
        </Tarjeta>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Cargos">
          {e.cargos.length === 0 ? (
            <Vacio
              titulo="Todavía no tiene cargos."
              texto={`El primero se genera el ${dia(s.proximoCobro)}.`}
            />
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full min-w-[440px] border-collapse">
                <thead>
                  <tr>
                    <Th>Período</Th>
                    <Th>Vence</Th>
                    <Th derecha>Monto</Th>
                    <Th derecha>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {e.cargos.map((c) => (
                    <tr key={c.id} className="group/fila">
                      <Td>
                        <span className="block">{periodo(c.periodo)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {NOMBRE_PLAN[c.plan as Plan] ?? c.plan}
                        </span>
                      </Td>
                      <Td>
                        <Mono>{dia(c.venceEn)}</Mono>
                      </Td>
                      <Td derecha>
                        <Mono className="block">{pesos(c.monto)}</Mono>
                        {c.estado === "PARCIAL" && (
                          <Mono className="block text-xs text-muted-foreground">
                            pagado {pesos(c.pagado)}
                          </Mono>
                        )}
                      </Td>
                      <Td derecha>
                        <Pastilla tono={TONO_CARGO[c.estado].tono}>{TONO_CARGO[c.estado].texto}</Pastilla>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Pagos"
          accion={
            <Button size="sm" onClick={() => setDialogo("pago")}>
              <Plus /> Registrar un pago
            </Button>
          }
        >
          {s.pagos.length === 0 ? (
            <Vacio titulo="Todavía no hay pagos registrados." />
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full min-w-[440px] border-collapse">
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Medio</Th>
                    <Th derecha>Monto</Th>
                  </tr>
                </thead>
                <tbody>
                  {s.pagos.map((p) => (
                    <tr key={p.id} className="group/fila">
                      <Td>
                        <Mono>{dia(p.fecha)}</Mono>
                      </Td>
                      <Td>
                        <span className="block">{MEDIOS_PAGO[p.medio] ?? p.medio}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.referencia ? `${p.referencia}. ` : ""}Registró {p.admin}
                        </span>
                      </Td>
                      <Td derecha>
                        <Mono>{pesos(p.monto)}</Mono>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="m-0 text-xs text-muted-foreground">
            Los pagos cubren los cargos del más viejo al más nuevo. No se editan ni se borran: uno mal
            registrado se compensa con otro.
          </p>
        </Tarjeta>
      </div>

      {dialogo === "pago" && (
        <DialogoPago cuenta={cuenta} suscripcion={s} alCerrar={() => setDialogo(null)} />
      )}
      {dialogo === "precio" && (
        <DialogoPrecio cuenta={cuenta} suscripcion={s} alCerrar={() => setDialogo(null)} />
      )}
    </>
  );
}

/** Un pago que llegó por fuera del sistema. Propone lo vencido como monto. */
export function DialogoPago({
  cuenta,
  suscripcion,
  alCerrar,
}: {
  cuenta: Cuenta;
  suscripcion: Pick<Suscripcion, "estado" | "precio">;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const sugerido = Math.max(0, suscripcion.estado.saldo) || suscripcion.precio || 0;
  const [f, setF] = useState({
    fecha: hoyEnColombia(),
    monto: sugerido > 0 ? String(sugerido) : "",
    medio: "TRANSFERENCIA",
    referencia: "",
  });
  const monto = Number(f.monto.replace(/\D/g, ""));

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.registrarPago(cuenta.id, {
        fecha: f.fecha,
        monto,
        medio: f.medio,
        referencia: f.referencia.trim() || undefined,
      }),
    onSuccess: async (r) => {
      aviso.exito(
        "Pago registrado",
        r.reactivada ? `${cuenta.nombre} se puso al día y volvió a estar activa.` : undefined,
      );
      await qc.invalidateQueries({ queryKey: ["plataforma"] });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Registrar un pago</DialogTitle>
            <DialogDescription>
              {cuenta.nombre}.{" "}
              {suscripcion.estado.saldo > 0
                ? `Debe ${pesos(suscripcion.estado.saldo)}.`
                : "No debe nada: el pago queda a favor."}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Monto</span>
            <Input
              inputMode="numeric"
              value={f.monto}
              onChange={(e) => setF({ ...f, monto: e.target.value })}
              className="text-right font-mono tabular-nums"
            />
            <span className="text-xs text-muted-foreground">{monto > 0 ? pesos(monto) : "En pesos."}</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Fecha</span>
            <Input
              type="date"
              max={hoyEnColombia()}
              value={f.fecha}
              onChange={(e) => setF({ ...f, fecha: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Medio</span>
            <select className={campo} value={f.medio} onChange={(e) => setF({ ...f, medio: e.target.value })}>
              {Object.entries(MEDIOS_PAGO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Referencia</span>
            <Input
              value={f.referencia}
              onChange={(e) => setF({ ...f, referencia: e.target.value })}
              placeholder="Número de la transferencia"
              maxLength={120}
            />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button disabled={monto <= 0 || !f.fecha || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Registrar {monto > 0 ? pesos(monto) : "el pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** El precio pactado (vacío: el del plan) y el día de corte. */
function DialogoPrecio({
  cuenta,
  suscripcion,
  alCerrar,
}: {
  cuenta: Cuenta;
  suscripcion: Suscripcion;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [pactado, setPactado] = useState(
    suscripcion.precioPactado === null ? "" : String(suscripcion.precioPactado),
  );
  const [corte, setCorte] = useState(String(suscripcion.diaCorte));
  const precio = pactado.trim() === "" ? null : Number(pactado.replace(/\D/g, ""));
  const diaCorte = Number(corte);
  const valido = Number.isInteger(diaCorte) && diaCorte >= 1 && diaCorte <= 28;

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.cambiarSuscripcion(cuenta.id, { precioPactado: precio, diaCorte }),
    onSuccess: async () => {
      aviso.exito("Suscripción actualizada", "Aplica desde el próximo cobro.");
      await qc.invalidateQueries({ queryKey: ["plataforma"] });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Precio y corte</DialogTitle>
            <DialogDescription>
              {cuenta.nombre}. Los cargos ya generados no cambian: esto aplica desde el próximo cobro.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Precio pactado</span>
            <Input
              inputMode="numeric"
              value={pactado}
              onChange={(e) => setPactado(e.target.value)}
              placeholder="El del plan"
              className="text-right font-mono tabular-nums"
            />
            <span className="text-xs text-muted-foreground">
              Vacío: el precio del plan {NOMBRE_PLAN[cuenta.plan]}.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Día de corte</span>
            <Input type="number" min={1} max={28} value={corte} onChange={(e) => setCorte(e.target.value)} />
            <span className="text-xs text-muted-foreground">Del 1 al 28, para que exista en todos los meses.</span>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button disabled={!valido || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
