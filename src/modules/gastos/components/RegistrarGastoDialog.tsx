"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Sparkles } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { ErrorDeCampo } from "@/components/shared/ErrorDeCampo";
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
import { useAuthStore } from "@/core/store/authStore";
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP } from "@/lib/utils";
import { ROLES_MARIA } from "@/modules/asistente/hooks/usePendientes";
import { lineaCompraVacia, type LineaCompraBorrador } from "@/modules/compras/components/EditorLineasCompra";
import { SelectorProveedor } from "@/modules/compras/components/SelectorProveedor";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
import { conceptosApi } from "@/modules/conceptos/services/conceptos.service";
import type { Concepto } from "@/modules/conceptos/types/conceptos.types";
import { Campo } from "@/modules/configuracion/components/Campo";
import { CentroDelDocumento } from "@/modules/plan-cuentas/components/CentroDelDocumento";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { admiteSinFactura } from "@/modules/tesoreria/components/MovimientoConceptoDialog";
import { problemaDelMedio, SelectorMedio, type Medio } from "@/modules/tesoreria/components/SelectorMedio";
import { movimientosConceptoApi } from "@/modules/tesoreria/services/movimientos-concepto.service";
import type { CuentaBancariaResumen } from "@/modules/tesoreria/types/bancos.types";
import type { CajaResumen } from "@/modules/tesoreria/types/tesoreria.types";
import { gastosApi } from "../services/gastos.service";
import { PALABRAS_CERTEZA } from "../types/gastos.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Lo que el diálogo le pasa a Compras cuando el gasto trae factura. */
export interface CompraDesdeGasto {
  proveedor: TerceroResumen | null;
  lineas: LineaCompraBorrador[];
}

/**
 * Registrar un gasto: qué se pagó, el concepto —María sugiere uno, la
 * persona confirma— y por dónde va.
 *
 * Gastos no tiene documento propio. Con factura o documento soporte sigue en
 * Compras, que calcula el IVA y la retención; sin factura sale por Pagos como
 * un pago por concepto, y eso solo vale para lo que no lleva soporte: lo
 * financiero, los impuestos que son gasto y lo que no es gasto.
 */
