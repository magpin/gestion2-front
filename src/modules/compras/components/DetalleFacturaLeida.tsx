"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PropuestaRenta } from "@/modules/retenciones/components/PropuestaRenta";
import { useSimulacionRenta } from "@/modules/retenciones/hooks/useSimulacionRenta";
import {
  aEnvioRenta,
  problemaRenta,
  respuestasRentaVacias,
} from "@/modules/retenciones/types/retenciones.types";
import { Check, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Maria } from "@/modules/asistente/components/Maria";
import { LLAVE_APROBAR } from "@/modules/asistente/hooks/usePendientes";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import { SelectorProducto } from "@/modules/inventario/components/SelectorProducto";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorProveedor } from "./SelectorProveedor";
import { lecturasApi } from "../services/lecturas.service";
import type {
  FacturaCruzada,
  LecturaFactura,
  RenglonCruzado,
} from "../types/lecturas.types";

/**
 * Lo que María entendió de una factura, y lo que falta para registrarla.
 *
 * Esta pantalla existe porque la tarjeta «Esto encontré» del asistente **no
 * sirve acá**: aquella es una lista de `campo · valor` que se deduplica por
 * nombre de campo, y una factura tiene renglones repetidos y anidados. Dos
 * renglones de la misma factura se pisarían y no habría manera de decir «el
 * renglón 2».
 *
 * Tres bloques, en el orden en que se mira una factura de verdad:
 *
 *   1. **Las cuentas.** Si no dan, no hay nada que decidir: se arregla a mano.
 *   2. **Los renglones**, con lo que dice el papel a la izquierda y contra qué
 *      va a quedar a la derecha. Lo que falta se resuelve ahí mismo.
 *   3. **Registrar**, que es lo único que escribe, y lo aprieta una persona.
 */
