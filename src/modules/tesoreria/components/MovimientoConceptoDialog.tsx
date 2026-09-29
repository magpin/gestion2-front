"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { formatCOP, hoyEnColombia } from "@/lib/utils";
import { SelectorProveedor } from "@/modules/compras/components/SelectorProveedor";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
import { conceptosApi } from "@/modules/conceptos/services/conceptos.service";
import type { Concepto } from "@/modules/conceptos/types/conceptos.types";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import { movimientosConceptoApi } from "../services/movimientos-concepto.service";
import type { CuentaBancariaResumen } from "../types/bancos.types";
import type { Direccion } from "../types/movimientos-concepto.types";
import type { CajaResumen } from "../types/tesoreria.types";
import { problemaDelMedio, SelectorMedio, type Medio } from "./SelectorMedio";

/** Hoy en Colombia, no en el reloj del navegador: es la fecha que acepta el backend. */
const hoy = (): string => hoyEnColombia();

/**
 * Lo que se paga sin factura: lo financiero (53), los impuestos que son
 * gasto (5115) y los «no gasto». Lo demás lleva factura o documento soporte
 * y retención: va por Compras. La misma regla que el backend.
 */
export function admiteSinFactura(c: Concepto): boolean {
  if (c.automatico) return false;
  if (c.tipo === "NO_GASTO" || c.tipo === "INGRESO") return true;
  const codigo = c.cuenta?.codigo ?? "";
  return codigo.startsWith("53") || codigo.startsWith("5115");
}

/**
 * Un ingreso o un egreso sin factura: se elige el concepto, nunca la cuenta.
 * Ingresos → Cobros «Ingresos sin factura»; Egresos → Pagos «Sin factura».
 */
/** Lo que ya se sabe del pago, si viene de un programado. */
export interface InicialMovimiento {
  detalle: string;
  conceptoId: string | null;
  valor: number;
}

