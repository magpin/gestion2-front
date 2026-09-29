"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";

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
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { trasladosApi } from "../services/traslados.service";
import type { CuentaBancariaResumen } from "../types/bancos.types";
import type { CajaResumen } from "../types/tesoreria.types";
import type { ExtremoTrasladoInput, Traslado } from "../types/traslados.types";
import { problemaDelMedio, SelectorMedio, type Medio } from "./SelectorMedio";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Un traslado mueve los saldos y los dos libros: todo cuelga de estas claves.
const INVALIDAR = [["traslados"], ["cajas"], ["cuentas-bancarias"], ["movimientos-concepto"]];

/** Lo que el formulario sabe de un extremo: el medio y cuál, si ya se eligió. */
interface Lado {
  medio: Medio;
  caja: CajaResumen | null;
  cuenta: CuentaBancariaResumen | null;
}

const ladoVacio = (medio: Medio): Lado => ({ medio, caja: null, cuenta: null });

const idDe = (l: Lado): string | null => (l.medio === "CAJA" ? l.caja?.id : l.cuenta?.id) ?? null;

const aEnvio = (l: Lado): ExtremoTrasladoInput =>
  l.medio === "CAJA" ? { medio: "CAJA", cajaId: l.caja!.id } : { medio: "BANCO", cuentaBancariaId: l.cuenta!.id };

/**
 * Traslados entre caja y bancos: consignar el efectivo, retirar para la caja,
 * pasar de una cuenta a otra. No es ingreso ni gasto: la plata cambia de
 * lugar, con un solo asiento y un movimiento en cada libro.
 */
