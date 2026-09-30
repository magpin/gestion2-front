"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet, X } from "lucide-react";

import { BotonImprimir } from "@/components/shared/BotonImprimir";
import { CampoPesos } from "@/components/shared/CampoNumero";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { funcionActiva } from "@/core/config/funciones";
import { cn, formatCOP, hoyEnColombia } from "@/lib/utils";
import { cobrosApi } from "@/modules/cobros/services/cobros.service";
import { Campo } from "@/modules/configuracion/components/Campo";
import { fechaCorta } from "@/modules/impuestos/lib/impuestos";
import { pagosApi } from "@/modules/pagos/services/pagos.service";
import { facturasApi } from "@/modules/ventas/services/ventas.service";
import type { CajaResumen } from "../types/tesoreria.types";
import type { CuentaBancariaResumen } from "../types/bancos.types";
import type { DatosDevolucion, DevolucionAnticipo } from "../types/anticipos.types";
import { problemaDelMedio, SelectorMedio, type Medio } from "./SelectorMedio";

/** Un anticipo, de cliente o a proveedor, en la forma común de la pantalla. */
interface Anticipo {
  movimientoId: string;
  terceroId: string;
  tercero: string;
  documento: string | null;
  fecha: string;
  detalle: string;
  total: number;
  pendiente: number;
  documentosPendientes: number;
  /** El comprobante que lo pagó, para «Ver» (solo proveedores). */
  comprobanteId?: string | null;
  /** El documento con el que ya se puede legalizar: «FC-771». */
  primerDocumento?: string | null;
}

/** Una factura o compra con saldo, a la que se aplica el anticipo. */
interface Documento {
  id: string;
  numero: string;
  venceEfectivo: string;
  pendiente: number;
}

interface Lado {
  llave: string[];
  /** «Anticipo», «Saldo a favor»: qué se aplica. */
  nombreOrigen: string;
  /** El saldo a favor no lleva asiento al cruzarse: la plata ya está en Clientes. */
  cruceSinAsiento?: boolean;
  /** Si la devolución pide el motivo. */
  pideMotivo: boolean;
  /** «Anticipos por aplicar». */
  titulo: string;
  explicacion: string;
  /** Lo que se dice cuando no hay nada: cada lado explica lo suyo. */
  vacio: { titulo: string; descripcion: string };
  /** «los anticipos», «los saldos a favor»: para el error de carga. */
  loQueSeLee: string;
  /** Los documentos del tercero con los que se puede cruzar: «factura por cobrar». */
  pendiente: [string, string];
  unidad: [string, string];
  columnaTotal: string;
  columnaPendiente: string;
  /** «Cruzar», «Legalizar». */
  accion: string;
  /** Proveedores (lienzo 28): columna Estado, la factura antes del anticipo y «Legalizar con FC-771». */
  conEstado?: boolean;
  /** Facturarle al tercero lo que dejó: lleva a la factura nueva ya llena. */
  sinDocumento: { etiqueta: string; href: (a: Anticipo) => string } | null;
  esperando: string;
  cuenta: { codigo: string; nombre: string };
  contra: { codigo: string; nombre: string };
  /** De qué lado va el anticipo en el libro al cruzarlo: débito para el del cliente (pasivo). */
  anticipoAlDebito: boolean;
  /** «Queda debiendo», «Te falta pagar». */
  queda: string;
  /** La plata sale (cliente) o entra (proveedor) al devolverlo. */
  devolucionSale: boolean;
  /** Al devolver por banco, el 4×1000 sale de la plata del cliente (decisión del dueño, 30 sep). */
  gmfLoAsumeElCliente?: boolean;
  listar: () => Promise<{ total: number; terceros: number; anticipos: Anticipo[]; devoluciones: DevolucionAnticipo[] }>;
  documentosDe: (terceroId: string) => Promise<Documento[]>;
  cruzar: (a: Anticipo, d: Documento, valor: number, fecha: string) => Promise<unknown>;
  devolver: (id: string, datos: DatosDevolucion) => Promise<unknown>;
  anularDevolucion: (id: string, motivo: string) => Promise<unknown>;
  invalidar: string[][];
}

/** La factura nueva, arrancando desde el anticipo o el cliente; sin la página, Ventas. */
function facturaNueva(consulta: string): string {
  return funcionActiva("facturaPagina") ? `/dashboard/ventas/nueva?${consulta}` : "/dashboard/ventas";
}

