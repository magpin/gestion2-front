"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, TriangleAlert, Upload } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { Maria } from "@/modules/asistente/components/Maria";
import { ventasAnterioresApi } from "../services/ventas-anteriores.service";
import type {
  LecturaVentasAnteriores,
  ResultadoCargaAnteriores,
  VentaAnteriorCruzada,
} from "../types/ventas-anteriores.types";

const CLAVE = ["ventas-historicas-leidas"];

/** Lo que la API acepta leer. */
const TIPOS = "application/pdf,image/jpeg,image/png,image/webp";

/** Cada cuánto se vuelve a preguntar mientras hay una lectura en curso. */
const REFRESCO_MS = 2500;

/** En qué quedó cada factura leída, frente al sistema. */
type Situacion = "EN_SISTEMA" | "LISTA" | "PENDIENTE";

function situacionDe(
  f: VentaAnteriorCruzada,
  lectura: LecturaVentasAnteriores,
): Situacion {
  if (lectura.enSistema[f.factura.numero] !== undefined) return "EN_SISTEMA";
  return f.completa ? "LISTA" : "PENDIENTE";
}

/**
 * Las facturas de venta que la empresa emitió en el sistema anterior, leídas
 * por María (fase 11).
 *
 * María dice cuáles **ya están** en el sistema y cuáles faltan, y propone
 * cargar las que faltan como **históricas**: con su número y su fecha, sin
 * asiento y sin kardex —lo vendido ya está en los saldos iniciales—. Cargar lo
 * aprieta una persona, que también dice si cada una ya estaba pagada: si no,
 * queda en la cartera para cobrarla.
 */
