"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Loader2, TriangleAlert, Upload } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, formatFecha, hoyEnColombia } from "@/lib/utils";
import { Maria } from "@/modules/asistente/components/Maria";
import { productosApi } from "@/modules/inventario/services/inventario.service";
import { tercerosApi } from "@/modules/terceros/services/terceros.service";
import { resumirTercero } from "@/modules/terceros/types/terceros.types";
import { FormularioDocumentoVenta } from "../components/FormularioDocumentoVenta";
import { useEmitirFactura } from "../hooks/useEmitirFactura";
import { pedidosApi } from "../services/pedidos.service";
import type { LecturaPedido, PedidoCruzado } from "../types/pedidos.types";

const CLAVE = ["pedidos-leidos"];

/** Lo que la API acepta leer. */
const TIPOS = "application/pdf,image/jpeg,image/png,image/webp";

/** Cada cuánto se vuelve a preguntar mientras hay una lectura en curso. */
const REFRESCO_MS = 2500;

/**
 * Los pedidos que los clientes mandan, leídos por María.
 *
 * Hermana de las facturas leídas —las dos viven en María → Documentos
 * leídos—, con una diferencia que viene de ventas: **una factura de venta no
 * tiene borrador** —nace emitida, con su consecutivo—. Así
 * que lo que María arma no se registra desde acá: se abre en el formulario de
 * factura de siempre, ya lleno, y la persona revisa, corrige y emite.
 *
 * El precio no lo pone el pedido: lo pone la lista. Si el pedido dice otro, se
 * avisa en el renglón y se factura al de la lista.
 */