export const CLIENTES: Lado = {
  llave: ["cartera", "anticipos"],
  nombreOrigen: "Anticipo",
  pideMotivo: true,
  titulo: "Anticipos por aplicar",
  explicacion: "Plata de clientes que todavía no es venta. Está en 280505 hasta que factures o la devuelvas.",
  vacio: {
    titulo: "No hay anticipos pendientes",
    descripcion: "Cuando un cliente deje plata para un pedido, se registra con «Recibir anticipo» y aparece aquí.",
  },
  loQueSeLee: "los anticipos de clientes",
  pendiente: ["factura por cobrar", "facturas por cobrar"],
  unidad: ["cliente", "clientes"],
  columnaTotal: "Recibido",
  columnaPendiente: "Por aplicar",
  accion: "Cruzar",
  sinDocumento: { etiqueta: "Facturar", href: (a) => facturaNueva(`anticipo=${a.movimientoId}`) },
  esperando: "sin factura aún",
  cuenta: { codigo: "280505", nombre: "Anticipos de clientes" },
  contra: { codigo: "130505", nombre: "Clientes" },
  anticipoAlDebito: true,
  queda: "Queda debiendo",
  devolucionSale: true,
  gmfLoAsumeElCliente: true,
  listar: async () => {
    const r = await cobrosApi.anticipos();
    return {
      total: r.total,
      terceros: r.clientes,
      devoluciones: r.devoluciones,
      anticipos: r.anticipos.map((a) => ({
        movimientoId: a.movimientoId,
        terceroId: a.terceroId,
        tercero: a.tercero,
        documento: a.recibo,
        fecha: a.fecha,
        detalle: a.detalle,
        total: a.recibido,
        pendiente: a.porAplicar,
        documentosPendientes: a.facturasPendientes,
      })),
    };
  },
  documentosDe: (id) => cobrosApi.facturasDe(id),
  cruzar: (a, d, valor, fecha) =>
    cobrosApi.crearCruce({ tipo: "ANTICIPO", origenId: a.movimientoId, destinoFacturaId: d.id, valor, fecha }),
  devolver: cobrosApi.devolverAnticipo,
  anularDevolucion: cobrosApi.anularDevolucion,
  invalidar: [["cartera"], ["facturas"], ["cruces-cartera"], ["cajas"], ["cuentas-bancarias"], ["pagos", "egresos"]],
};

export const PROVEEDORES: Lado = {
  llave: ["pagos", "anticipos"],
  nombreOrigen: "Anticipo",
  pideMotivo: true,
  titulo: "Anticipos por legalizar",
  explicacion: "Plata que ya diste y todavía no tiene factura. Está en 133005 hasta que llegue la compra o te la devuelvan.",
  vacio: {
    titulo: "No hay anticipos pendientes",
    descripcion: "Cuando le des plata a un proveedor antes de la factura, registrala como anticipo en el comprobante de egreso.",
  },
  loQueSeLee: "los anticipos a proveedores",
  pendiente: ["compra por pagar", "compras por pagar"],
  unidad: ["proveedor", "proveedores"],
  columnaTotal: "Anticipo",
  columnaPendiente: "Por legalizar",
  accion: "Legalizar",
  conEstado: true,
  sinDocumento: null,
  esperando: "esperando la factura",
  cuenta: { codigo: "133005", nombre: "Anticipos a proveedores" },
  contra: { codigo: "220505", nombre: "Proveedores" },
  anticipoAlDebito: false,
  queda: "Te falta pagar",
  devolucionSale: false,
  listar: async () => {
    const r = await pagosApi.anticipos();
    return {
      total: r.total,
      terceros: r.proveedores,
      devoluciones: r.devoluciones,
      anticipos: r.anticipos.map((a) => ({
        movimientoId: a.movimientoId,
        terceroId: a.terceroId,
        tercero: a.tercero,
        documento: a.comprobante,
        comprobanteId: a.comprobanteId,
        primerDocumento: a.primeraCompra,
        fecha: a.fecha,
        detalle: a.detalle,
        total: a.anticipo,
        pendiente: a.porLegalizar,
        documentosPendientes: a.comprasPendientes,
      })),
    };
  },
  documentosDe: (id) => pagosApi.comprasDe(id),
  cruzar: (a, d, valor, fecha) =>
    pagosApi.crearCruce({ origenId: a.movimientoId, destinoCompraId: d.id, valor, fecha }),
  devolver: pagosApi.devolverAnticipo,
  anularDevolucion: pagosApi.anularDevolucion,
  invalidar: [["pagos"], ["compras"], ["cruces-pago"], ["cajas"], ["cuentas-bancarias"]],
};