export function VentasAnterioresSeccion() {
  const cliente = useQueryClient();
  const [abierta, setAbierta] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const {
    data: lecturas,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: CLAVE,
    queryFn: ventasAnterioresApi.listar,
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
      const { url, clave } = await ventasAnterioresApi.urlDeCarga(archivo.type);
      await ventasAnterioresApi.subirAlBucket(url, archivo, archivo.type);
      return ventasAnterioresApi.encolar(clave);
    },
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Subido. María las está leyendo.");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const elegir = (archivo: File | undefined) => {
    if (archivo === undefined) return;
    if (!TIPOS.split(",").includes(archivo.type)) {
      aviso.error(
        "Solo puedo leer facturas en PDF o en foto. Si tenés un Excel del sistema anterior, se carga por el importador.",
      );
      return;
    }
    subir.mutate(archivo);
  };

  const enPantalla =
    abierta === null ? null : (lecturas?.find((l) => l.id === abierta) ?? null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Maria estado={subir.isPending ? "leyendo" : "reposo"} tamano={32} />
          <div>
            <p className="text-sm font-medium">
              Subí las facturas que emitiste en el sistema anterior
            </p>
            <p className="text-xs text-muted-foreground">
              Un PDF o una foto, aunque traiga varias. Te digo cuáles ya están
              acá y cuáles faltan; cargarlas lo apretás vos.
            </p>
          </div>
        </div>

        <input
          ref={entrada}
          type="file"
          accept={TIPOS}
          className="sr-only"
          aria-label="Elegir las facturas para leer"
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
          Subir facturas
        </Button>
      </div>

      {lecturas === undefined ? (
        isError ? (
          <ErrorCarga
            error={error}
            titulo="No se pudieron leer las ventas del sistema anterior"
            onReintentar={refetch}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Cargando…
          </p>
        )
      ) : lecturas.length === 0 ? (
        <EmptyState
          icon={Upload}
          titulo="Todavía no le pasaste ventas del sistema anterior a María"
          descripcion="Subí las facturas que emitiste antes de usar el sistema, en PDF o en foto. María te dice cuáles faltan y las cargás como históricas, para cobrar lo que siga pendiente."
          accion={
            subir.isPending
              ? undefined
              : {
                  label: "Subir facturas",
                  onClick: () => entrada.current?.click(),
                }
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {lecturas.map((l) => (
            <Fila key={l.id} lectura={l} onAbrir={() => setAbierta(l.id)} />
          ))}
        </ul>
      )}

      <Dialog
        open={enPantalla !== null}
        onOpenChange={(v) => !v && setAbierta(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Las facturas que leí</DialogTitle>
              <DialogDescription>
                Elegí cuáles cargar. Entran con su número y su fecha, sin
                asiento y sin mover el inventario.
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            {enPantalla !== null && (
              <Detalle
                key={enPantalla.id}
                lectura={enPantalla}
                onCargadas={() => setAbierta(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Las facturas de un archivo, con qué elegir y cargar. */
function Detalle({
  lectura,
  onCargadas,
}: {
  lectura: LecturaVentasAnteriores;
  onCargadas: () => void;
}) {
  const cliente = useQueryClient();
  const facturas = lectura.extraido?.facturas ?? [];
  const listas = facturas.filter((f) => situacionDe(f, lectura) === "LISTA");

  // Por número: si se carga y si ya estaba pagada. Arranca con todas las
  // listas elegidas, y pagada si el papel dice contado.
  const [elegidas, setElegidas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(listas.map((f) => [f.factura.numero, true])),
  );
  const [pagadas, setPagadas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      facturas.map((f) => [
        f.factura.numero,
        f.factura.formaPago === "CONTADO",
      ]),
    ),
  );
  const [rechazo, setRechazo] = useState<ResultadoCargaAnteriores["problemas"]>(
    [],
  );

  const aCargar = listas.filter((f) => elegidas[f.factura.numero]);

  const cargar = useMutation({
    mutationFn: () =>
      ventasAnterioresApi.cargar(
        lectura.id,
        aCargar.map((f) => ({
          numero: f.factura.numero,
          pagada: pagadas[f.factura.numero] ?? false,
        })),
      ),
    onSuccess: async (r) => {
      if (r.problemas.length > 0) {
        setRechazo(r.problemas);
        return;
      }
      await cliente.invalidateQueries({ queryKey: CLAVE });
      await cliente.invalidateQueries({ queryKey: ["facturas"] });
      aviso.exito(
        r.registradas === 1
          ? "Cargué 1 factura."
          : `Cargué ${r.registradas} facturas.`,
      );
      onCargadas();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  if (lectura.extraido === null) {
    return (
      <p className="text-sm text-muted-foreground">
        No quedó nada que mostrar de esta lectura.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {lectura.extraido.preguntas.map((p) => (
        <p
          key={p.sobre}
          className="rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm"
        >
          {p.texto}
        </p>
      ))}

      <ul className="flex flex-col overflow-hidden rounded-2xl border border-border">
        {facturas.map((f) => (
          <FilaFactura
            key={f.factura.numero}
            cruzada={f}
            situacion={situacionDe(f, lectura)}
            enSistema={lectura.enSistema[f.factura.numero]?.numero}
            elegida={elegidas[f.factura.numero] ?? false}
            pagada={pagadas[f.factura.numero] ?? false}
            onElegir={(v) =>
              setElegidas((e) => ({ ...e, [f.factura.numero]: v }))
            }
            onPagada={(v) =>
              setPagadas((p) => ({ ...p, [f.factura.numero]: v }))
            }
          />
        ))}
      </ul>

      {rechazo.length > 0 && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="mb-2 font-medium">
            No cargué ninguna. Esto lo impidió:
          </p>
          <ul className="flex flex-col gap-1">
            {rechazo.map((r) => (
              <li key={r.numero}>
                <span className="font-mono">{r.numero}</span>:{" "}
                {r.problemas.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {listas.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button
            type="button"
            className="h-11 rounded-xl px-6"
            disabled={aCargar.length === 0 || cargar.isPending}
            onClick={() => {
              setRechazo([]);
              cargar.mutate();
            }}
          >
            {cargar.isPending && <Loader2 className="size-4 animate-spin" />}
            {aCargar.length === 1
              ? "Cargar 1 factura"
              : `Cargar ${aCargar.length} facturas`}
          </Button>
          <p className="text-xs text-muted-foreground">
            Las que no marques como pagadas quedan en la cartera, para
            cobrarlas.
          </p>
        </div>
      )}
    </div>
  );
}

function FilaFactura({
  cruzada: f,
  situacion,
  enSistema,
  elegida,
  pagada,
  onElegir,
  onPagada,
}: {
  cruzada: VentaAnteriorCruzada;
  situacion: Situacion;
  enSistema: string | undefined;
  elegida: boolean;
  pagada: boolean;
  onElegir: (v: boolean) => void;
  onPagada: (v: boolean) => void;
}) {
  const noDan = f.comprobaciones.filter((c) => !c.cuadra);
  const lista = situacion === "LISTA";

  return (
    <li className="flex flex-col gap-2 border-b border-border p-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-0.5"
          checked={lista && elegida}
          disabled={!lista}
          onCheckedChange={(v) => onElegir(v === true)}
          aria-label={`Cargar la factura ${f.factura.numero}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            <span className="font-mono">{f.factura.numero}</span> ·{" "}
            {f.cliente?.nombre ?? f.factura.cliente.nombre}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFecha(f.factura.fecha)} ·{" "}
            {f.renglones.length === 1
              ? "1 renglón"
              : `${f.renglones.length} renglones`}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums">
          {formatCOP(f.factura.impreso.total)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        <span
          className={cn(
            "rounded-full border px-2.5 py-[3px] text-xs font-medium",
            situacion === "EN_SISTEMA" &&
              "border-border bg-muted/60 text-muted-foreground",
            situacion === "LISTA" && "border-success/35 bg-success/12",
            situacion === "PENDIENTE" && "border-warning/40 bg-warning/12",
          )}
        >
          {situacion === "EN_SISTEMA"
            ? `Ya está en el sistema como ${enSistema}`
            : situacion === "LISTA"
              ? "Lista para cargar"
              : "Falta resolver algo"}
        </span>
        {lista && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={pagada}
              onCheckedChange={(v) => onPagada(v === true)}
            />
            Ya estaba pagada
            {f.factura.formaPago === null && " (el papel no lo dice)"}
          </label>
        )}
      </div>

      {situacion === "PENDIENTE" && (
        <ul className="flex flex-col gap-1 pl-7 text-xs">
          {noDan.map((c) => (
            <li key={c.que} className="flex items-start gap-1.5 text-danger">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {c.que}: da {formatCOP(c.calculado)} y el papel dice{" "}
              {formatCOP(c.impreso)}.
            </li>
          ))}
          {f.preguntas.map((p) => (
            <li key={p.sobre} className="text-warning-foreground">
              {p.texto}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Fila({
  lectura,
  onAbrir,
}: {
  lectura: LecturaVentasAnteriores;
  onAbrir: () => void;
}) {
  const enCurso = lectura.estado === "EN_COLA" || lectura.estado === "LEYENDO";
  const estado = estadoDe(lectura);

  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        disabled={enCurso || lectura.estado === "FALLO"}
        className={cn(
          "flex w-full flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors",
          enCurso ? "opacity-70" : "hover:border-brand/40",
        )}
      >
        <Maria estado={estado.cara} tamano={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{estado.titulo}</p>
          <p className="truncate text-xs text-muted-foreground">
            {estado.texto}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatFecha(lectura.creadoEn)}
        </p>
      </button>
    </li>
  );
}

function estadoDe(lectura: LecturaVentasAnteriores): {
  cara: "leyendo" | "noPude" | "espera" | "lista" | "reposo";
  titulo: string;
  texto: string;
} {
  if (lectura.estado === "EN_COLA" || lectura.estado === "LEYENDO") {
    return {
      cara: "leyendo",
      titulo: "Leyendo…",
      texto: "Leyendo las facturas…",
    };
  }
  if (lectura.estado === "FALLO") {
    return {
      cara: "noPude",
      titulo: "Facturas de venta",
      texto: lectura.error ?? "No las pude leer.",
    };
  }
  if (lectura.estado === "DESCARTADO") {
    return {
      cara: "reposo",
      titulo: "Facturas de venta",
      texto: `Descartado: ${lectura.motivoDescarte ?? "sin motivo"}`,
    };
  }
  const facturas = lectura.extraido?.facturas ?? [];
  const cuenta = { EN_SISTEMA: 0, LISTA: 0, PENDIENTE: 0 };
  for (const f of facturas) cuenta[situacionDe(f, lectura)]++;

  const partes = [
    cuenta.EN_SISTEMA > 0 &&
      (cuenta.EN_SISTEMA === facturas.length
        ? "todas ya están en el sistema"
        : `${cuenta.EN_SISTEMA} ya ${cuenta.EN_SISTEMA === 1 ? "está" : "están"}`),
    cuenta.LISTA > 0 &&
      `${cuenta.LISTA} ${cuenta.LISTA === 1 ? "lista" : "listas"} para cargar`,
    cuenta.PENDIENTE > 0 && `${cuenta.PENDIENTE} con algo por resolver`,
  ].filter(Boolean);

  return {
    cara:
      cuenta.PENDIENTE > 0 ? "espera" : cuenta.LISTA > 0 ? "lista" : "reposo",
    titulo:
      facturas.length === 1
        ? `${facturas[0].factura.numero} · ${facturas[0].factura.cliente.nombre}`
        : `${facturas.length} facturas de venta`,
    texto: partes.join(" · ") || "No encontré facturas en el archivo.",
  };
}