export function MovimientoConceptoDialog({
  abierto,
  direccion,
  onCerrar,
  inicial,
  onRegistrado,
}: {
  abierto: boolean;
  direccion: Direccion;
  onCerrar: () => void;
  inicial?: InicialMovimiento;
  /** Después de guardar, antes de cerrar: el programado lo usa para quedar pagado. */
  onRegistrado?: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {abierto && (
          <Formulario direccion={direccion} onCerrar={onCerrar} inicial={inicial} onRegistrado={onRegistrado} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Una línea del formulario: un concepto y su valor. */
interface Linea {
  clave: number;
  concepto: Concepto | null;
  valor: string;
  /** Lo que la línea es en la plantilla: «Capital», «Intereses». */
  etiqueta?: string;
}

/**
 * Atajos para lo más común (lienzo «Pagos que no son gasto»): arman las
 * líneas con sus conceptos. La cuota de un préstamo es un solo comprobante
 * con capital e intereses (PC14); los intereses del banco entran brutos, con
 * la retención que el banco hizo (PC17).
 */
const PLANTILLAS: Record<Direccion, Array<{ nombre: string; lineas: Array<{ codigo: string; etiqueta: string }>; retencion?: boolean }>> = {
  SALIDA: [
    { nombre: "Cuota de préstamo", lineas: [{ codigo: "NG-CREDITO-ABONO", etiqueta: "Capital" }, { codigo: "GTO-INTERESES", etiqueta: "Intereses" }] },
    { nombre: "Nómina", lineas: [{ codigo: "NG-PAGO-NOMINA", etiqueta: "Nómina" }] },
    {
      nombre: "Seguridad social (PILA)",
      lineas: [
        { codigo: "NG-PAGO-SEG-SOCIAL", etiqueta: "Salud, pensión y ARL" },
        { codigo: "NG-PAGO-PARAFISCALES", etiqueta: "Parafiscales" },
      ],
    },
    { nombre: "Préstamo a socio", lineas: [{ codigo: "NG-PRESTAMO-SOCIO", etiqueta: "Préstamo" }] },
    { nombre: "Dividendos", lineas: [{ codigo: "NG-DIVIDENDOS", etiqueta: "Dividendos" }] },
  ],
  ENTRADA: [
    { nombre: "Intereses del banco", lineas: [{ codigo: "ING-INTERESES", etiqueta: "Intereses brutos" }], retencion: true },
    { nombre: "Préstamo recibido", lineas: [{ codigo: "NG-CREDITO-RECIBIDO", etiqueta: "Desembolso" }] },
    { nombre: "Recuperaciones", lineas: [{ codigo: "ING-RECUPERACIONES", etiqueta: "Recuperación" }] },
    { nombre: "Aprovechamientos", lineas: [{ codigo: "ING-APROVECHAMIENTOS", etiqueta: "Aprovechamiento" }] },
  ],
};

const NOMBRE_RETENCION = { RENTA: "Retención en la fuente (135515)", IVA: "ReteIVA (135517)", ICA: "ReteICA (135518)" } as const;
type TipoRetencion = keyof typeof NOMBRE_RETENCION;

let siguienteClave = 1;
const lineaNueva = (concepto: Concepto | null = null, etiqueta?: string): Linea => ({ clave: siguienteClave++, concepto, valor: "", etiqueta });

function Formulario({
  direccion,
  onCerrar,
  inicial,
  onRegistrado,
}: {
  direccion: Direccion;
  onCerrar: () => void;
  inicial?: InicialMovimiento;
  onRegistrado?: () => void;
}) {
  const queryClient = useQueryClient();
  const entra = direccion === "ENTRADA";
  const [fecha, setFecha] = useState(hoy());
  const [lineasElegidas, setLineas] = useState<Linea[]>(() => [
    inicial ? { ...lineaNueva(), valor: String(inicial.valor) } : lineaNueva(),
  ]);
  const [plantilla, setPlantilla] = useState<string | null>(null);
  const [tercero, setTercero] = useState<TerceroResumen | null>(null);
  const [medio, setMedio] = useState<Medio>(entra ? "BANCO" : "CAJA");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [detalle, setDetalle] = useState(inicial?.detalle ?? "");
  const [conRetencion, setConRetencion] = useState(false);
  const [tipoRetencion, setTipoRetencion] = useState<TipoRetencion>("RENTA");
  const [retencion, setRetencion] = useState("");
  const { data: conceptos = [] } = useQuery({ queryKey: ["conceptos", false], queryFn: () => conceptosApi.listar() });
  // El concepto del programado va en la primera línea mientras no se elija otro.
  const conceptoInicial = inicial?.conceptoId ? (conceptos.find((x) => x.id === inicial.conceptoId) ?? null) : null;
  const lineas = lineasElegidas.map((l, i) =>
    i === 0 && l.concepto === null && conceptoInicial ? { ...l, concepto: conceptoInicial } : l,
  );

  const total = lineas.reduce((t, l) => t + (Number(l.valor) || 0), 0);
  const retenido = entra && conRetencion ? Number(retencion) || 0 : 0;
  const mueve = total - retenido;
  const { data: gmf = 0 } = useQuery({
    queryKey: ["tesoreria", "gmf-previsto", cuenta?.id, mueve],
    queryFn: () => movimientosConceptoApi.gmfPrevisto(cuenta!.id, mueve),
    enabled: !entra && medio === "BANCO" && cuenta !== null && mueve > 0,
  });

  const usar = (nombre: string) => {
    const p = PLANTILLAS[direccion].find((x) => x.nombre === nombre);
    if (p === undefined) return;
    setPlantilla(nombre);
    setLineas(p.lineas.map((l) => lineaNueva(conceptos.find((c) => c.codigo === l.codigo) ?? null, l.etiqueta)));
    setConRetencion(p.retencion === true);
    if (detalle.trim() === "") setDetalle(nombre);
  };
  const cambiar = (clave: number, cambio: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));

  const problema =
    lineas.some((l) => l.concepto === null)
      ? "Elegí el concepto de cada línea."
      : lineas.some((l) => !(Number(l.valor) > 0))
        ? "Escribí el valor de cada línea."
        : detalle.trim().length < 3
          ? "Contá de qué fue."
          : conRetencion && !(retenido > 0)
            ? "Escribí cuánto te retuvieron, o quitá la retención."
            : conRetencion && retenido >= total
              ? "La retención no puede ser todo el valor."
              : conRetencion && tercero === null
                ? "Decí quién te retuvo: la retención va a su nombre."
                : (problemaDelMedio(medio, caja, cuenta) ?? null);

  const guardar = useMutation({
    mutationFn: () =>
      movimientosConceptoApi.crear({
        direccion,
        medio,
        cajaId: medio === "CAJA" ? caja!.id : undefined,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : undefined,
        fecha,
        terceroId: tercero?.id,
        detalle: detalle.trim(),
        lineas: lineas.map((l) => ({ conceptoId: l.concepto!.id, valor: Number(l.valor) })),
        retencion: conRetencion ? { tipo: tipoRetencion, valor: retenido } : undefined,
      }),
    onSuccess: async () => {
      await Promise.all(
        [["movimientos-concepto"], ["cajas"], ["cuentas-bancarias"], ["pagos", "egresos"]].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito(entra ? "Ingreso registrado" : "Pago registrado", formatCOP(mueve));
      onRegistrado?.();
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
              ? "Plata que entra sin una factura de venta: intereses, un préstamo, una recuperación. Si le vendiste algo a alguien, eso va con factura en Ventas."
              : "Lo financiero y lo que no es gasto: una cuota, la nómina, la PILA, un préstamo a un socio. Lo que lleva factura (un activo, un flete) va por Compras; los impuestos, desde Impuestos."}
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium">{entra ? "Qué entró" : "Qué estás pagando"}</p>
          <div className="flex flex-wrap gap-1.5">
            {PLANTILLAS[direccion].map((p) => (
              <button
                key={p.nombre}
                type="button"
                aria-pressed={plantilla === p.nombre}
                onClick={() => usar(p.nombre)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  plantilla === p.nombre ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
                }`}
              >
                {p.nombre}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={plantilla === null}
              onClick={() => {
                setPlantilla(null);
                setLineas([lineaNueva()]);
                setConRetencion(false);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                plantilla === null ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
              }`}
            >
              Otro…
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {lineas.map((l, i) => (
            <div key={l.clave} className="grid items-end gap-3 md:grid-cols-[1.4fr_0.8fr_auto]">
              <Campo id={`mov-concepto-${l.clave}`} etiqueta={l.etiqueta ?? (lineas.length > 1 ? `Concepto ${i + 1}` : "Concepto")}>
                <SelectorConcepto
                  id={`mov-concepto-${l.clave}`}
                  tipos={entra ? ["INGRESO", "NO_GASTO"] : ["GASTO", "COSTO", "NO_GASTO"]}
                  valor={l.concepto}
                  onElegir={(c) => cambiar(l.clave, { concepto: c })}
                  filtro={entra ? undefined : admiteSinFactura}
                />
              </Campo>
              <Campo id={`mov-valor-${l.clave}`} etiqueta="Valor">
                <CampoPesos
                  value={l.valor}
                  onChange={(v) => cambiar(l.clave, { valor: v })}
                  placeholder="0"
                  aria-label={`Valor de ${l.etiqueta ?? `la línea ${i + 1}`}`}
                  className="h-11 rounded-xl px-4 text-right font-mono"
                />
              </Campo>
              {lineas.length > 1 ? (
                <Button type="button" variant="ghost" className="size-11 rounded-xl p-0" aria-label="Quitar la línea" onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}>
                  <X className="size-4" />
                </Button>
              ) : (
                <span className="hidden md:block md:w-11" />
              )}
              {l.concepto?.cuenta && (
                <p className="-mt-1 text-xs text-muted-foreground md:col-span-3">
                  Va a <span className="font-mono">{l.concepto.cuenta.codigo}</span> {l.concepto.cuenta.nombre}
                  {l.concepto.afectaResultado ? "" : " · no es gasto"}
                </p>
              )}
            </div>
          ))}
          {lineas.length < 10 && (
            <Button type="button" variant="outline" className="h-9 self-start rounded-lg px-3" onClick={() => setLineas((ls) => [...ls, lineaNueva()])}>
              <Plus className="size-4" /> Otra línea
            </Button>
          )}
        </div>

        {entra && (
          <div className="rounded-2xl border border-border p-4">
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Checkbox checked={conRetencion} onCheckedChange={(v) => setConRetencion(v === true)} />
              Te retuvieron algo
            </label>
            {conRetencion && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Campo id="mov-ret-tipo" etiqueta="Qué retención">
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(NOMBRE_RETENCION) as TipoRetencion[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={tipoRetencion === t}
                        onClick={() => setTipoRetencion(t)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${tipoRetencion === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
                      >
                        {NOMBRE_RETENCION[t]}
                      </button>
                    ))}
                  </div>
                </Campo>
                <Campo id="mov-ret-valor" etiqueta="Cuánto" ayuda={tipoRetencion === "RENTA" && plantilla === "Intereses del banco" && total > 0 ? `El banco retiene el 7 %: ${formatCOP(Math.round(total * 0.07))}.` : undefined}>
                  <CampoPesos value={retencion} onChange={setRetencion} placeholder="0" aria-label="Retención" className="h-11 rounded-xl px-4 text-right font-mono" />
                </Campo>
                <p className="text-xs text-muted-foreground md:col-span-2">
                  El ingreso va bruto; lo retenido queda como anticipo de impuestos. Entra {formatCOP(Math.max(0, mueve))}.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Campo id="mov-medio" etiqueta={entra ? "Entra a" : "Sale de"}>
            <SelectorMedio medio={medio} onMedio={setMedio} caja={caja} onCaja={setCaja} cuenta={cuenta} onCuenta={setCuenta} />
          </Campo>
          <Campo id="mov-fecha" etiqueta="Fecha">
            <Input id="mov-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-xl px-4" />
          </Campo>
        </div>

        <Campo id="mov-tercero" etiqueta={conRetencion ? "Quién te retuvo" : "A nombre de (opcional)"}>
          {entra ? <SelectorTercero valor={tercero} onElegir={setTercero} /> : <SelectorProveedor valor={tercero} onElegir={setTercero} />}
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

        <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
          <span className="font-semibold">{entra ? "Entra en total" : "Sale en total"}</span>
          <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
            {formatCOP(Math.max(0, mueve))}
            {gmf > 0 && <span className="block text-right text-xs font-normal text-muted-foreground">+ 4×1000 {formatCOP(gmf)}</span>}
          </span>
        </div>
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
            Guardar comprobante
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
