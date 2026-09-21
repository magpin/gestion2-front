"use client";

import { Paperclip } from "lucide-react";
import { useRef, useState } from "react";

import { TIPOS_ACEPTADOS, type TipoDocumento } from "../types/asistente.types";
import { MenuAgregar } from "./MenuAgregar";

/**
 * El pie del chat: adjuntar un documento.
 *
 * **No hay campo de texto.** El backend de hoy lee documentos y propone hechos;
 * no hay endpoint de conversación, así que un campo donde escribir sería una
 * promesa falsa: quien escriba algo no va a recibir respuesta. Cuando exista
 * conversación, el campo entra acá y el resto de la pantalla no cambia.
 *
 * **Y esto era una caja que parecía exactamente ese campo**: borde redondeado,
 * un clip a la izquierda y un párrafo gris que se leía como un placeholder. La
 * primera pregunta de quien abrió la pantalla fue por qué no podía escribir.
 * El archivo evitaba la promesa falsa en la lógica y la volvía a hacer en el
 * estilo. Ahora se ve lo que es: una zona donde se suelta un archivo, con el
 * borde punteado y un rótulo que dice el gesto, no un hueco donde escribir.
 *
 * El botón de adjuntar es secundario y el tipo se elige antes de subir: el
 * backend necesita saber si un PDF es un RUT o una Cámara de Comercio —lee
 * distinto según el caso— y adivinarlo por el nombre del archivo sería inventar.
 * Por eso lo que se suelta cae como **RUT**, que es el documento con el que
 * empieza el noventa por ciento de las configuraciones; para elegir cualquiera
 * de los tres está el menú **+** a la izquierda (paso 3 de
 * `asistente-conversacion.md`), que reemplazó a las tres píldoras de arriba.
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
  const [encima, setEncima] = useState(false);

  const elegirArchivo = (tipo: TipoDocumento) => {
    elegido.current = tipo;
    campo.current?.click();
  };

  // Una zona que invita a soltar y no recibe nada es la misma promesa falsa que
  // se está corrigiendo, así que el `onDrop` entra con el borde punteado.
  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault();
    setEncima(false);
    if (subiendo) return;
    const archivo = e.dataTransfer.files?.[0];
    if (archivo !== undefined) alSubir("RUT", archivo);
  };

  return (
    <div className="flex shrink-0 items-stretch gap-2.5 border-t border-muted px-7 pt-3 pb-4.5">
      <div className="flex items-end">
        <MenuAgregar deshabilitado={subiendo} alElegir={elegirArchivo} />
      </div>

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
      {/* Un `button` y no un `div` con `onClick`: es un control, se llega con
          Tab y se dispara con Enter. El borde punteado es lo que lo separa de
          un campo de texto a primera vista. */}
      <button
        type="button"
        disabled={subiendo}
        onClick={() => elegirArchivo("RUT")}
        onDragOver={(e) => {
          e.preventDefault();
          if (!subiendo) setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={alSoltar}
        className={`flex min-w-0 grow items-center justify-center gap-2.5 rounded-lg border border-dashed px-3 py-4 text-sm transition-colors disabled:opacity-50 ${
          encima
            ? "border-foreground bg-muted text-foreground"
            : "border-input text-muted-foreground hover:border-foreground"
        }`}
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
