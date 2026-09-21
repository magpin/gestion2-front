"use client";

import { ArrowUp, Paperclip } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { TIPOS_ACEPTADOS, type TipoDocumento } from "../types/asistente.types";
import { MenuAgregar, type FuenteArchivo } from "./MenuAgregar";

/** El tope de la pregunta, el mismo que valida el backend (`TurnoDto`). */
export const MAXIMO_PREGUNTA = 8000;

/** Lo que el pie necesita para conversar. Sin esto, solo se adjunta. */
export interface ConversacionDelPie {
  /** Se manda la pregunta. `false` si el backend no la aceptó: el texto vuelve al campo. */
  alEnviar: (texto: string) => Promise<boolean>;
  /** Hay una respuesta llegando: no se manda otra. */
  respondiendo: boolean;
  /** La conversación ya pesa el tope: se ofrece empezar otra. */
  superaTope: boolean;
  preguntas: readonly string[];
  alNueva: () => void;
  nuevaDeshabilitada: boolean;
}

/**
 * El pie del chat: escribir una pregunta y adjuntar un documento.
 *
 * **El campo de texto entró recién en el paso 5**, cuando hubo a quién
 * preguntarle. Antes el pie era solo una zona para soltar archivos, con borde
 * punteado, porque un campo sin respuesta detrás era una promesa falsa. Sin
 * conversación —falta la clave del modelo— el pie vuelve a ser eso.
 *
 * Con conversación, soltar un archivo sigue funcionando sobre todo el pie: el
 * borde se vuelve punteado mientras el archivo está encima, y cae como **RUT**,
 * que es el documento con el que empieza casi toda configuración. Para elegir
 * otro, o sacar una foto, está el menú **+**.
 *
 * Enter manda; Shift+Enter baja de renglón.
 */
export function Compositor({
  subiendo,
  alSubir,
  conversacion,
}: {
  subiendo: boolean;
  alSubir: (tipo: TipoDocumento, archivo: File) => void;
  conversacion?: ConversacionDelPie;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const elegido = useRef<TipoDocumento>("RUT");
  const [encima, setEncima] = useState(false);
  const [texto, setTexto] = useState("");

  const elegirArchivo = (tipo: TipoDocumento, fuente: FuenteArchivo = "ARCHIVO") => {
    const entrada = archivo.current;
    if (entrada === null) return;
    elegido.current = tipo;
    // La cámara se pide con `capture`, y solo acepta imágenes: un PDF no se
    // fotografía.
    if (fuente === "CAMARA") {
      entrada.setAttribute("capture", "environment");
      entrada.accept = "image/*";
    } else {
      entrada.removeAttribute("capture");
      entrada.accept = TIPOS_ACEPTADOS.join(",");
    }
    entrada.click();
  };

  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault();
    setEncima(false);
    if (subiendo) return;
    const soltado = e.dataTransfer.files?.[0];
    if (soltado !== undefined) alSubir("RUT", soltado);
  };

  const soltable = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!subiendo) setEncima(true);
    },
    onDragLeave: () => setEncima(false),
    onDrop: alSoltar,
  };

  const entradaArchivo = (
    <input
      ref={archivo}
      type="file"
      accept={TIPOS_ACEPTADOS.join(",")}
      className="hidden"
      onChange={(e) => {
        const elegidoArchivo = e.target.files?.[0];
        if (elegidoArchivo !== undefined) alSubir(elegido.current, elegidoArchivo);
        e.target.value = "";
      }}
    />
  );

  if (conversacion === undefined) {
    return (
      <div className="flex shrink-0 items-stretch gap-2.5 border-t border-muted px-4 pt-3 pb-4.5 md:px-7">
        <div className="flex items-end">
          <MenuAgregar deshabilitado={subiendo} alSubir={elegirArchivo} />
        </div>
        {entradaArchivo}
        {/* Un `button` y no un `div` con `onClick`: es un control, se llega con
            Tab y se dispara con Enter. */}
        <button
          type="button"
          disabled={subiendo}
          onClick={() => elegirArchivo("RUT")}
          {...soltable}
          className={cn(
            "flex min-w-0 grow items-center justify-center gap-2.5 rounded-lg border border-dashed px-3 py-4 text-sm transition-colors disabled:opacity-50",
            encima
              ? "border-foreground bg-muted text-foreground"
              : "border-input text-muted-foreground hover:border-foreground",
          )}
        >
          <Paperclip className="size-[19px] shrink-0" strokeWidth={1.8} />
          <span>
            {subiendo
              ? "Subiendo el archivo…"
              : encima
                ? "Soltá el archivo para leerlo como RUT"
                : "Arrastrá un documento acá, o hacé clic para elegirlo. PDF, JPG o PNG."}
          </span>
        </button>
      </div>
    );
  }

  const { alEnviar, respondiendo, superaTope, preguntas, alNueva, nuevaDeshabilitada } =
    conversacion;
  const limpio = texto.trim();
  const puedeMandar = limpio !== "" && !respondiendo && !superaTope;

  const mandar = async () => {
    if (!puedeMandar) return;
    const enviado = texto;
    setTexto("");
    const aceptada = await alEnviar(limpio);
    // Si no se aceptó, lo escrito vuelve —salvo que ya se haya escrito otra cosa—.
    if (!aceptada) setTexto((actual) => (actual === "" ? enviado : actual));
  };

  return (
    <div
      {...soltable}
      className="flex shrink-0 flex-col gap-2 border-t border-muted px-4 pt-3 pb-4.5 md:px-7"
    >
      {superaTope && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3.5 py-2.5 text-[13px]">
          <span className="text-muted-foreground">
            Esta conversación ya es muy larga para seguirla. Lo conversado queda
            guardado.
          </span>
          <button
            type="button"
            onClick={alNueva}
            disabled={nuevaDeshabilitada}
            className="font-medium text-brand-text hover:text-brand-hover disabled:opacity-50"
          >
            Empezar una nueva
          </button>
        </div>
      )}

      <div className="flex items-end gap-2.5">
        <MenuAgregar
          deshabilitado={subiendo}
          alSubir={elegirArchivo}
          preguntas={preguntas}
          alPreguntar={(pregunta) => {
            setTexto(pregunta);
            campo.current?.focus();
          }}
          alNueva={alNueva}
          nuevaDeshabilitada={nuevaDeshabilitada}
        />
        {entradaArchivo}

        <div
          className={cn(
            "flex min-w-0 grow items-end gap-2 rounded-[0.8rem] border bg-card py-1.5 pr-1.5 pl-3.5 transition-colors focus-within:border-foreground",
            encima ? "border-dashed border-foreground bg-muted" : "border-input",
          )}
        >
          <textarea
            ref={campo}
            aria-label="Tu pregunta"
            rows={1}
            maxLength={MAXIMO_PREGUNTA}
            value={texto}
            disabled={superaTope}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void mandar();
              }
            }}
            placeholder={
              encima
                ? "Soltá el archivo para leerlo como RUT"
                : subiendo
                  ? "Subiendo el archivo…"
                  : "Preguntá cómo hacer algo en el sistema, o arrastrá un documento acá"
            }
            className="max-h-40 min-h-8 grow resize-none bg-transparent py-1.5 text-sm leading-normal outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="button"
            aria-label="Mandar la pregunta"
            disabled={!puedeMandar}
            onClick={() => void mandar()}
            className="flex size-8 shrink-0 items-center justify-center rounded-[0.55rem] bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
