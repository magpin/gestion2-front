"use client";

import Link from "next/link";

import { cn, formatCOP, formatFecha } from "@/lib/utils";
import styles from "../asistente.module.css";
import type { ArchivoDelLote, Lote, SituacionArchivo } from "../types/lote.types";
import type { EstadoMaria } from "./Maria";
import { Turno } from "./Mensajes";
import { BotonTarjeta, ChipArchivo } from "./Piezas";

/** Cuántos chips de archivo se muestran antes de «+N más». */
const CHIPS = 4;

/**
 * Un lote en el chat: lo que la persona soltó, y lo que María hizo con cada
 * archivo. Tanda 3 del diseño, sobre `Procesando.dc.html` —mientras lee— y
 * `Main.dc.html` —cuando termina—.
 *
 * **Donde el prototipo dice «asentadas solas», acá dice «listas para
 * aprobar»**: María no registra nada sin una persona. Cada una se aprueba en el
 * diálogo de siempre, mirando sus renglones; esta tarjeta no escribe nada
 * salvo descartar, y descartar también lo decide quien mira.
 */
export function TurnosDelLote({
  lote,
  deteniendo,
  alDetener,
  alRevisar,
  alDescartar,
}: {
  lote: Lote;
  deteniendo: boolean;
  alDetener: (id: string) => void;
  alRevisar: (archivo: ArchivoDelLote) => void;
  alDescartar: (archivo: ArchivoDelLote) => void;
}) {
  const enMarcha = lote.terminadoEn === null;
  return (
    <div className="flex flex-col gap-[22px]">
      <div className={`${styles.entra} flex flex-col items-end gap-2`}>
        <div className="flex max-w-[520px] flex-wrap justify-end gap-1.5">
          {lote.archivos.slice(0, CHIPS).map((a) => (
            <ChipArchivo key={a.id} nombre={a.nombre} />
          ))}
          {lote.total > CHIPS && (
            <span className="inline-flex items-center rounded-md border border-border bg-card px-3 text-xs text-muted-foreground">
              +{lote.total - CHIPS} más
            </span>
          )}
        </div>
        <div className="max-w-[420px] rounded-xl rounded-br-[0.3rem] bg-primary px-4 py-2.5 text-sm leading-normal text-primary-foreground">
          {lote.total === 1 ? "Leé este documento." : `Leé estos ${lote.total} documentos.`}
        </div>
      </div>

      <Turno
        turno={{
          id: `lote-${lote.id}`,
          autor: "ASISTENTE",
          texto: enMarcha ? undefined : resumen(lote),
        }}
        pensando={enMarcha}
        cara={caraDelLote(lote)}
        tarjeta={
          enMarcha ? (
            <Procesando lote={lote} deteniendo={deteniendo} alDetener={alDetener} />
          ) : (
            <Resultado lote={lote} alRevisar={alRevisar} alDescartar={alDescartar} />
          )
        }
      />
    </div>
  );
}

/**
 * La cara del turno del lote. Mientras lee, con las membranas abiertas. Al
 * terminar, «no pude» si algún archivo falló —eso no cambia después—; si no,
 * en reposo. Lo apartado no pone la cara en espera acá: se resuelve y este
 * turno queda en el historial, y la espera la cuenta la cabecera, que sí sabe
 * lo que falta hoy.
 */
export function caraDelLote(lote: Lote): EstadoMaria | undefined {
  if (lote.terminadoEn === null) return "leyendo";
  return lote.archivos.some((a) => a.situacion === "FALLO") ? "noPude" : undefined;
}

/** Lo que dice María cuando termina. Sin «asenté»: nada se asentó. */
export function resumen(lote: Lote): string {
  if (lote.detenido && lote.hechos < lote.total) {
    return `Paré, como pediste. Alcancé a mirar ${lote.hechos} de ${lote.total}.`;
  }
  const partes = [
    lote.listas > 0 &&
      `**${lote.listas}** ${lote.listas === 1 ? "está lista" : "están listas"} para que ${lote.listas === 1 ? "la apruebes" : "las apruebes"}`,
    lote.apartadas > 0 &&
      `**${lote.apartadas}** ${lote.apartadas === 1 ? "la aparté" : "las aparté"} porque hay algo que decidir`,
  ].filter(Boolean);
  if (partes.length === 0) return "Listo. Esto es lo que encontré:";
  return `Listo. ${partes.join(", y ")}. Nada se registra hasta que lo apruebes.`;
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </div>
  );
}

