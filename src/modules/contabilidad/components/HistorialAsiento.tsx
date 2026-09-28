"use client";

import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Check, FileText, Library, Lock, TriangleAlert } from "lucide-react";

import { Maria } from "@/modules/asistente/components/Maria";
import { cn } from "@/lib/utils";
import type { PasoTrazabilidad, Trazabilidad } from "../types/contabilidad.types";

/**
 * El archivo del que salió el asiento, con su huella.
 *
 * La huella es lo que permite decir «el PDF que hay hoy es el mismo que se
 * leyó»: se muestran los primeros y los últimos caracteres, como en el
 * prototipo, y la completa queda en el `title` para quien la quiera comparar.
 */
export function DocumentoSoporte({
  documento,
}: {
  documento: NonNullable<Trazabilidad["documento"]>;
}) {
  const extension = documento.nombre.split(".").pop()?.toUpperCase();
  return (
    <section className="flex items-center gap-4 rounded-2xl border border-border px-5 py-4">
      <span className="flex h-15 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
        <FileText className="size-5 text-muted-foreground" strokeWidth={1.6} aria-hidden />
      </span>
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <h3 className="text-sm font-medium">Documento soporte</h3>
        <span className="truncate text-[13px] text-muted-foreground">
          {extension === "PDF" ? "PDF" : "Imagen"} · lo leyó María
        </span>
        <span
          className="font-mono text-[11px] text-muted-foreground"
          title={documento.huella ?? undefined}
        >
          {documento.huella === null
            ? "sin huella: el archivo ya no está"
            : `huella sha256 · ${documento.huella.slice(0, 4)}…${documento.huella.slice(-4)}`}
        </span>
      </div>
      {documento.url !== null && (
        <a
          href={documento.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-input bg-background px-4 text-[13px] font-medium hover:bg-muted"
        >
          Abrir
        </a>
      )}
    </section>
  );
}

/**
 * Quién hizo qué y cuándo, del documento al libro.
 *
 * El prototipo es `docs/mocks/asistente-ia-diseno/Trazabilidad.dc.html`, con un
 * cambio: su paso «Asentado sin preguntar» no existe, porque María no registra
 * nada sola. Ese lugar lo ocupa la persona que aprobó, con sus iniciales.
 */
export function HistorialAsiento({ pasos }: { pasos: PasoTrazabilidad[] }) {
  return (
    <section className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-[15px] font-semibold">Trazabilidad</h3>
        <Lock className="size-[15px] text-muted-foreground" aria-hidden />
      </div>
      <ol aria-label="Historial del asiento" className="m-0 list-none p-0">
        {pasos.map((paso, i) => {
          const ultimo = i === pasos.length - 1;
          const cambioDeDia = i === 0 || !isSameDay(parseISO(pasos[i - 1].cuando), parseISO(paso.cuando));
          return (
            <li key={`${paso.clave}-${i}`} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="flex flex-col items-center">
                <span className="flex size-7 items-center justify-center">
                  <Marca paso={paso} />
                </span>
                {!ultimo && <span className="my-1 w-0 grow border-l border-border" />}
              </span>
              <div className="flex flex-col gap-0.5 pt-1 pb-[18px]">
                <span className="flex justify-between gap-2">
                  <span className="text-[13px] font-semibold">{paso.titulo}</span>
                  <time
                    dateTime={paso.cuando}
                    className="font-mono text-[11px] whitespace-nowrap text-muted-foreground"
                  >
                    {format(parseISO(paso.cuando), cambioDeDia ? "d MMM · HH:mm" : "HH:mm", {
                      locale: es,
                    })}
                  </time>
                </span>
                <span className="text-xs leading-normal text-muted-foreground">{paso.detalle}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 rounded-lg bg-muted/60 p-3 text-xs leading-normal text-muted-foreground">
        Este historial no se puede editar. Si el asiento se anula, la anulación se agrega aquí con
        su motivo.
      </p>
    </section>
  );
}

/** El círculo de cada paso: la cara si fue María, las iniciales si fue una persona. */
function Marca({ paso }: { paso: PasoTrazabilidad }) {
  if (paso.clave === "VERIFICADO") {
    return paso.aviso ? (
      <span className="flex size-[26px] items-center justify-center rounded-full border border-warning/40 bg-warning/15">
        <TriangleAlert className="size-3.5 text-foreground" strokeWidth={2.2} aria-label="Con avisos" />
      </span>
    ) : (
      <span className="flex size-[26px] items-center justify-center rounded-full bg-success/15">
        <Check className="size-[13px] text-success" strokeWidth={2.8} aria-label="Superado" />
      </span>
    );
  }
  if (paso.deMaria) return <Maria estado="reposo" tamano={24} />;
  if (paso.clave === "RECIBIDO") {
    return (
      <span className="flex size-[26px] items-center justify-center rounded-full border border-border">
        <FileText className="size-[13px] text-muted-foreground" aria-hidden />
      </span>
    );
  }
  if (paso.clave === "CONTABILIZADO") {
    return (
      <span className="flex size-[26px] items-center justify-center rounded-full bg-primary">
        <Library className="size-[13px] text-primary-foreground" aria-hidden />
      </span>
    );
  }
  return (
    <span
      title={paso.persona?.nombre}
      className={cn(
        "flex size-[26px] items-center justify-center rounded-full text-[10px] font-semibold",
        paso.clave === "ANULADO"
          ? "border border-danger/30 bg-danger/10 text-foreground"
          : "bg-muted text-foreground",
      )}
    >
      {paso.persona?.iniciales ?? "—"}
    </span>
  );
}