/**
 * Anticipos → Saldos a favor (E1): lo que sobra de una nota crédito que cayó
 * sobre una factura ya pagada. No se vuelve a cruzar la nota con su factura
 * (ya la bajó al emitirse): el saldo se aplica a otra factura del cliente, o
 * se le devuelve.
 */
export const SALDOS_A_FAVOR: Lado = {
  llave: ["cartera", "saldos-a-favor"],
  nombreOrigen: "Saldo a favor",
  cruceSinAsiento: true,
  pideMotivo: false,
  titulo: "Saldos a favor de clientes",
  explicacion:
    "Una nota crédito sobre una factura que ya estaba pagada deja plata a favor del cliente: se cruza con otra factura suya o se le devuelve.",
  vacio: {
    titulo: "Ningún cliente tiene saldo a favor",
    descripcion:
      "Aparece acá cuando una nota crédito cae sobre una factura que ya estaba pagada: esa plata se cruza con otra factura del cliente o se le devuelve desde acá mismo.",
  },
  loQueSeLee: "los saldos a favor",
  pendiente: ["factura por cobrar", "facturas por cobrar"],
  unidad: ["cliente", "clientes"],
  columnaTotal: "A favor",
  columnaPendiente: "Por aplicar",
  accion: "Cruzar",
  sinDocumento: { etiqueta: "Facturar", href: (a) => facturaNueva(`cliente=${a.terceroId}`) },
  esperando: "sin otra factura por cobrar",
  cuenta: { codigo: "130505", nombre: "Clientes" },
  contra: { codigo: "130505", nombre: "Clientes" },
  anticipoAlDebito: true,
  queda: "Queda debiendo",
  devolucionSale: true,
  gmfLoAsumeElCliente: true,
  listar: async () => {
    const r = await cobrosApi.saldosAFavor();
    return {
      total: r.total,
      terceros: r.clientes,
      devoluciones: [],
      anticipos: r.saldos.map((s) => ({
        movimientoId: s.facturaId,
        terceroId: s.terceroId,
        tercero: s.tercero,
        documento: s.nota ? `${s.factura} · ${s.nota}` : s.factura,
        fecha: s.fecha,
        detalle: "",
        total: s.saldo,
        pendiente: s.saldo,
        documentosPendientes: s.facturasPendientes,
      })),
    };
  },
  documentosDe: (id) => cobrosApi.facturasDe(id),
  cruzar: (a, d, valor, fecha) =>
    cobrosApi.crearCruce({ tipo: "SALDO_A_FAVOR", origenId: a.movimientoId, destinoFacturaId: d.id, valor, fecha }),
  // Devolverlo es la devolución de cobro de siempre sobre esa factura.
  devolver: (id, d) =>
    facturasApi.devolverCobro(id, {
      fecha: d.fecha,
      pagos: [
        d.medio === "CAJA"
          ? { medio: "CAJA", cajaId: d.cajaId!, valor: d.valor }
          : { medio: "BANCO", cuentaBancariaId: d.cuentaBancariaId!, valor: d.valor },
      ],
    }),
  anularDevolucion: async () => undefined,
  invalidar: [["cartera"], ["facturas"], ["cruces-cartera"], ["cajas"], ["cuentas-bancarias"], ["recibos-caja"]],
};

type Panel = { tipo: "CRUZAR" | "DEVOLVER"; anticipo: Anticipo } | null;

/**
 * Anticipos de clientes o a proveedores, todos a la vez (PC19): no hay que
 * elegir el tercero antes. Cada uno se cruza con su factura o se devuelve, en
 * un panel al lado, con lo que queda en el libro a la vista.
 */