/** Mientras lee: cuántos van, cuál está leyendo, y cada archivo con su estado. */
function Procesando({
  lote,
  deteniendo,
  alDetener,
}: {
  lote: Lote;
  deteniendo: boolean;
  alDetener: (id: string) => void;
}) {
  const quedan = lote.total - lote.hechos;
  return (
    <Marco>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">
            Leyendo {lote.total === 1 ? "1 documento" : `${lote.total} documentos`}
          </span>
          <span className="truncate text-xs text-muted-foreground" aria-live="polite">
            {lote.actual === null ? "Preparando…" : `Mirando ${lote.actual}…`}
          </span>
        </div>
        <BotonTarjeta onClick={() => alDetener(lote.id)} disabled={deteniendo}>
          {deteniendo ? "Deteniendo…" : "Detener"}
        </BotonTarjeta>
      </div>
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium">
            {lote.hechos} de {lote.total} listos
          </span>
          <span className="text-muted-foreground">
            {quedan === 0 ? "terminando" : `${quedan === 1 ? "queda 1" : `quedan ${quedan}`}`}
          </span>
        </div>
        {/* Barra en acento: forma chica que dirige la atención, que es lo que
            el reglamento de color le permite al naranja. */}
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${(lote.hechos / Math.max(lote.total, 1)) * 100}%` }}
          />
        </div>
        <p className="m-0 text-xs leading-normal text-muted-foreground">
          Leo de a uno y compruebo cada uno igual: que las cuentas den, que conozca al
          proveedor o al cliente, que no esté repetido. Lo que no pase, lo aparto y te pregunto.
        </p>
      </div>
      <ul className="m-0 list-none divide-y divide-border border-t border-border p-0">
        {lote.archivos.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex min-w-0 grow flex-col">
              <span className="truncate text-[13px] font-medium">{a.titulo}</span>
              <span className="truncate text-xs text-muted-foreground">
                {a.titulo === a.nombre ? a.descripcion : `${a.descripcion} · ${a.nombre}`}
              </span>
            </div>
            {a.valor !== null && (
              <span className="shrink-0 font-mono text-xs tabular-nums">{formatCOP(a.valor)}</span>
            )}
            <Estado situacion={a.situacion} />
          </li>
        ))}
      </ul>
    </Marco>
  );
}

/** Cuando termina: las listas, las apartadas con su decisión, y el resto. */
function Resultado({
  lote,
  alRevisar,
  alDescartar,
}: {
  lote: Lote;
  alRevisar: (archivo: ArchivoDelLote) => void;
  alDescartar: (archivo: ArchivoDelLote) => void;
}) {
  const grupos: Array<{ titulo: string; archivos: ArchivoDelLote[] }> = [
    { titulo: "Listas para aprobar", archivos: lote.archivos.filter((a) => a.situacion === "LISTA") },
    { titulo: "Apartadas", archivos: lote.archivos.filter((a) => a.situacion === "APARTADA") },
    {
      titulo: "Ya decididas",
      archivos: lote.archivos.filter(
        (a) => a.situacion === "REGISTRADA" || a.situacion === "DESCARTADA",
      ),
    },
    {
      titulo: "Lo demás",
      archivos: lote.archivos.filter((a) =>
        ["CONFIGURACION", "NO_SE_LEE", "FALLO", "DETENIDO"].includes(a.situacion),
      ),
    },
  ].filter((g) => g.archivos.length > 0);

  return (
    <Marco>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3.5">
        <span className="text-sm font-semibold">
          {lote.total === 1 ? "1 documento recibido" : `${lote.total} documentos recibidos`}
        </span>
        <span className="text-xs text-muted-foreground">
          {lote.listas} {lote.listas === 1 ? "lista" : "listas"} · {lote.apartadas}{" "}
          {lote.apartadas === 1 ? "apartada" : "apartadas"}
        </span>
      </div>
      {grupos.map((g) => (
        <section key={g.titulo} aria-label={g.titulo} className="border-b border-border last:border-b-0">
          <h4 className="m-0 px-4 pt-3 pb-1 font-mono text-[10px] font-normal tracking-[1.2px] text-muted-foreground uppercase">
            {g.titulo}
          </h4>
          <ul className="m-0 list-none divide-y divide-border p-0">
            {g.archivos.map((a) => (
              <FilaResultado key={a.id} archivo={a} alRevisar={alRevisar} alDescartar={alDescartar} />
            ))}
          </ul>
        </section>
      ))}
    </Marco>
  );
}

function FilaResultado({
  archivo: a,
  alRevisar,
  alDescartar,
}: {
  archivo: ArchivoDelLote;
  alRevisar: (archivo: ArchivoDelLote) => void;
  alDescartar: (archivo: ArchivoDelLote) => void;
}) {
  const duplicado = a.motivos.some(
    (m) => m.clave === "DUPLICADO" || m.clave === "REPETIDO_EN_LOTE",
  );
  const esPedido = a.tipo === "PEDIDO_VENTA";
  // Facturas del sistema anterior: se eligen y se cargan en Ventas (fase 11).
  const esVentaAnterior = a.tipo === "VENTA_HISTORICA";
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium">{a.titulo}</span>
          <span className="truncate text-xs text-muted-foreground">
            {a.titulo === a.nombre ? a.descripcion : `${a.descripcion} · ${a.nombre}`}
          </span>
        </div>
        {a.valor !== null && (
          <span className="shrink-0 font-mono text-[13px] tabular-nums">{formatCOP(a.valor)}</span>
        )}
        <Estado situacion={a.situacion} numero={a.registrado?.numero} />
      </div>

      {a.motivos.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {a.motivos.map((m) => (
            <li
              key={m.clave}
              className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-[3px] text-xs"
            >
              {m.texto}
            </li>
          ))}
        </ul>
      )}

      {a.duplicadoDe !== null && (
        <p className="m-0 text-xs leading-normal text-muted-foreground">
          La registrada: {a.duplicadoDe.numero}, del {formatFecha(a.duplicadoDe.fecha)}, por{" "}
          {formatCOP(a.duplicadoDe.total)}.
        </p>
      )}
      {a.nota !== null && (
        <p className="m-0 text-xs leading-normal text-muted-foreground">{a.nota}</p>
      )}

      {(a.situacion === "LISTA" || a.situacion === "APARTADA") && a.documentoId !== null && (
        <div className="flex flex-wrap gap-2">
          {duplicado && (
            <BotonTarjeta onClick={() => alDescartar(a)}>Es la misma, descartala</BotonTarjeta>
          )}
          {esPedido || esVentaAnterior ? (
            <Link
              href={`/dashboard/ventas?seccion=${esPedido ? "pedidos" : "anteriores"}`}
              className="inline-flex h-[34px] items-center rounded-md border border-input bg-card px-4 text-[13px] font-medium whitespace-nowrap"
            >
              {esPedido ? "Facturarlo en Ventas" : "Revisarlas y cargarlas"}
            </Link>
          ) : (
            <BotonTarjeta principal={a.situacion === "LISTA"} onClick={() => alRevisar(a)}>
              {duplicado
                ? "Es distinta, revisala"
                : a.situacion === "LISTA"
                  ? "Revisar y aprobar"
                  : "Revisar"}
            </BotonTarjeta>
          )}
        </div>
      )}
    </li>
  );
}

const ESTADO: Record<SituacionArchivo, { texto: string; tono: "neutro" | "hecho" | "espera" | "falla" }> = {
  EN_COLA: { texto: "En cola", tono: "neutro" },
  MIRANDO: { texto: "Mirando…", tono: "neutro" },
  LEYENDO: { texto: "Leyendo…", tono: "neutro" },
  LISTA: { texto: "Lista", tono: "hecho" },
  APARTADA: { texto: "Apartada", tono: "espera" },
  REGISTRADA: { texto: "Registrada", tono: "hecho" },
  DESCARTADA: { texto: "Descartada", tono: "neutro" },
  CONFIGURACION: { texto: "Para confirmar", tono: "espera" },
  NO_SE_LEE: { texto: "No lo leo", tono: "neutro" },
  FALLO: { texto: "No pude leerlo", tono: "falla" },
  DETENIDO: { texto: "Detenido", tono: "neutro" },
};

/** La píldora de estado: color en fondo y borde, texto neutro. */
function Estado({ situacion, numero }: { situacion: SituacionArchivo; numero?: string }) {
  const { texto, tono } = ESTADO[situacion];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-xs font-medium whitespace-nowrap",
        tono === "hecho" && "border-success/35 bg-success/12",
        tono === "espera" && "border-warning/40 bg-warning/12",
        tono === "falla" && "border-danger/30 bg-danger/10",
        tono === "neutro" && "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      {texto}
      {numero !== undefined && situacion === "REGISTRADA" && (
        <span className="font-mono text-[11px]">{numero}</span>
      )}
    </span>
  );
}