export function ListaTraslados({ puedeAnular }: { puedeAnular: boolean }) {
  const [anulando, setAnulando] = useState<Traslado | null>(null);
  const [trasladando, setTrasladando] = useState(false);
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["traslados"],
    queryFn: trasladosApi.listar,
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudieron leer los traslados" onReintentar={refetch} />
    ) : (
      <SkeletonTable />
    );
  }
  if (data.length === 0) {
    // Quien puede anular es quien puede trasladar: los dos son CAJA o DIRECTOR.
    return (
      <>
        <EmptyState
          titulo="Todavía no hay traslados"
          descripcion="Cuando consignés el efectivo de la caja, retirés del banco o pasés plata entre tus cuentas, registralo acá: no es ingreso ni gasto, la plata cambia de lugar."
          accion={puedeAnular ? { label: "Registrar traslado", onClick: () => setTrasladando(true) } : undefined}
        />
        <TrasladoDialog abierto={trasladando} onCerrar={() => setTrasladando(false)} />
      </>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Traslado</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">De → a</th>
              <th className="px-5 py-3">Detalle</th>
              <th className="px-5 py-3 text-right">Valor</th>
              {puedeAnular && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {data.map((x) => (
              <tr key={x.id} className={`border-t border-border ${x.estado === "ANULADO" ? "text-muted-foreground" : ""}`}>
                <td className="px-5 py-3 font-mono font-semibold whitespace-nowrap">
                  {x.numero}
                  {x.estado === "ANULADO" && (
                    <span
                      title={x.motivoAnulacion ?? undefined}
                      className="ml-2 rounded-full border border-border px-2 py-0.5 font-sans text-[11px] font-medium"
                    >
                      Anulado
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 whitespace-nowrap">{x.fecha}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    {x.origen.nombre}
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    {x.destino.nombre}
                  </span>
                </td>
                <td className="px-5 py-3">{x.detalle}</td>
                <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(x.valor)}
                  {x.gmf > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground">4×1000 {formatCOP(x.gmf)}</span>
                  )}
                </td>
                {puedeAnular && (
                  <td className="px-5 py-3 text-right">
                    {x.estado === "VIGENTE" && (
                      <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={() => setAnulando(x)}>
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
      <DialogoAnularTraslado traslado={anulando} onCerrar={() => setAnulando(null)} />
    </>
  );
}

export function TrasladoDialog({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">{abierto && <Formulario onCerrar={onCerrar} />}</DialogContent>
    </Dialog>
  );
}

function Formulario({ onCerrar }: { onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(hoy());
  // Lo más común: consignar el efectivo de la caja en el banco.
  const [origen, setOrigen] = useState<Lado>(ladoVacio("CAJA"));
  const [destino, setDestino] = useState<Lado>(ladoVacio("BANCO"));
  const [valor, setValor] = useState("");
  const [detalle, setDetalle] = useState("");
  const [sinGmf, setSinGmf] = useState(false);

  const origenId = idDe(origen);
  const destinoId = idDe(destino);
  const valorQuieto = useQuieto(Number(valor) > 0 ? Number(valor) : 0);
  const { data: previsto } = useQuery({
    queryKey: ["traslados", "gmf", origen.medio, origenId, destino.medio, destinoId, valorQuieto],
    queryFn: () =>
      trasladosApi.gmfPrevisto({
        origenMedio: origen.medio,
        origenId: origenId!,
        destinoMedio: destino.medio,
        destinoId: destinoId!,
        valor: valorQuieto,
      }),
    enabled: origen.medio === "BANCO" && origenId !== null && destinoId !== null && valorQuieto > 0,
  });
  const gmf = origen.medio === "BANCO" && previsto?.causa && !sinGmf ? previsto.gmf : 0;

  const problema =
    problemaDelMedio(origen.medio, origen.caja, origen.cuenta) ??
    problemaDelMedio(destino.medio, destino.caja, destino.cuenta) ??
    (origen.medio === destino.medio && origenId === destinoId
      ? "El origen y el destino son el mismo."
      : !(Number(valor) > 0)
        ? "Escribí el valor."
        : fecha === ""
          ? "Elegí la fecha."
          : null);

  const crear = useMutation({
    mutationFn: () =>
      trasladosApi.crear({
        fecha,
        origen: aEnvio(origen),
        destino: aEnvio(destino),
        valor: Number(valor),
        detalle: detalle.trim() || undefined,
        sinGmf: sinGmf || undefined,
      }),
    onSuccess: async (x) => {
      await Promise.all(INVALIDAR.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito(
        `Traslado ${x.numero} registrado`,
        `${formatCOP(x.valor)} de ${x.origen.nombre} a ${x.destino.nombre}${x.gmf > 0 ? `; 4×1000 ${formatCOP(x.gmf)}` : ""}.`,
      );
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Nuevo traslado</DialogTitle>
          <DialogDescription>
            La plata cambia de lugar: no es ingreso ni gasto. Se asienta débito al destino y crédito al origen.
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>
      <DialogBody className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo id="traslado-origen" etiqueta="Sale de">
            <SelectorMedio
              medio={origen.medio}
              onMedio={(m) => setOrigen(ladoVacio(m))}
              caja={origen.caja}
              onCaja={(caja) => setOrigen({ ...origen, caja })}
              cuenta={origen.cuenta}
              onCuenta={(cuenta) => setOrigen({ ...origen, cuenta })}
            />
          </Campo>
          <Campo id="traslado-destino" etiqueta="Llega a">
            <SelectorMedio
              medio={destino.medio}
              onMedio={(m) => setDestino(ladoVacio(m))}
              caja={destino.caja}
              onCaja={(caja) => setDestino({ ...destino, caja })}
              cuenta={destino.cuenta}
              onCuenta={(cuenta) => setDestino({ ...destino, cuenta })}
            />
          </Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="traslado-valor" etiqueta="Valor">
            <CampoPesos
              id="traslado-valor"
              value={valor}
              onChange={setValor}
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          <Campo id="traslado-fecha" etiqueta="Fecha">
            <Input
              id="traslado-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>
        <Campo id="traslado-detalle" etiqueta="Detalle (opcional)">
          <Input
            id="traslado-detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder={nombrePorDefecto(origen.medio, destino.medio)}
            maxLength={200}
            className="h-11 rounded-xl px-4"
          />
        </Campo>
        {origen.medio === "BANCO" && previsto?.causa && (
          <div className="rounded-2xl border border-border p-4 text-sm">
            <p>
              El banco cobra <span className="font-mono font-semibold">{formatCOP(previsto.gmf)}</span> de 4×1000 por esta
              salida; se registra aparte como gasto.
            </p>
            <label className="mt-2 flex w-fit items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sinGmf}
                onChange={(e) => setSinGmf(e.target.checked)}
                className="size-4 accent-primary"
              />
              El banco no lo cobró en este traslado
            </label>
          </div>
        )}
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ??
            `Sale ${formatCOP(Number(valor) + gmf)}${gmf > 0 ? " con el 4×1000" : ""}; llega ${formatCOP(Number(valor))}.`}
        </p>
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
            Registrar traslado
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

/** El mismo nombre que pone el backend si el detalle va vacío. */
export function nombrePorDefecto(origen: Medio, destino: Medio): string {
  if (origen === "CAJA") return destino === "BANCO" ? "Consignación del efectivo" : "Traslado entre cajas";
  return destino === "CAJA" ? "Retiro para la caja" : "Transferencia entre cuentas propias";
}

function DialogoAnularTraslado({ traslado, onCerrar }: { traslado: Traslado | null; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const anular = useMutation({
    mutationFn: () => trasladosApi.anular(traslado!.id, motivo.trim()),
    onSuccess: async (x) => {
      await Promise.all(INVALIDAR.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito(`Traslado ${x.numero} anulado`);
      setMotivo("");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open={traslado !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Anular {traslado?.numero}</DialogTitle>
            <DialogDescription>
              Los {formatCOP(traslado?.valor ?? 0)} salen de {traslado?.destino.nombre} y vuelven a{" "}
              {traslado?.origen.nombre}
              {traslado && traslado.gmf > 0 ? ", y se anula el 4×1000" : ""}. El traslado queda en el historial.
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
            Anular traslado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