export function AnticiposGlobales({ lado, puedeMover }: { lado: Lado; puedeMover: boolean }) {
  const [panel, setPanel] = useState<Panel>(null);
  const consulta = useQuery({ queryKey: lado.llave, queryFn: lado.listar, meta: SILENCIOSO });
  const data = consulta.data;

  if (data === undefined) {
    return consulta.isError ? (
      <ErrorCarga error={consulta.error} titulo={`No se pudieron leer ${lado.loQueSeLee}`} onReintentar={consulta.refetch} />
    ) : (
      <SkeletonTable />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{lado.titulo}</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{formatCOP(data.total)}</p>
            <p className="text-sm text-muted-foreground">
              {data.terceros} {data.terceros === 1 ? lado.unidad[0] : lado.unidad[1]}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{lado.explicacion}</p>
        </section>

        {data.anticipos.length === 0 ? (
          <EmptyState titulo={lado.vacio.titulo} descripcion={lado.vacio.descripcion} icon={Wallet} />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-3">{lado.unidad[0]}</th>
                  {lado.conEstado ? (
                    <>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3 text-right">{lado.columnaTotal}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3 text-right">{lado.columnaTotal}</th>
                      <th className="px-3 py-3 text-right">{lado.columnaPendiente}</th>
                    </>
                  )}
                  {puedeMover && (
                    <th className="px-5 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.anticipos.map((a) => {
                  const activo = panel?.anticipo.movimientoId === a.movimientoId;
                  return (
                    <tr key={a.movimientoId} className={cn("border-t border-border", activo && "bg-accent/50")}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{a.tercero}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            a.documento,
                            fechaCorta(a.fecha).toLowerCase(),
                            a.detalle || null,
                            lado.conEstado
                              ? null
                              : a.documentosPendientes > 0
                                ? `${a.documentosPendientes} ${lado.pendiente[a.documentosPendientes === 1 ? 0 : 1]}`
                                : lado.esperando,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </td>
                      {lado.conEstado ? (
                        <>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                                a.documentosPendientes > 0 ? "border-success/30 bg-success/15" : "border-border bg-muted",
                              )}
                            >
                              {a.documentosPendientes > 0
                                ? a.primerDocumento
                                  ? `Llegó la factura ${a.primerDocumento}`
                                  : "Llegó la factura"
                                : "Esperando la factura"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                            {formatCOP(a.pendiente)}
                            {a.pendiente !== a.total && (
                              <span className="block text-xs font-normal text-muted-foreground">de {formatCOP(a.total)}</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-right font-mono whitespace-nowrap tabular-nums">{formatCOP(a.total)}</td>
                          <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(a.pendiente)}</td>
                        </>
                      )}
                      {puedeMover && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            {/* Facturar siempre: el anticipo es para una venta nueva. Si
                                el cliente ya debe facturas, también se puede cruzar. */}
                            {lado.sinDocumento && (
                              <Button className="h-9 rounded-lg px-4" render={<Link href={lado.sinDocumento.href(a)} />}>
                                {lado.sinDocumento.etiqueta}
                              </Button>
                            )}
                            {a.documentosPendientes > 0 ? (
                              <Button
                                type="button"
                                variant={lado.sinDocumento ? "outline" : "default"}
                                className="h-9 rounded-lg px-4"
                                onClick={() => setPanel({ tipo: "CRUZAR", anticipo: a })}
                              >
                                {lado.accion}
                              </Button>
                            ) : lado.sinDocumento ? null : (
                              a.comprobanteId && (
                                <BotonImprimir
                                  ruta={`/documentos/comprobantes-egreso/${a.comprobanteId}/pdf`}
                                  nombre={a.documento ?? "comprobante"}
                                  etiqueta="Ver"
                                />
                              )
                            )}
                            <Button type="button" variant="outline" className="h-9 rounded-lg px-4" onClick={() => setPanel({ tipo: "DEVOLVER", anticipo: a })}>
                              Devolver
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data.devoluciones.length > 0 && <Devoluciones lado={lado} devoluciones={data.devoluciones} puedeAnular={puedeMover} />}
      </div>

      {panel && (
        <aside className="w-full lg:w-96 lg:shrink-0">
          {panel.tipo === "CRUZAR" ? (
            <PanelCruce key={panel.anticipo.movimientoId} lado={lado} anticipo={panel.anticipo} onCerrar={() => setPanel(null)} />
          ) : (
            <PanelDevolucion key={panel.anticipo.movimientoId} lado={lado} anticipo={panel.anticipo} onCerrar={() => setPanel(null)} />
          )}
        </aside>
      )}
    </div>
  );
}

function Marco({ titulo, subtitulo, onCerrar, children }: { titulo: string; subtitulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card px-5 py-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{titulo}</h2>
          <p className="text-xs text-muted-foreground">{subtitulo}</p>
        </div>
        <Button type="button" variant="ghost" className="size-8 rounded-lg p-0" aria-label="Cerrar" onClick={onCerrar}>
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </section>
  );
}

function EnElLibro({ lineas }: { lineas: Array<{ codigo: string; nombre: string; lado: "D" | "C"; valor: number }> }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">En el libro</p>
      <ul className="flex flex-col gap-0.5 text-xs">
        {lineas
          .filter((l) => l.valor > 0)
          .map((l) => (
            <li key={`${l.codigo}-${l.lado}`} className="flex justify-between gap-3">
              <span>
                <span className="font-mono text-muted-foreground">{l.codigo}</span> {l.nombre}
              </span>
              <span className="font-mono whitespace-nowrap tabular-nums">
                {l.lado} {formatCOP(l.valor)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function PanelCruce({ lado, anticipo, onCerrar }: { lado: Lado; anticipo: Anticipo; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(hoyEnColombia());
  const docs = useQuery({
    queryKey: [...lado.llave, "documentos", anticipo.terceroId],
    queryFn: () => lado.documentosDe(anticipo.terceroId),
    meta: SILENCIOSO,
  });
  // El saldo a favor no se aplica a la misma factura que lo tiene.
  const lista = (docs.data ?? []).filter((d) => d.id !== anticipo.movimientoId);
  const elegido = lista.find((d) => d.id === documentoId) ?? (lista.length === 1 ? lista[0] : null);
  const tope = elegido ? Math.min(elegido.pendiente, anticipo.pendiente) : anticipo.pendiente;
  const monto = valor === "" ? tope : Number(valor);
  const problema =
    elegido === null ? "Elegí la factura." : !(monto > 0) ? "Escribí cuánto se aplica." : monto > tope + 0.004 ? `No se puede aplicar más de ${formatCOP(tope)}.` : null;

  const cruzar = useMutation({
    mutationFn: () => lado.cruzar(anticipo, elegido!, monto, fecha),
    onSuccess: async () => {
      await Promise.all([lado.llave, ...lado.invalidar].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito(`${lado.nombreOrigen} aplicado`, `${formatCOP(monto)} a ${elegido!.numero}.`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Marco
      titulo={lado.conEstado ? `${lado.accion} ${lado.nombreOrigen.toLowerCase()}` : `${lado.accion} ${lado.nombreOrigen.toLowerCase()} con factura`}
      subtitulo={lado.conEstado && elegido ? `${anticipo.tercero} · ${elegido.numero}` : anticipo.tercero}
      onCerrar={onCerrar}
    >
      {docs.data === undefined ? (
        docs.isError ? (
          <ErrorCarga sinMarco error={docs.error} titulo="No se pudieron leer las facturas" onReintentar={docs.refetch} />
        ) : (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {lista.length > 1 && (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {lista.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    aria-pressed={elegido?.id === d.id}
                    onClick={() => {
                      setDocumentoId(d.id);
                      setValor("");
                    }}
                    className={cn("flex w-full items-center justify-between px-4 py-2.5 text-left text-sm", elegido?.id === d.id ? "bg-accent" : "hover:bg-accent/60")}
                  >
                    <span className="font-mono font-semibold">{d.numero}</span>
                    <span className="font-mono whitespace-nowrap tabular-nums">{formatCOP(d.pendiente)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border text-sm">
            {/* El proveedor ve primero la factura y le resta el anticipo; el cliente, al revés. */}
            <div className={cn("flex justify-between gap-3 px-4 py-3", lado.conEstado && elegido && "order-2 border-t border-border")}>
              <span>
                <span className="font-semibold">
                  {lado.nombreOrigen} {anticipo.documento ?? ""}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {lado.conEstado ? "Dado" : "Del"} el {fechaCorta(anticipo.fecha).toLowerCase()}
                </span>
              </span>
              <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
                {lado.conEstado && elegido ? `− ${formatCOP(monto)}` : formatCOP(anticipo.pendiente)}
              </span>
            </div>
            {elegido && (
              <>
                <div className={cn("flex justify-between gap-3 px-4 py-3", lado.conEstado ? "order-1" : "border-t border-border")}>
                  <span>
                    <span className="font-semibold">Factura {elegido.numero}</span>
                    <span className="block text-xs text-muted-foreground">Vence el {fechaCorta(elegido.venceEfectivo).toLowerCase()}</span>
                  </span>
                  <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(elegido.pendiente)}</span>
                </div>
                <div className="order-3 flex justify-between gap-3 border-t border-border bg-muted px-4 py-3">
                  <span className="font-semibold">{lado.queda}</span>
                  <span className="font-mono text-base font-bold whitespace-nowrap tabular-nums">{formatCOP(Math.max(0, elegido.pendiente - monto))}</span>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="cruce-valor" etiqueta="Valor">
              <CampoPesos id="cruce-valor" value={valor === "" ? String(tope) : valor} onChange={setValor} className="h-11 rounded-xl px-4 text-right font-mono" />
            </Campo>
            <Campo id="cruce-fecha" etiqueta="Fecha">
              <Input id="cruce-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-xl px-3" />
            </Campo>
          </div>
          {lado.cruceSinAsiento ? (
            <p className="text-xs text-muted-foreground">No lleva asiento: la plata ya está en Clientes (130505), solo pasa de una factura a otra.</p>
          ) : (
            <EnElLibro
              lineas={[
                { ...(lado.anticipoAlDebito ? lado.cuenta : lado.contra), lado: "D", valor: monto },
                { ...(lado.anticipoAlDebito ? lado.contra : lado.cuenta), lado: "C", valor: monto },
              ]}
            />
          )}
          <p className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            {lado.conEstado && elegido
              ? `Los ${formatCOP(Math.max(0, elegido.pendiente - monto))} quedan en Por pagar con el vencimiento de la factura.`
              : `No entra ni sale plata: solo se descuenta de lo que ${lado.devolucionSale ? "te debe" : "le debés"}.`}
            {!lado.anticipoAlDebito && " Si el anticipo tuvo retención, se reversa en proporción: la compra retiene sobre su propia base."}
          </p>
          <Button type="button" className="h-12 rounded-xl" disabled={problema !== null || cruzar.isPending} onClick={() => cruzar.mutate()}>
            {cruzar.isPending && <Loader2 className="size-4 animate-spin" />}
            {problema ?? (lado.conEstado && elegido ? `${lado.accion} con ${elegido.numero}` : `${lado.accion} ${formatCOP(monto)}`)}
          </Button>
        </div>
      )}
    </Marco>
  );
}

function PanelDevolucion({ lado, anticipo, onCerrar }: { lado: Lado; anticipo: Anticipo; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [medio, setMedio] = useState<Medio>("BANCO");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [valor, setValor] = useState(String(anticipo.pendiente));
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [motivo, setMotivo] = useState("");
  const monto = Number(valor);
  const problema =
    problemaDelMedio(medio, caja, cuenta) ??
    (!(monto > 0)
      ? "Escribí cuánto se devuelve."
      : monto > anticipo.pendiente + 0.004
        ? `Quedan ${formatCOP(anticipo.pendiente)}.`
        : lado.pideMotivo && motivo.trim().length < 3
          ? "Escribí por qué se devuelve."
          : null);

  const devolver = useMutation({
    mutationFn: () =>
      lado.devolver(anticipo.movimientoId, {
        medio,
        cajaId: medio === "CAJA" ? caja!.id : undefined,
        cuentaBancariaId: medio === "BANCO" ? cuenta!.id : undefined,
        fecha,
        valor: monto,
        motivo: motivo.trim(),
      }),
    onSuccess: async () => {
      await Promise.all([lado.llave, ...lado.invalidar].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito(`${lado.nombreOrigen} devuelto`, `${formatCOP(monto)} · ${anticipo.tercero}.`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const medioNombre = medio === "CAJA" ? (caja?.nombre ?? "Caja") : (cuenta?.banco ?? "Banco");
  // El 4×1000 va dentro del valor: al cliente le llega el resto.
  const gmf =
    lado.gmfLoAsumeElCliente && medio === "BANCO" && cuenta !== null && !cuenta.exenta_gmf && monto > 0
      ? monto - Math.round((monto * 1000) / 1004)
      : 0;
  return (
    <Marco titulo={`Devolver ${lado.nombreOrigen.toLowerCase()}`} subtitulo={anticipo.tercero} onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        <Campo id="dev-medio" etiqueta={lado.devolucionSale ? "Sale de" : "Entra a"}>
          <SelectorMedio medio={medio} onMedio={setMedio} caja={caja} onCaja={setCaja} cuenta={cuenta} onCuenta={setCuenta} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo id="dev-valor" etiqueta="Valor">
            <CampoPesos id="dev-valor" value={valor} onChange={setValor} className="h-11 rounded-xl px-4 text-right font-mono" />
          </Campo>
          <Campo id="dev-fecha" etiqueta="Fecha">
            <Input id="dev-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-xl px-3" />
          </Campo>
        </div>
        {lado.pideMotivo && (
          <Campo id="dev-motivo" etiqueta="Por qué">
            <Input id="dev-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="No se hizo el pedido" className="h-11 rounded-xl px-4" />
          </Campo>
        )}
        <EnElLibro
          lineas={
            lado.devolucionSale
              ? [
                  { ...lado.cuenta, lado: "D", valor: monto },
                  { codigo: "", nombre: medioNombre, lado: "C", valor: monto },
                ]
              : [
                  { codigo: "", nombre: medioNombre, lado: "D", valor: monto },
                  { ...lado.cuenta, lado: "C", valor: monto },
                ]
          }
        />
        <p className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
          {lado.devolucionSale
            ? gmf > 0
              ? `El 4×1000 lo asume el cliente: le llegan ${formatCOP(monto - gmf)} y ${formatCOP(gmf)} se van en el impuesto. ${lado.nombreOrigen === "Anticipo" ? "El anticipo" : "El saldo a favor"} baja ${formatCOP(monto)}.`
              : lado.gmfLoAsumeElCliente
                ? `Sale la plata y ${lado.nombreOrigen === "Anticipo" ? "el anticipo" : "el saldo a favor"} baja. Si sale de un banco, el 4×1000 lo asume el cliente: sale de lo que se le devuelve.`
                : "Sale la plata y el anticipo baja."
            : "Entra lo que devuelve el proveedor. Si al anticipo se le retuvo, esa retención se reversa en proporción y entra el neto."}
        </p>
        <Button type="button" className="h-12 rounded-xl" disabled={problema !== null || devolver.isPending} onClick={() => devolver.mutate()}>
          {devolver.isPending && <Loader2 className="size-4 animate-spin" />}
          {problema ?? `Devolver ${formatCOP(monto)}`}
        </Button>
      </div>
    </Marco>
  );
}

function Devoluciones({ lado, devoluciones, puedeAnular }: { lado: Lado; devoluciones: DevolucionAnticipo[]; puedeAnular: boolean }) {
  const queryClient = useQueryClient();
  const [anulando, setAnulando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const anular = useMutation({
    mutationFn: (id: string) => lado.anularDevolucion(id, motivo.trim()),
    onSuccess: async () => {
      await Promise.all([lado.llave, ...lado.invalidar].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito("Devolución anulada", "El anticipo recuperó su saldo.");
      setAnulando(null);
      setMotivo("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });
  return (
    <section className="rounded-3xl border border-border bg-card shadow-sm">
      <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">Devoluciones recientes</h2>
      <ul className="divide-y divide-border">
        {devoluciones.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <span>
              <span className="font-medium">{d.tercero}</span>
              <span className="block text-xs text-muted-foreground">
                {fechaCorta(d.fecha)} · {d.destino}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono whitespace-nowrap tabular-nums">{formatCOP(d.valor)}</span>
              {puedeAnular &&
                (anulando === d.id ? (
                  <span className="flex items-center gap-2">
                    <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por qué se anula" aria-label="Motivo" className="h-9 w-44 rounded-lg" />
                    <Button type="button" className="h-9 rounded-lg px-3" disabled={motivo.trim().length < 3 || anular.isPending} onClick={() => anular.mutate(d.id)}>
                      Anular
                    </Button>
                  </span>
                ) : (
                  <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={() => setAnulando(d.id)}>
                    Anular
                  </Button>
                ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
