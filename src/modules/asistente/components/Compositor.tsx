"use client";

import { Paperclip } from "lucide-react";
import { useRef } from "react";

import {
  DOCUMENTOS,
  TIPOS_ACEPTADOS,
  TITULO_DOCUMENTO,
  type TipoDocumento,
} from "../types/asistente.types";

/**
 * El pie del chat: adjuntar un documento.
 *
 * **No hay campo de texto.** El backend de hoy lee documentos y propone hechos;
 * no hay endpoint de conversación, así que un campo donde escribir sería una
 * promesa falsa: quien escriba algo no va a recibir respuesta. Cuando exista
 * conversación, el campo entra acá y el resto de la pantalla no cambia.
 *
 * El botón de adjuntar es secundario y el tipo se elige antes de subir: el
 * backend necesita saber si un PDF es un RUT o una Cámara de Comercio —lee
 * distinto según el caso— y adivinarlo por el nombre del archivo sería inventar.
 */
export function Compositor({
  subiendo,
  alSubir,
}: {
  subiendo: boolean;
  alSubir: (tipo: TipoDocumento, archivo: File) => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const elegido = useRef<TipoDocumento>("RUT");

  const elegirArchivo = (tipo: TipoDocumento) => {
    elegido.current = tipo;
    campo.current?.click();
  };

  return (
    <div className="flex shrink-0 flex-col gap-2.5 border-t border-muted px-7 pt-3 pb-4.5">
      <div className="flex flex-wrap gap-2">
        {DOCUMENTOS.map((tipo) => (
          <button
            key={tipo}
            type="button"
            disabled={subiendo}
            onClick={() => elegirArchivo(tipo)}
            className="h-[30px] rounded-full border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:border-foreground disabled:opacity-50"
          >
            Subir {TITULO_DOCUMENTO[tipo]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-input p-2">
        <input
          ref={campo}
          type="file"
          accept={TIPOS_ACEPTADOS.join(",")}
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo !== undefined) alSubir(elegido.current, archivo);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label="Adjuntar un documento"
          disabled={subiendo}
          onClick={() => elegirArchivo("RUT")}
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted disabled:opacity-50"
        >
          <Paperclip className="size-[19px]" strokeWidth={1.8} />
        </button>
        <p className="m-0 text-sm text-muted-foreground">
          {subiendo
            ? "Subiendo el archivo…"
            : "Subí el RUT, la Cámara de Comercio o la resolución de la DIAN. PDF, JPG o PNG."}
        </p>
      </div>
    </div>
  );
}
