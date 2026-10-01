"use client";

import { TriangleAlert, Upload } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { RUTA_PASO } from "@/modules/configuracion/components/rutas";
import type {
  DatoExtraido,
  Documento,
  ResultadoConfirmacion,
  TipoDocumento,
} from "../types/asistente.types";
import {
  DOCUMENTOS,
  TITULO_DOCUMENTO,
  TIPOS_ACEPTADOS,
} from "../types/asistente.types";
import { BotonTarjeta, Pildora } from "./Piezas";

/**
 * Las tarjetas del asistente. Cada una dibuja algo que el backend devolvió: el
 * estado de los documentos, lo que se leyó de uno, una lectura que falló, o el
 * resultado de confirmar. Ninguna tiene datos propios.
 */

/** El marco común: borde, fondo de tarjeta y el mismo relleno del prototipo. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-[18px] pt-1.5 pb-4">
      {children}
    </div>
  );
}

function Cabecera({ titulo, resumen }: { titulo: string; resumen?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[13px] font-semibold">{titulo}</span>
      {resumen !== undefined && (
        <span className="text-xs text-muted-foreground">{resumen}</span>
      )}
    </div>
  );
}

/**
 * Los tres documentos y en qué va cada uno.
 *
 * Una fila por tipo y no una por archivo subido: la configuración se resuelve con
 * un RUT, una Cámara y una resolución, y si alguien sube el RUT dos veces lo que
 * importa es el último intento. Eso es también lo que devuelve el backend.
 *
 * Una lectura en curso se cuenta abajo, en su burbuja de carga, con el botón
 * Detener. Acá la fila solo dice que está en curso: repetir la barra en dos
 * lugares sería contar lo mismo dos veces.
 */
export function TarjetaDocumentos({
  documentos,
  subiendo,
  alSubir,
}: {
  documentos: Documento[];
  /** El tipo que se está subiendo ahora, para apagar su botón. */
  subiendo?: TipoDocumento;
  alSubir: (tipo: TipoDocumento, archivo: File) => void;
}) {
  const leidos = documentos.filter((d) => d.estado === "LEIDO").length;

  return (
    <Marco>
      <Cabecera
        titulo="Documentos"
        resumen={leidos === 0 ? "ninguno leído todavía" : `${leidos} de 3 leídos`}
      />
      {DOCUMENTOS.map((tipo) => (
        <FilaDocumento
          key={tipo}
          tipo={tipo}
          documento={documentos.find((d) => d.tipo === tipo)}
          subiendo={subiendo === tipo}
          alSubir={alSubir}
        />
      ))}
    </Marco>
  );
}