export function PedidosSeccion() {
  const cliente = useQueryClient();
  const puedeFacturar = useTieneRol("VENTAS", "DIRECTOR");
  const [abierto, setAbierto] = useState<LecturaPedido | null>(null);
  const [facturando, setFacturando] = useState<LecturaPedido | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const {
    data: pedidos,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: CLAVE,
    queryFn: pedidosApi.listar,
    meta: SILENCIOSO,
    refetchInterval: (q) =>
      (q.state.data ?? []).some(
        (l) => l.estado === "EN_COLA" || l.estado === "LEYENDO",
      )
        ? REFRESCO_MS
        : false,
  });

  const subir = useMutation({
    mutationFn: async (archivo: File) => {
      const { url, clave } = await pedidosApi.urlDeCarga(archivo.type);
      await pedidosApi.subirAlBucket(url, archivo, archivo.type);
      return pedidosApi.encolar(clave);
    },
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Subido. María lo está leyendo.");
    },
    // `falla` y no `e.message`: en un error HTTP, `message` es el genérico de
    // axios («Request failed with status code 400») y esconde lo que dijo el
    // servidor, que es lo que explica qué hacer.
    onError: (e: unknown) => aviso.falla(e),
  });

  const elegir = (archivo: File | undefined) => {
    if (archivo === undefined) return;
    if (!TIPOS.split(",").includes(archivo.type)) {
      aviso.error(
        "Solo puedo leer pedidos en PDF o en foto. Si es otro formato, armá la factura a mano.",
      );
      return;
    }
    subir.mutate(archivo);
  };

  const enPantalla =
    abierto === null
      ? null
      : (pedidos?.find((p) => p.id === abierto.id) ?? abierto);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Maria estado={subir.isPending ? "leyendo" : "reposo"} tamano={32} />
          <div>
            <p className="text-sm font-medium">
              Subí el pedido del cliente y yo armo la factura
            </p>
            <p className="text-xs text-muted-foreground">
              Una orden de compra, un pedido o una cotización aceptada, en PDF o
              en foto. Te la dejo lista para revisar; emitirla lo apretás vos.
            </p>
          </div>
        </div>

        {puedeFacturar && (
          <>
            <input
              ref={entrada}
              type="file"
              accept={TIPOS}
              className="sr-only"
              aria-label="Elegir el pedido para leer"
              onChange={(e) => {
                elegir(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              className="h-11 rounded-xl px-5"
              disabled={subir.isPending}
              onClick={() => entrada.current?.click()}
            >
              {subir.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Subir un pedido
            </Button>
          </>
        )}
      </div>

      {pedidos === undefined ? (
        isError ? (
          <ErrorCarga
            error={error}
            titulo="No se pudieron leer los pedidos"
            onReintentar={refetch}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Cargando…
          </p>
        )
      ) : pedidos.length === 0 ? (
        <EmptyState
          icon={FileText}
          titulo="Todavía no le pasaste ningún pedido a María"
          descripcion={
            puedeFacturar
              ? "Subí la orden de compra o el pedido de un cliente, en PDF o en foto, y María te arma la factura para que la revisés y la emitas."
              : "Cuando alguien de ventas suba un pedido de un cliente, lo vas a ver acá con la factura que armó María."
          }
          accion={
            puedeFacturar && !subir.isPending
              ? {
                  label: "Subir un pedido",
                  onClick: () => entrada.current?.click(),
                }
              : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {pedidos.map((p) => (
            <Fila key={p.id} pedido={p} onAbrir={() => setAbierto(p)} />
          ))}
        </ul>
      )}

      <Dialog
        open={enPantalla !== null}
        onOpenChange={(v) => !v && setAbierto(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Lo que leí de este pedido</DialogTitle>
              <DialogDescription>
                {enPantalla?.venta == null
                  ? "Nada de esto está facturado todavía."
                  : `Se facturó como ${enPantalla.venta.numero}.`}
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5">
            {enPantalla?.extraido != null && (
              <DetallePedido cruzado={enPantalla.extraido} />
            )}
            {enPantalla !== null &&
              enPantalla.extraido !== null &&
              enPantalla.venta === null &&
              enPantalla.estado !== "DESCARTADO" &&
              puedeFacturar && (
                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                  <Button
                    type="button"
                    className="h-11 rounded-xl px-6"
                    onClick={() => {
                      setFacturando(enPantalla);
                      setAbierto(null);
                    }}
                  >
                    <FileText className="size-4" />
                    Armar la factura
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Se abre el formulario de factura ya lleno. Revisalo y emitila
                    desde ahí.
                  </p>
                </div>
              )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {facturando !== null && (
        <FacturaDesdePedido
          key={facturando.id}
          pedido={facturando}
          onCerrar={() => setFacturando(null)}
        />
      )}
    </div>
  );
}

/**
 * El formulario de factura de siempre, lleno con lo que salió del pedido.
 *
 * Hace falta traer el cliente y los productos como fichas: el borrador guarda
 * ids y los selectores del formulario trabajan con la ficha —lo mismo que
 * hace «Corregir» en una cotización—.
 */
function FacturaDesdePedido({
  pedido,
  onCerrar,
}: {
  pedido: LecturaPedido;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const cruzado = pedido.extraido!;

  const { data: tercero, isLoading: cargandoTercero } = useQuery({
    queryKey: ["terceros", "ficha", cruzado.cliente?.id],
    queryFn: () => tercerosApi.porId(cruzado.cliente!.id),
    enabled: cruzado.cliente !== null,
  });
  const { data: productos, isLoading: cargandoProductos } = useQuery({
    queryKey: ["productos", "de-pedido", pedido.id],
    queryFn: () =>
      Promise.all(cruzado.lineas.map((l) => productosApi.porId(l.productoId))),
  });

  const emitir = useEmitirFactura(
    (datos) => pedidosApi.facturar(pedido.id, datos),
    async (factura) => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({ queryKey: ["facturas"] });
      aviso.exito(
        `Factura ${factura.prefijo ?? ""}${factura.consecutivo} emitida.`,
      );
      onCerrar();
    },
  );

  if (
    (cruzado.cliente !== null && cargandoTercero) ||
    cargandoProductos ||
    productos === undefined
  ) {
    return null;
  }

  return (
    <FormularioDocumentoVenta
      abierto
      onCerrar={onCerrar}
      onGuardar={(datos, formaPago) =>
        emitir.mutate({ ...datos, ...(formaPago ?? { formaPago: "CREDITO" }) })
      }
      guardando={emitir.isPending}
      titulo="Factura desde el pedido"
      descripcion={`Armada con el pedido${cruzado.pedido.numero === null ? "" : ` ${cruzado.pedido.numero}`} de ${cruzado.pedido.cliente.nombre}. Los precios son los de la lista. Revisá y emití.`}
      etiquetaBoton="Emitir factura"
      fechaDeHoy
      conFormaPago
      inicial={{
        tercero: tercero === undefined ? null : resumirTercero(tercero),
        fecha: hoyEnColombia(),
        lineas: cruzado.lineas.map((l, i) => ({
          clave: i,
          producto: productos[i],
          cantidad: String(l.cantidad),
          precioUnitario: "",
        })),
      }}
    />
  );
}

/** Lo que dice el papel y contra qué queda. */
function DetallePedido({ cruzado }: { cruzado: PedidoCruzado }) {
  const { pedido } = cruzado;
  const fallan = cruzado.comprobaciones.filter((c) => !c.cuadra);

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 rounded-2xl bg-muted/40 p-5 sm:grid-cols-3">
        <Dato
          etiqueta="Cliente"
          valor={cruzado.cliente?.nombre ?? pedido.cliente.nombre}
          nota={
            cruzado.cliente === null
              ? `El papel dice «${pedido.cliente.nombre}»${pedido.cliente.nit === null ? ", sin NIT" : `, NIT ${pedido.cliente.nit}`}`
              : undefined
          }
        />
        <Dato etiqueta="Pedido" valor={pedido.numero ?? "Sin número"} />
        <Dato
          etiqueta="Fecha del pedido"
          valor={
            pedido.fecha === null ? "No la trae" : formatFecha(pedido.fecha)
          }
          nota="La factura sale con la de hoy."
        />
      </section>

      {/* Lo único que se puede comprobar son las cantidades, y solo si el
          papel imprime un subtotal. Cuando no, se dice: no hay con qué. */}
      {cruzado.comprobaciones.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <TriangleAlert className="size-4 shrink-0 text-warning-foreground" />
          El pedido no trae un subtotal con qué sumar los renglones: revisá las
          cantidades contra el papel.
        </p>
      ) : fallan.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-4 shrink-0 text-success" />
          Sumé los renglones y dan el subtotal del pedido: las cantidades se
          leyeron bien.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          Los renglones suman {formatCOP(fallan[0].calculado)} y el pedido dice{" "}
          {formatCOP(fallan[0].impreso)}: alguna cantidad se leyó mal. Revisalas
          contra el papel antes de emitir.
        </p>
      )}

      {cruzado.preguntas.length > 0 && (
        <ul className="flex flex-col gap-2 rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm">
          {cruzado.preguntas.map((p) => (
            <li key={p.sobre}>{p.texto}</li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-2xl border border-border">
        {cruzado.renglones.map((r) => (
          <div
            key={r.orden}
            className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto_1fr] sm:items-start"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{r.leido.descripcion}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {r.leido.cantidad}
                {r.leido.valorUnitario !== null &&
                  ` × ${formatCOP(r.leido.valorUnitario)}`}
              </p>
            </div>
            <span className="hidden self-center text-muted-foreground sm:block">
              →
            </span>
            <div className="min-w-0 text-sm">
              {r.resuelto === null ? (
                <p className="text-xs text-warning-foreground">{r.motivo}</p>
              ) : (
                <>
                  <p>
                    {r.resuelto.codigo} · {r.resuelto.nombre}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      r.avisoPrecio === null
                        ? "text-muted-foreground"
                        : "text-warning-foreground",
                    )}
                  >
                    {r.avisoPrecio ??
                      (r.precioLista === null
                        ? "Sin precio de lista."
                        : `A ${formatCOP(r.precioLista)}, el de la lista.`)}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {cruzado.juntadas > 0 && (
        <p className="text-xs text-muted-foreground">
          {cruzado.juntadas === 1
            ? "Un producto viene en dos renglones: va en una sola línea, con las cantidades sumadas."
            : `${cruzado.juntadas} renglones repiten producto: cada producto va en una sola línea, con las cantidades sumadas.`}
        </p>
      )}
    </div>
  );
}

function Fila({
  pedido,
  onAbrir,
}: {
  pedido: LecturaPedido;
  onAbrir: () => void;
}) {
  const enCurso = pedido.estado === "EN_COLA" || pedido.estado === "LEYENDO";
  const leido = pedido.extraido?.pedido;
  const estado = estadoDe(pedido);

  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        disabled={enCurso || pedido.estado === "FALLO"}
        className={cn(
          "flex w-full flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors",
          enCurso ? "opacity-70" : "hover:border-brand/40",
        )}
      >
        <Maria estado={estado.cara} tamano={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {leido === undefined
              ? enCurso
                ? "Leyendo…"
                : "Pedido"
              : `${leido.cliente.nombre}${leido.numero === null ? "" : ` · ${leido.numero}`}`}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {estado.texto}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatFecha(pedido.creadoEn)}
        </p>
      </button>
    </li>
  );
}

function estadoDe(pedido: LecturaPedido): {
  cara: "leyendo" | "noPude" | "espera" | "lista" | "reposo";
  texto: string;
} {
  if (pedido.estado === "EN_COLA" || pedido.estado === "LEYENDO") {
    return { cara: "leyendo", texto: "Leyéndolo…" };
  }
  if (pedido.venta !== null) {
    return { cara: "lista", texto: `Facturado como ${pedido.venta.numero}.` };
  }
  if (pedido.estado === "FALLO") {
    return { cara: "noPude", texto: pedido.error ?? "No lo pude leer." };
  }
  if (pedido.estado === "DESCARTADO") {
    return { cara: "reposo", texto: `Descartado: ${pedido.motivoDescarte ?? "sin motivo"}` };
  }
  const cruzado = pedido.extraido;
  if (cruzado === null) {
    return { cara: "noPude", texto: "No quedó nada que mostrar." };
  }
  const avisos = cruzado.renglones.filter((r) => r.avisoPrecio !== null).length;
  if (cruzado.preguntas.length > 0) {
    return {
      cara: "espera",
      texto:
        cruzado.preguntas.length === 1
          ? "Me falta un dato para armar la factura."
          : `Me faltan ${cruzado.preguntas.length} datos para armar la factura.`,
    };
  }
  return {
    cara: "lista",
    texto: `${cruzado.renglones.length} ${cruzado.renglones.length === 1 ? "renglón" : "renglones"} · listo para facturar${avisos > 0 ? ` · ${avisos === 1 ? "un precio distinto" : `${avisos} precios distintos`} a la lista` : ""}.`,
  };
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