export function DetalleFacturaLeida({
  lectura,
  onRegistrada,
}: {
  lectura: LecturaFactura;
  onRegistrada: () => void;
}) {
  const cruzada = lectura.extraido;
  // Una registrada ya no se registra, y una descartada tampoco: la decisión
  // ya se tomó. Se sigue pudiendo mirar.
  const registrable = lectura.compra === null && lectura.estado !== "DESCARTADO";
  const cliente = useQueryClient();

  // Lo que la persona va respondiendo. Arranca vacío: lo que el cruce ya
  // resolvió no se repite acá, se lee de `renglon.resuelto`.
  const [numero, setNumero] = useState("");
  const [proveedor, setProveedor] = useState<TerceroResumen | null>(null);
  const [resueltos, setResueltos] = useState<
    Record<number, { productoId?: string; cuentaId?: string; etiqueta: string }>
  >({});

  const [renta, setRenta] = useState(respuestasRentaVacias);

  // Lo que la persona contestó de los renglones, igual para simular y para
  // registrar: la retención se calcula sobre lo mismo que se va a registrar.
  const respuestas = () => ({
    ...(numero.trim() !== "" && { numero: numero.trim() }),
    ...(proveedor !== null && { terceroId: proveedor.id }),
    renglones: Object.entries(resueltos).map(([orden, r]) => ({
      orden: Number(orden),
      ...(r.productoId !== undefined && { productoId: r.productoId }),
      ...(r.cuentaId !== undefined && { cuentaId: r.cuentaId }),
    })),
  });

  // Se pide cuando ya se sabe quién es el proveedor y qué es cada renglón.
  const puedeSimular =
    registrable &&
    cruzada !== null &&
    cruzada.comprobaciones.every((c) => c.cuadra) &&
    (cruzada.proveedor !== null || proveedor !== null) &&
    cruzada.renglones.every((r) => r.resuelto !== null || resueltos[r.orden] !== undefined);
  const simulacion = useSimulacionRenta(
    `lectura-${lectura.id}`,
    puedeSimular && !renta.sinRetencion ? { ...respuestas(), ...aEnvioRenta(renta) } : null,
    (datos) => lecturasApi.simularRetencion(lectura.id, datos),
  );

  const registrar = useMutation({
    // La llave de todo lo que aprueba lo que María leyó: la cara del chat
    // trabaja mientras se registra y hace el gesto de aprobado al terminar.
    mutationKey: LLAVE_APROBAR,
    mutationFn: () =>
      lecturasApi.registrar(lectura.id, { ...respuestas(), ...aEnvioRenta(renta) }),
    onSuccess: (compra) => {
      void cliente.invalidateQueries({ queryKey: ["compras"] });
      void cliente.invalidateQueries({ queryKey: ["lecturas-factura"] });
      aviso.exito(
        `Compra ${compra.numero_factura_proveedor} registrada por ${formatCOP(Number(compra.total))}.`,
      );
      onRegistrada();
    },
    // `falla` y no `e.message`: en un error HTTP, `message` es el genérico de
    // axios («Request failed with status code 400») y esconde lo que dijo el
    // servidor, que es lo que explica qué hacer.
    onError: (e: unknown) => aviso.falla(e),
  });

  if (cruzada === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta lectura todavía no tiene nada que mostrar.
      </p>
    );
  }

  const { factura } = cruzada;
  const cuentasDan = cruzada.comprobaciones.every((c) => c.cuadra);

  // Lo que sigue faltando **ahora**, no cuando se leyó: el backend guardó las
  // preguntas al cruzar, y desde entonces la persona pudo contestar algunas.
  const faltaNumero = factura.numero === null && numero.trim() === "";
  const faltaProveedor = cruzada.proveedor === null && proveedor === null;
  const sinResolver = cruzada.renglones.filter(
    (r) => r.resuelto === null && resueltos[r.orden] === undefined,
  );
  const faltaRenta = puedeSimular ? problemaRenta(simulacion.propuesta, renta) : null;
  const listo =
    cuentasDan &&
    !faltaNumero &&
    !faltaProveedor &&
    sinResolver.length === 0 &&
    faltaRenta === null;

  return (
    <div className="flex flex-col gap-6">
      <Cabecera cruzada={cruzada} />

      {/* Ya registrada: lo que sigue es historia de cómo se llegó ahí, no algo
          que decidir. El backend la rechazaría igual por el número repetido,
          pero enterarse apretando el botón no es una respuesta. */}
      {lectura.compra !== null && (
        <p className="rounded-2xl border border-success/40 bg-success/5 p-4 text-sm">
          Esta factura ya está registrada como{" "}
          <strong>{lectura.compra.numero}</strong>
          {lectura.compra.estado === "ANULADA" && ", y después se anuló"}.
        </p>
      )}

      <Comprobaciones cruzada={cruzada} />

      {/* Con las cuentas mal, resolver renglones no sirve de nada: el backend
          rechaza el registro igual, y a propósito. Se dice y se para aquí. */}
      {cuentasDan && (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">
              Qué dice el papel, y contra qué queda
            </h3>

            {registrable && faltaProveedor && (
              <Pendiente texto="El documento no trae un NIT que reconozca. ¿Quién es el proveedor?">
                <SelectorProveedor valor={proveedor} onElegir={setProveedor} />
              </Pendiente>
            )}

            {registrable && faltaNumero && (
              <Pendiente texto="El documento no trae número de factura. ¿Con cuál lo registro?">
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="El número que le puso el proveedor"
                  maxLength={40}
                  className="h-11 max-w-xs rounded-xl px-4"
                  aria-label="Número de la factura del proveedor"
                />
              </Pendiente>
            )}

            <div className="overflow-hidden rounded-2xl border border-border">
              {cruzada.renglones.map((renglon) => (
                <Renglon
                  key={renglon.orden}
                  renglon={renglon}
                  editable={registrable}
                  resuelto={resueltos[renglon.orden]}
                  onResolver={(r) =>
                    setResueltos((previo) => ({
                      ...previo,
                      [renglon.orden]: r,
                    }))
                  }
                />
              ))}
            </div>

            {cruzada.juntadas > 0 && (
              <p className="text-xs text-muted-foreground">
                {cruzada.juntadas === 1
                  ? "Un producto viene en dos renglones a precios distintos: se registra en uno solo, al costo promedio."
                  : `${cruzada.juntadas} productos vienen repetidos a precios distintos: cada uno se registra en un solo renglón, al costo promedio.`}
              </p>
            )}
          </section>

          {puedeSimular && (
            <PropuestaRenta
              propuesta={simulacion.propuesta}
              cargando={simulacion.cargando}
              error={simulacion.error}
              respuestas={renta}
              onCambiar={setRenta}
              etiquetaRenglon={(orden) => {
                const r = cruzada.renglones.find((x) => x.orden === orden);
                return r === undefined ? `Renglón ${orden}` : `${orden}. ${r.leido.descripcion}`;
              }}
            />
          )}

          {registrable && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <Button
                type="button"
                className="h-11 rounded-xl px-6"
                disabled={!listo || registrar.isPending}
                onClick={() => registrar.mutate()}
              >
                {registrar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Registrar la compra
              </Button>
              <p className="text-xs text-muted-foreground">
                {listo
                  ? "Se registra a crédito, con su asiento, su kardex y su retención."
                  : faltaRenta !== null && sinResolver.length === 0 && !faltaNumero && !faltaProveedor
                    ? faltaRenta
                    : `Falta resolver ${pendientes(faltaProveedor, faltaNumero, sinResolver.length)}.`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** De quién, cuándo y por cuánto — lo que el papel dice de sí mismo. */
function Cabecera({ cruzada }: { cruzada: FacturaCruzada }) {
  const { factura } = cruzada;
  return (
    <section className="grid gap-4 rounded-2xl bg-muted/40 p-5 sm:grid-cols-2">
      <Dato
        etiqueta="Proveedor"
        valor={cruzada.proveedor?.nombre ?? factura.proveedor.nombre}
        nota={
          cruzada.proveedor === null
            ? `El papel dice «${factura.proveedor.nombre}»${factura.proveedor.nit === null ? ", sin NIT" : `, NIT ${factura.proveedor.nit}`}`
            : undefined
        }
      />
      <Dato
        etiqueta="Número"
        valor={
          factura.numero === null
            ? "No lo trae"
            : `${factura.prefijo === null ? "" : `${factura.prefijo}-`}${factura.numero}`
        }
      />
      <Dato etiqueta="Fecha" valor={formatFecha(factura.fecha)} />
      <Dato
        etiqueta="Total impreso"
        valor={formatCOP(factura.impreso.total)}
        nota={`Subtotal ${formatCOP(factura.impreso.subtotal)} · IVA ${formatCOP(factura.impreso.iva)}`}
      />
    </section>
  );
}

/**
 * Las sumas del código contra los totales impresos.
 *
 * Se muestran **siempre**, también cuando dan: es lo que permite confiar en
 * una lectura automática sin abrir el PDF, y esconderlas cuando todo está bien
 * enseñaría a no mirarlas cuando algo está mal.
 */
function Comprobaciones({ cruzada }: { cruzada: FacturaCruzada }) {
  const fallan = cruzada.comprobaciones.filter((c) => !c.cuadra);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Maria estado={fallan.length === 0 ? "lista" : "noPude"} tamano={22} />
        <h3 className="text-sm font-semibold">
          {fallan.length === 0
            ? "Sumé los renglones y las cuentas dan"
            : "Sumé los renglones y las cuentas no dan"}
        </h3>
      </div>

      <ul className="flex flex-col gap-1 rounded-2xl border border-border p-4">
        {cruzada.comprobaciones.map((c) => (
          <li
            key={c.que}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
          >
            <span
              className={cn(
                "flex items-center gap-2",
                c.cuadra ? "text-muted-foreground" : "font-medium text-danger",
              )}
            >
              {c.cuadra ? (
                <Check className="size-3.5 shrink-0 text-success" />
              ) : (
                <TriangleAlert className="size-3.5 shrink-0" />
              )}
              {c.que}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {c.cuadra
                ? formatCOP(c.impreso)
                : `sumé ${formatCOP(c.calculado)} · dice ${formatCOP(c.impreso)}`}
            </span>
          </li>
        ))}
      </ul>

      {fallan.length > 0 && (
        <p className="text-sm text-danger">
          Esto no se resuelve contestando: lo que leí no coincide con lo que el
          documento tiene impreso. Registrala a mano.
        </p>
      )}
    </section>
  );
}

/** Un renglón: lo que dice el papel, y contra qué va a quedar. */
function Renglon({
  renglon,
  editable,
  resuelto,
  onResolver,
}: {
  renglon: RenglonCruzado;
  editable: boolean;
  resuelto?: { productoId?: string; cuentaId?: string; etiqueta: string };
  onResolver: (r: {
    productoId?: string;
    cuentaId?: string;
    etiqueta: string;
  }) => void;
}) {
  const { leido } = renglon;
  // Lo recordado se puede cambiar: lo contestó una persona en otra factura, y
  // la última respuesta de una persona es la que manda. Lo que el cruce
  // encontró por código o por nombre no se toca acá.
  const [cambiando, setCambiando] = useState(false);
  const recordado = renglon.forma === "APRENDIDO";

  // Lo que la persona eligió acá le gana a lo que venía resuelto.
  const destino =
    resuelto?.etiqueta ??
    (renglon.resuelto !== null && !cambiando
      ? `${renglon.resuelto.codigo} · ${renglon.resuelto.nombre}`
      : undefined);

  return (
    <div className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
      <div className="min-w-0">
        <p className="text-sm font-medium">{leido.descripcion}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {leido.cantidad} × {formatCOP(leido.valorUnitario)} ={" "}
          {formatCOP(leido.total)}
          {leido.ivaTarifa > 0 && ` · IVA ${leido.ivaTarifa} %`}
        </p>
      </div>

      <span className="hidden self-center text-muted-foreground sm:block">
        →
      </span>

      <div className="min-w-0">
        {destino !== undefined ? (
          <div className="text-sm">
            <p className="flex flex-wrap items-center gap-2">
              {destino}
              {recordado && resuelto === undefined && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Recordado
                </span>
              )}
            </p>
            {/* De dónde salió la coincidencia. La más floja de las formas es
                «era el único que se parecía», y quien mira tiene derecho a
                saber cuál fue antes de registrar. */}
            {resuelto === undefined && renglon.resuelto !== null && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {renglon.motivo}
              </span>
            )}
            {resuelto !== undefined && editable && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Lo voy a recordar para las próximas facturas de este proveedor.
              </span>
            )}
            {recordado && editable && resuelto === undefined && (
              <button
                type="button"
                onClick={() => setCambiando(true)}
                className="mt-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Cambiar
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-warning-foreground">
              {cambiando
                ? leido.clase === "GASTO"
                  ? "¿Contra qué cuenta va, entonces?"
                  : "¿Qué producto es, entonces?"
                : renglon.motivo}
            </p>
            {leido.clase === "GASTO" ? (
              <SelectorCuenta
                crear={{ madres: ["5"] }}
                valor={null}
                onElegir={(cuenta) =>
                  onResolver({
                    cuentaId: cuenta.id,
                    etiqueta: `${cuenta.codigo} · ${cuenta.nombre}`,
                  })
                }
              />
            ) : (
              <SelectorProducto
                valor={null}
                onElegir={(producto) =>
                  onResolver({
                    productoId: producto.id,
                    etiqueta: `${producto.codigo} · ${producto.nombre}`,
                  })
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Algo que falta, con lo que hace falta para resolverlo al lado. */
function Pendiente({
  texto,
  children,
}: {
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <p className="text-sm">{texto}</p>
      {children}
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {etiqueta}
      </p>
      <p className="mt-1 text-sm font-medium">{valor}</p>
      {nota !== undefined && (
        <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>
      )}
    </div>
  );
}

/** «el proveedor, el número y 3 renglones» — en palabras, no un contador. */
function pendientes(
  proveedor: boolean,
  numero: boolean,
  renglones: number,
): string {
  const partes = [
    ...(proveedor ? ["el proveedor"] : []),
    ...(numero ? ["el número"] : []),
    ...(renglones > 0
      ? [renglones === 1 ? "un renglón" : `${renglones} renglones`]
      : []),
  ];
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}
