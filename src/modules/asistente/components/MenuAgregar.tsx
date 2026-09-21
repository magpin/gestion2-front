"use client";

import { FileText, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { DOCUMENTOS, TITULO_DOCUMENTO, type TipoDocumento } from "../types/asistente.types";
import styles from "../asistente.module.css";

/**
 * Lo que cada documento aporta, en una línea: es lo que decide cuál subir.
 * Sale del catálogo de campos del backend (`documento.reglas.ts`), no de lo
 * que uno supondría: el RUT, por ejemplo, no da el NIT —la empresa ya lo tiene—.
 */
const PARA_QUE: Record<TipoDocumento, string> = {
  RUT: "Razón social, dirección, actividad y responsabilidades",
  CAMARA_COMERCIO: "Representante legal y matrícula mercantil",
  RESOLUCION_DIAN: "Prefijo, rango y vigencia de la numeración",
};

/**
 * El menú **+** del pie del chat. Paso 3 de
 * `docs/planes/asistente-conversacion.md`, sobre el prototipo
 * `docs/componentes-asistente/MenuAgregar.dc.html`.
 *
 * **Una sola sección, «Subir documentos»**, con los tres que el asistente sabe
 * leer. El prototipo trae además «Tomar foto», «Adjuntar del sistema»,
 * «Recientes», «Pedirle que haga» y el interruptor «Asentar sin preguntar».
 * Ninguno existe hoy, y **no están ni ocultos ni deshabilitados: no están en
 * el marcado.** Un menú de una sección es exactamente lo que el asistente sabe
 * hacer, y crece cuando crezca.
 *
 * La interacción sí va entera, porque es la del menú de verdad:
 * - abre hacia arriba desde el botón, y las opciones entran escalonadas;
 * - el + gira 45° mientras está abierto;
 * - se cierra con Escape, con el mismo botón, con clic afuera o al elegir;
 * - al abrir, el foco va a la primera opción; las flechas, Inicio y Fin se
 *   mueven entre ellas; al cerrar con Escape vuelve al +.
 *
 * Roles de un botón de menú: `aria-haspopup` y `aria-expanded` en el +,
 * `menu` y `menuitem` en la lista.
 */
export function MenuAgregar({
  deshabilitado,
  alElegir,
}: {
  deshabilitado: boolean;
  alElegir: (tipo: TipoDocumento) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const opciones = useRef<Array<HTMLButtonElement | null>>([]);

  // Al abrir, el foco va a la primera opción: es lo que espera quien llegó con
  // el teclado, y con el mouse no molesta.
  useEffect(() => {
    if (abierto) opciones.current[0]?.focus();
  }, [abierto]);

  // Clic afuera cierra. Se escucha en el documento solo mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", alClic);
    return () => document.removeEventListener("mousedown", alClic);
  }, [abierto]);

  const cerrar = (devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    const lista = opciones.current.filter((o): o is HTMLButtonElement => o !== null);
    const actual = lista.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (i: number) => {
      e.preventDefault();
      lista[(i + lista.length) % lista.length]?.focus();
    };
    if (e.key === "Escape") {
      e.preventDefault();
      cerrar(true);
    } else if (e.key === "ArrowDown") ir(actual + 1);
    else if (e.key === "ArrowUp") ir(actual - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(lista.length - 1);
    else if (e.key === "Tab") cerrar(false);
  };

  return (
    <div ref={contenedor} className="relative shrink-0">
      {abierto && (
        <div
          role="menu"
          aria-label="Agregar al mensaje"
          onKeyDown={alTeclear}
          className={cn(
            styles.menuAbre,
            "absolute bottom-[calc(100%+8px)] left-0 z-20 w-[324px] rounded-[1.05rem] border border-border bg-card p-1.5 shadow-[0_18px_50px_rgb(23_23_23/0.14),0_2px_6px_rgb(23_23_23/0.06)]",
          )}
        >
          <span
            className={cn(
              styles.opcionEntra,
              "block px-3 pt-2.5 pb-1 font-mono text-[10px] tracking-[1.2px] text-muted-foreground uppercase",
            )}
          >
            Subir documentos
          </span>
          {DOCUMENTOS.map((tipo, i) => (
            <button
              key={tipo}
              ref={(el) => {
                opciones.current[i] = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                cerrar(false);
                alElegir(tipo);
              }}
              style={{ animationDelay: `${(i + 1) * 20}ms` }}
              className={cn(
                styles.opcionEntra,
                "flex min-h-11 w-full items-center gap-3 rounded-[0.6rem] px-2.5 py-1.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[0.45rem] border border-muted bg-muted">
                <FileText className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 grow flex-col gap-px">
                <span className="text-sm font-medium">{TITULO_DOCUMENTO[tipo]}</span>
                <span className="text-xs leading-[1.35] text-muted-foreground">{PARA_QUE[tipo]}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        ref={boton}
        type="button"
        aria-label="Agregar al mensaje"
        aria-haspopup="menu"
        aria-expanded={abierto}
        disabled={deshabilitado}
        onClick={() => setAbierto((a) => !a)}
        className={cn(
          styles.mas,
          abierto && styles.masAbierto,
          "flex size-11 items-center justify-center rounded-[0.6rem] border transition-colors disabled:opacity-50",
          abierto ? "border-input bg-muted" : "border-border bg-card hover:border-foreground",
        )}
      >
        <Plus className="size-5" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