export function RegistrarGastoDialog({
  abierto,
  onCerrar,
  onConFactura,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** Abrir la compra con esto ya puesto. */
  onConFactura: (compra: CompraDesdeGasto) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="pantalla">
        {abierto && <Formulario onCerrar={onCerrar} onConFactura={onConFactura} />}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  onCerrar,
  onConFactura,
}: {
  onCerrar: () => void;
  onConFactura: (compra: CompraDesdeGasto) => void;
}) {
  const queryClient = useQueryClient();
  const veMaria = useAuthStore((s) => ROLES_MARIA.some((r) => s.roles.includes(r)));
  const [descripcion, setDescripcion] = useState("");
  // El centro de costo del gasto. `null`: el que proponga el servidor.
  const [centro, setCentro] = useState<string | null>(null);
  const [tercero, setTercero] = useState<TerceroResumen | null>(null);
  const [concepto, setConcepto] = useState<Concepto | null>(null);
  const [conFactura, setConFactura] = useState(false);
  const [fecha, setFecha] = useState(hoy());
  const [valor, setValor] = useState("");
  const [medio, setMedio] = useState<Medio>("CAJA");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);

  const { data: conceptos = [] } = useQuery({
    queryKey: ["conceptos", false],
    queryFn: () => conceptosApi.listar(),
    staleTime: 60_000,
  });

  // María sugiere cuando hay algo que leer: la descripción o el tercero.
  const descripcionQuieta = useQuieto(descripcion.trim());
  const { data: sugerencia, isFetching: pensando } = useQuery({
    queryKey: ["gastos", "sugerir", descripcionQuieta, tercero?.id],
    queryFn: () => gastosApi.sugerir(descripcionQuieta, tercero?.id),
    enabled: descripcionQuieta.length >= 3 || tercero !== null,
  });
  const sugerido = conceptos.find((c) => c.id === sugerencia?.conceptoId) ?? null;

  const sinFacturaVale = concepto !== null && admiteSinFactura(concepto);
  const porCompras = conFactura || !sinFacturaVale;

  // Lo que está mal, campo por campo. Se muestra debajo de cada uno cuando se
  // intentó guardar; antes, solo el primero, como pista al pie.
  const [intentado, setIntentado] = useState(false);
  const errores = {
    descripcion: descripcion.trim().length < 2 ? "Escriba qué se pagó." : null,
    concepto: concepto === null ? "Elija el concepto." : null,
    valor: !porCompras && !(Number(valor) > 0) ? "El valor tiene que ser mayor que cero." : null,
    fecha: !porCompras && fecha === "" ? "Elija la fecha." : null,
    // El banco admite sobregiro; la caja no puede quedar en negativo.
    medio: porCompras
      ? null
      : (problemaDelMedio(medio, caja, cuenta) ??
        (medio === "CAJA" && caja !== null && Number(valor) > Number(caja.saldo)
          ? `Para un gasto de ${formatCOP(Number(valor))} no alcanza: en ${caja.nombre} hay ${formatCOP(Number(caja.saldo))}.`
          : null)),
  };
  const problema = Object.values(errores).find((e) => e !== null) ?? null;
  const verError = (campo: keyof typeof errores) => (intentado ? errores[campo] : null);
  /** Guarda si todo está bien; si no, marca lo que falta. */
  const siEstaBien = (hacer: () => void) => () => {
    if (problema !== null) {
      setIntentado(true);
      return;
    }
    hacer();
  };

  const guardar = useMutation({
    mutationFn: () =>
      movimientosConceptoApi.crear({
        direccion: "SALIDA",
        medio,
        cajaId: medio === "CAJA" ? caja!.id : undefined,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : undefined,
        fecha,
        conceptoId: concepto!.id,
        terceroId: tercero?.id,
        detalle: descripcion.trim(),
        valor: Number(valor),
        ...(centro !== null && { centroCostoId: centro }),
      }),
    onSuccess: async (m) => {
      await Promise.all(
        [["gastos"], ["movimientos-concepto"], ["cajas"], ["cuentas-bancarias"]].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito("Gasto registrado", `${m.conceptoNombre}: salieron ${formatCOP(m.valorMovido)}.`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const seguirEnCompras = () => {
    const linea: LineaCompraBorrador = {
      ...lineaCompraVacia("GASTO"),
      concepto,
      detalle: descripcion.trim(),
      costoUnitario: Number(valor) > 0 ? valor : "",
    };
    onConFactura({ proveedor: tercero, lineas: [linea] });
  };

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>Elija el concepto; la cuenta la pone el sistema.</DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
        {/* Lienzo 68: la pregunta va primero. «Sin factura» es lo de todos los
            días (un flete, un domicilio); si el concepto pide soporte, pasa a Compras. */}
        <div>
          <p className="mb-2 text-sm font-medium">¿Tiene factura?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Opcion
              elegida={!porCompras}
              deshabilitada={concepto !== null && !sinFacturaVale}
              onElegir={() => setConFactura(false)}
              titulo="Sin factura"
              detalle={
                concepto !== null && !sinFacturaVale
                  ? "Este gasto lleva factura o documento soporte: va por Compras."
                  : "Sale por Pagos: intereses, impuestos, lo que no lleva soporte."
              }
            />
            <Opcion
              elegida={porCompras}
              onElegir={() => setConFactura(true)}
              titulo="Con factura o documento soporte"
              detalle="Sigue en Compras, con su IVA y su retención."
            />
          </div>
        </div>

        {/* La foto del recibo la lee María en su lectura de documentos (§1.4):
            no hay una lectura aparte para el gasto. */}
        {veMaria && (
          <Link
            href="/dashboard/asistente"
            className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border px-4 py-5 text-center hover:bg-accent sm:flex-row sm:gap-3 sm:py-3 sm:text-left"
          >
            <Camera className="size-5 text-muted-foreground" />
            <span className="text-sm font-semibold">Tomar foto del recibo</span>
            <span className="text-xs text-muted-foreground">María lo lee y arma la compra</span>
          </Link>
        )}
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <Campo id="gasto-descripcion" etiqueta="Qué se pagó">
            <Input
              id="gasto-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Flete Apartadó – Chigorodó, mercancía a la sede"
              maxLength={200}
              className="h-11 rounded-xl px-4"
              aria-invalid={verError("descripcion") !== null}
              aria-describedby="gasto-descripcion-error"
            />
            <ErrorDeCampo id="gasto-descripcion-error" mensaje={verError("descripcion")} />
          </Campo>
          <Campo id="gasto-tercero" etiqueta="A quién (opcional)">
            <SelectorProveedor valor={tercero} onElegir={setTercero} />
          </Campo>
        </div>

        {(sugerencia || pensando) && (
          <div className="rounded-2xl bg-muted p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-brand" />
              {pensando && sugerencia === undefined ? (
                "María está mirando…"
              ) : sugerido ? (
                <>María sugiere: {sugerido.nombre}</>
              ) : (
                "María no está segura"
              )}
              {sugerencia && (
                <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[11px] font-medium">
                  {PALABRAS_CERTEZA[sugerencia.certeza]}
                </span>
              )}
            </p>
            {sugerencia && <p className="mt-1 text-sm text-muted-foreground">{sugerencia.motivo}</p>}
            {sugerido && concepto?.id !== sugerido.id && (
              <Button type="button" className="mt-3 h-9 rounded-lg px-4" onClick={() => setConcepto(sugerido)}>
                Usar este concepto
              </Button>
            )}
          </div>
        )}

        <Campo id="gasto-concepto" etiqueta="Concepto">
          <SelectorConcepto
            id="gasto-concepto"
            tipos={["GASTO", "COSTO"]}
            valor={concepto}
            onElegir={setConcepto}
            filtro={(c) => c.cuenta !== null}
          />
          <ErrorDeCampo id="gasto-concepto-error" mensaje={verError("concepto")} />
        </Campo>
        {/* E25: a quien registra no se le muestra la cuenta; la pone el concepto. */}
        {concepto !== null && concepto.operacional !== null && (
          <p className="-mt-3 text-xs text-muted-foreground">
            {concepto.operacional ? "Gasto de la operación" : "No es de la operación"}
          </p>
        )}
        {!porCompras && <CentroDelDocumento valor={centro} onCambiar={setCentro} className="max-w-sm" />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="gasto-valor" etiqueta={porCompras ? "Valor antes de IVA (opcional)" : "Valor"}>
            <CampoPesos
              id="gasto-valor"
              value={valor}
              onChange={setValor}
              className="h-11 rounded-xl px-4 text-right font-mono"
              aria-invalid={verError("valor") !== null}
              aria-describedby="gasto-valor-error"
            />
            <ErrorDeCampo id="gasto-valor-error" mensaje={verError("valor")} />
          </Campo>
          {!porCompras && (
            <Campo id="gasto-fecha" etiqueta="Fecha">
              <Input
                id="gasto-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 rounded-xl px-4"
                aria-invalid={verError("fecha") !== null}
                aria-describedby="gasto-fecha-error"
              />
              <ErrorDeCampo id="gasto-fecha-error" mensaje={verError("fecha")} />
            </Campo>
          )}
        </div>
        {!porCompras && (
          <Campo id="gasto-medio" etiqueta="Sale de">
            <SelectorMedio medio={medio} onMedio={setMedio} caja={caja} onCaja={setCaja} cuenta={cuenta} onCuenta={setCuenta} />
            <ErrorDeCampo id="gasto-medio-error" mensaje={verError("medio")} />
          </Campo>
        )}
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {(intentado && problema !== null ? "Revise lo marcado en rojo." : problema) ??
            (porCompras
              ? "Se abre la compra con esto puesto: falta el número de la factura."
              : "Queda como pago sin factura en Pagos.")}
        </p>
        {/* En el móvil, un solo botón de ancho completo: la X de arriba cancela. */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="hidden h-12 rounded-xl px-6 sm:inline-flex" onClick={onCerrar}>
            Cancelar
          </Button>
          {porCompras ? (
            <Button type="button" className="h-12 w-full rounded-xl px-6 sm:w-auto" onClick={siEstaBien(seguirEnCompras)}>
              Seguir en Compras
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 w-full rounded-xl px-6 sm:w-auto"
              disabled={guardar.isPending}
              onClick={siEstaBien(() => guardar.mutate())}
            >
              {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar gasto
              {Number(valor) > 0 && <span className="font-mono">· {formatCOP(Number(valor))}</span>}
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  );
}

function Opcion({
  elegida,
  deshabilitada = false,
  onElegir,
  titulo,
  detalle,
}: {
  elegida: boolean;
  deshabilitada?: boolean;
  onElegir: () => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={elegida}
      disabled={deshabilitada}
      onClick={onElegir}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        elegida ? "border-foreground" : "border-border hover:bg-accent/60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-full border",
          elegida ? "border-[5px] border-foreground" : "border-muted-foreground",
        )}
      />
      <span>
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
    </button>
  );
}