function FilaDocumento({
  tipo,
  documento,
  subiendo,
  alSubir,
}: {
  tipo: TipoDocumento;
  documento?: Documento;
  subiendo: boolean;
  alSubir: (tipo: TipoDocumento, archivo: File) => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const estado = documento?.estado;
  const enCurso = estado === "EN_COLA" || estado === "LEYENDO";

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-muted py-2.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium">
          {TITULO_DOCUMENTO[tipo]}
        </span>
        <span className="text-xs text-muted-foreground">
          {documento?.error ?? textoDeEstado(estado)}
        </span>
      </span>

      <span className="flex items-center gap-2">
        {estado === "LEYENDO" && <Pildora tono="PENDIENTE">Leyendo</Pildora>}
        {estado === "EN_COLA" && (
          <span className="text-xs text-muted-foreground">En cola</span>
        )}
        {estado === "LEIDO" && <Pildora tono="HECHO">Leído</Pildora>}
        {estado === "FALLO" && <Pildora tono="PENDIENTE">No se pudo leer</Pildora>}

        {/* Mientras se lee no se ofrece subir otro: el botón Detener está en la
            burbuja de carga, abajo. */}
        {enCurso ? null : (
          <>
            {/* El archivo no pasa por la API: este `input` es solo para elegirlo;
                sube directo al bucket con una URL firmada. */}
            <input
              ref={campo}
              type="file"
              accept={TIPOS_ACEPTADOS.join(",")}
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo !== undefined) alSubir(tipo, archivo);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={subiendo}
              onClick={() => campo.current?.click()}
              className="inline-flex h-[34px] items-center gap-2 rounded-md border border-dashed border-input bg-card px-3.5 text-[13px] font-medium disabled:opacity-50"
            >
              <Upload className="size-3.5" />
              {estado === undefined ? "Subir" : "Subir otro"}
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function textoDeEstado(estado?: Documento["estado"]): string {
  switch (estado) {
    case undefined:
      return "Sin subir";
    case "EN_COLA":
      return "Esperando turno";
    case "LEYENDO":
      return "Leyendo el documento…";
    case "LEIDO":
      return "Listo para revisar";
    case "FALLO":
      return "No se pudo leer";
  }
}

/**
 * Lo que un documento dijo, con su fuente, antes de que alguien lo aplique.
 *
 * La fuente va en mono a la derecha —«RUT · 53»— y es lo que permite discutir un
 * dato sin abrir el PDF. Lo dudoso se muestra aparte y **no entra en «Todo
 * correcto»**: el backend lo rechaza igual, pero ofrecerlo sería mentir sobre lo
 * que va a pasar.
 */
export function TarjetaExtraido({
  documento,
  confirmando,
  yaConfirmado,
  alConfirmar,
}: {
  documento: Documento;
  confirmando: boolean;
  /** Ya se confirmó en esta sesión: la tarjeta deja de ofrecer guardarlo. */
  yaConfirmado: boolean;
  alConfirmar: (id: string) => void;
}) {
  const seguros = documento.datos.filter((d) => d.confianza === "ALTA");
  const dudosos = documento.datos.filter((d) => d.confianza !== "ALTA");
  const primerPaso = seguros[0]?.paso ?? dudosos[0]?.paso;

  return (
    <Marco>
      <Cabecera
        titulo="Esto encontré"
        resumen={`${seguros.length} ${seguros.length === 1 ? "dato" : "datos"}`}
      />

      {seguros.map((dato) => (
        <FilaDato key={dato.campo} dato={dato} />
      ))}

      {dudosos.length > 0 && (
        <>
          <div className="flex items-center justify-between border-t border-muted py-2.5">
            <span className="text-xs text-muted-foreground">
              {dudosos.length === 1
                ? "1 dato que no pude leer con seguridad: se lo pregunto en vez de adivinarlo"
                : `${dudosos.length} datos que no pude leer con seguridad: se los pregunto en vez de adivinarlos`}
            </span>
          </div>
          {dudosos.map((dato) => (
            <FilaDato key={dato.campo} dato={dato} atenuada />
          ))}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {yaConfirmado
            ? "Ya lo confirmó. Abajo está lo que se guardó y lo que quedó pendiente."
            : "Nada se guarda hasta que usted confirme."}
        </span>
        <span className="flex gap-2">
          {/* Un enlace, no un botón: lleva al paso manual con la pantalla de
              siempre. Envolverlo en un `button` anidaría dos controles.

              Queda también después de confirmar: lo que quedó pendiente se
              arregla justamente ahí. */}
          {primerPaso !== undefined && (
            <Link
              href={RUTA_PASO[primerPaso]}
              className="inline-flex h-[34px] items-center rounded-md border border-input bg-card px-4 text-[13px] font-medium whitespace-nowrap text-foreground"
            >
              Corregir algo
            </Link>
          )}
          {/* «Todo correcto» desaparece una vez confirmado, no se deshabilita:
              un botón apagado invita a preguntarse por qué, y la respuesta
              —«porque ya lo hiciste»— la da mejor el texto de la izquierda.
              Volver a apretarlo sacaba un segundo resumen que contradecía al
              primero. */}
          {!yaConfirmado && (
            <BotonTarjeta
              principal
              disabled={confirmando || seguros.length === 0}
              onClick={() => alConfirmar(documento.id)}
            >
              {confirmando ? "Guardando…" : "Todo correcto"}
            </BotonTarjeta>
          )}
        </span>
      </div>
    </Marco>
  );
}

function FilaDato({ dato, atenuada }: { dato: DatoExtraido; atenuada?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-3 border-t border-muted py-2.5",
        atenuada && "opacity-75",
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium">{dato.etiqueta}</span>
        <span className="truncate text-xs text-muted-foreground">
          {comoTexto(dato.valor)}
        </span>
      </span>
      <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
        {dato.fuente.casilla === undefined
          ? TITULO_DOCUMENTO[dato.fuente.documento]
          : `${TITULO_DOCUMENTO[dato.fuente.documento]} · ${dato.fuente.casilla}`}
      </span>
    </div>
  );
}

/** Un valor leído, para mostrarlo. Las listas —la casilla 53— van separadas por coma. */
export function comoTexto(valor: unknown): string {
  if (Array.isArray(valor)) return valor.map((v) => String(v)).join(", ");
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  return String(valor);
}

/**
 * Una lectura que no salió. El texto es el del backend, tal cual: ahí se decidió
 * qué se le puede decir a la persona.
 *
 * Va en `warning` y no en `danger`: nada se rompió, hay trabajo que sigue a mano.
 */
export function TarjetaFalla({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/8 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="flex flex-col gap-[3px]">
          <span className="text-sm font-medium">{titulo}</span>
          <span className="text-[13px] leading-normal text-muted-foreground">
            {detalle}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Qué quedó guardado y qué no.
 *
 * Lo que no se aplicó viene con su motivo desde el backend —«Falta el municipio
 * para registrar la sede», «El código CIIU no tiene cuatro dígitos»— y se muestra
 * como lo que es: trabajo que sigue a mano, no un error del sistema.
 */
export function TarjetaConfirmado({
  resultado,
}: {
  resultado: ResultadoConfirmacion;
}) {
  return (
    <Marco>
      <Cabecera
        titulo={
          resultado.aplicados.length === 1
            ? "1 dato guardado"
            : `${resultado.aplicados.length} datos guardados`
        }
        resumen={
          resultado.sinAplicar.length === 0
            ? undefined
            : `${resultado.sinAplicar.length} sin aplicar`
        }
      />
      {resultado.sinAplicar.map((pendiente) => (
        <div
          key={`${pendiente.campo}-${pendiente.motivo}`}
          className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-muted py-2.5"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium">
              {pendiente.etiqueta}
            </span>
            <span className="text-xs text-muted-foreground">{pendiente.motivo}</span>
          </span>
          <Pildora tono="PENDIENTE">Queda pendiente</Pildora>
        </div>
      ))}
    </Marco>
  );
}
