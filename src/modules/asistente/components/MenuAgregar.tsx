"use client";

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  MessageCircleQuestion,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

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

/** De dónde sale el archivo: el selector de siempre o la cámara del celular. */
export type FuenteArchivo = "ARCHIVO" | "CAMARA";

type Vista = "INICIO" | "PREGUNTAS" | { subir: FuenteArchivo };

/**
 * Un celular o una tableta: puntero grueso. Ahí «Tomar foto» abre la cámara; en
 * una computadora abriría el mismo selector de archivos que «Subir documento»,
 * y dos opciones que hacen lo mismo es una que sobra.
 */
function usePunteroGrueso(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const consulta = window.matchMedia("(pointer: coarse)");
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

/**
 * El menú **+** del pie del chat. Pasos 3 y 5 de
 * `docs/planes/asistente-conversacion.md`, sobre el prototipo
 * `docs/componentes-asistente/MenuAgregar.dc.html`.
 *
 * **Todo lo que aparece funciona.** Dos secciones:
 * - **Subir**: «Subir documento» y, en el celular, «Tomar foto». Las dos
 *   preguntan después qué documento es, porque el backend lee distinto un RUT
 *   que una Cámara de Comercio.
 * - **Conversación**, si se puede conversar: «Preguntas sugeridas», que llenan
 *   el campo sin mandarlo, y «Nueva conversación».
 *
 * Del prototipo quedan afuera «Adjuntar del sistema», «Recientes», «Pedirle que
 * haga» y el interruptor «Asentar sin preguntar»: no existen, y **no están ni
 * ocultos ni deshabilitados, no están en el marcado.**
 *
 * Las opciones con **›** abren una segunda lista en el mismo lugar, con
 * «Volver» arriba. La interacción es la del menú de verdad:
 * - abre hacia arriba desde el botón, y las opciones entran escalonadas;
 * - el + gira 45° mientras está abierto;
 * - se cierra con Escape, con el mismo botón, con clic afuera o al elegir;
 * - al abrir o cambiar de lista, el foco va a la primera opción; las flechas,
 *   Inicio y Fin se mueven entre ellas; al cerrar con Escape vuelve al +.
 */
export function MenuAgregar({
  deshabilitado,
  alSubir,
  preguntas,
  alPreguntar,
  alNueva,
  nuevaDeshabilitada = false,
  conCamara,
}: {
  deshabilitado: boolean;
  alSubir: (tipo: TipoDocumento, fuente: FuenteArchivo) => void;
  /** Sin esto no hay sección «Conversación»: el asistente no puede conversar. */
  preguntas?: readonly string[];
  alPreguntar?: (texto: string) => void;
  alNueva?: () => void;
  nuevaDeshabilitada?: boolean;
  /** Fuerza mostrar u ocultar «Tomar foto». Sin esto, se decide por el puntero. */
  conCamara?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("INICIO");
  const boton = useRef<HTMLButtonElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const punteroGrueso = usePunteroGrueso();
  const camara = conCamara ?? punteroGrueso;
  const conversa = preguntas !== undefined && alPreguntar !== undefined;

  // Al abrir o cambiar de lista, el foco va a la primera opción: es lo que
  // espera quien llegó con el teclado, y con el mouse no molesta.
  useEffect(() => {
    if (abierto) lista.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [abierto, vista]);

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
    const opciones = Array.from(
      lista.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    const actual = opciones.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (i: number) => {
      e.preventDefault();
      opciones[(i + opciones.length) % opciones.length]?.focus();
    };
    if (e.key === "Escape") {
      e.preventDefault();
      cerrar(true);
    } else if (e.key === "ArrowDown") ir(actual + 1);
    else if (e.key === "ArrowUp") ir(actual - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(opciones.length - 1);
    else if (e.key === "Tab") cerrar(false);
  };

  const elegir = (accion: Accion) => {
    if (accion.tipo === "VISTA") {
      setVista(accion.vista);
      return;
    }
    cerrar(false);
    if (accion.tipo === "NUEVA") alNueva?.();
    else if (accion.tipo === "PREGUNTA") alPreguntar?.(accion.texto);
    else alSubir(accion.documento, accion.fuente);
  };

  const icono = (Icono: typeof FileText) => (
    <Icono className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
  );
  const volver: Elemento = {
    clave: "volver",
    icono: icono(ChevronLeft),
    titulo: "Volver",
    compacta: true,
    accion: { tipo: "VISTA", vista: "INICIO" },
  };

  // Cada lista es un arreglo de rótulos y opciones: el retraso escalonado de la
  // entrada se cuenta por posición.
  let elementos: Array<Elemento | string>;
  if (vista === "INICIO") {
    elementos = [
      "Subir",
      {
        clave: "subir",
        icono: icono(FileUp),
        titulo: "Subir documento",
        detalle: "RUT, Cámara de Comercio o Resolución DIAN",
        siguiente: true,
        accion: { tipo: "VISTA", vista: { subir: "ARCHIVO" } },
      },
    ];
    if (camara) {
      elementos.push({
        clave: "foto",
        icono: icono(Camera),
        titulo: "Tomar foto",
        detalle: "Del documento en papel, con la cámara",
        siguiente: true,
        accion: { tipo: "VISTA", vista: { subir: "CAMARA" } },
      });
    }
    if (conversa) {
      elementos.push("Conversación", {
        clave: "preguntas",
        icono: icono(MessageCircleQuestion),
        titulo: "Preguntas sugeridas",
        detalle: "Para arrancar, si no sabés qué preguntar",
        siguiente: true,
        accion: { tipo: "VISTA", vista: "PREGUNTAS" },
      });
      if (alNueva !== undefined) {
        elementos.push({
          clave: "nueva",
          icono: icono(RotateCcw),
          titulo: "Nueva conversación",
          detalle: "La actual queda guardada en la lista",
          deshabilitada: nuevaDeshabilitada,
          accion: { tipo: "NUEVA" },
        });
      }
    }
  } else if (vista === "PREGUNTAS") {
    elementos = [
      volver,
      "Preguntas sugeridas",
      ...(preguntas ?? []).map((pregunta): Elemento => ({
        clave: pregunta,
        icono: icono(MessageCircleQuestion),
        titulo: pregunta,
        accion: { tipo: "PREGUNTA", texto: pregunta },
      })),
    ];
  } else {
    const fuente = vista.subir;
    elementos = [
      volver,
      "¿Qué documento es?",
      ...DOCUMENTOS.map((tipo): Elemento => ({
        clave: tipo,
        icono: icono(FileText),
        titulo: TITULO_DOCUMENTO[tipo],
        detalle: PARA_QUE[tipo],
        accion: { tipo: "DOCUMENTO", documento: tipo, fuente },
      })),
    ];
  }

  return (
    <div ref={contenedor} className="relative shrink-0">
      {abierto && (
        <div
          ref={lista}
          key={typeof vista === "string" ? vista : vista.subir}
          role="menu"
          aria-label="Agregar al mensaje"
          onKeyDown={alTeclear}
          className={cn(
            styles.menuAbre,
            "absolute bottom-[calc(100%+8px)] left-0 z-20 w-[324px] max-w-[calc(100vw-32px)] rounded-[1.05rem] border border-border bg-card p-1.5 shadow-[0_18px_50px_rgb(23_23_23/0.14),0_2px_6px_rgb(23_23_23/0.06)]",
          )}
        >
          {elementos.map((e, i) =>
            typeof e === "string" ? (
              <Rotulo key={e}>{e}</Rotulo>
            ) : (
              <Opcion
                key={e.clave}
                {...e}
                orden={i + 1}
                alElegir={() => elegir(e.accion)}
              />
            ),
          )}
        </div>
      )}

      <button
        ref={boton}
        type="button"
        aria-label="Agregar al mensaje"
        aria-haspopup="menu"
        aria-expanded={abierto}
        disabled={deshabilitado}
        onClick={() => {
          setVista("INICIO");
          setAbierto((a) => !a);
        }}
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

/** Lo que hace una opción. Datos, no funciones: el menú los ejecuta al elegir. */
type Accion =
  | { tipo: "VISTA"; vista: Vista }
  | { tipo: "NUEVA" }
  | { tipo: "PREGUNTA"; texto: string }
  | { tipo: "DOCUMENTO"; documento: TipoDocumento; fuente: FuenteArchivo };

interface Elemento {
  clave: string;
  icono: ReactNode;
  titulo: string;
  detalle?: string;
  /** Abre otra lista: lleva la flecha. */
  siguiente?: boolean;
  compacta?: boolean;
  deshabilitada?: boolean;
  accion: Accion;
}

function Rotulo({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        styles.opcionEntra,
        "block px-3 pt-2.5 pb-1 font-mono text-[10px] tracking-[1.2px] text-muted-foreground uppercase",
      )}
    >
      {children}
    </span>
  );
}

function Opcion({
  icono,
  titulo,
  detalle,
  siguiente = false,
  compacta = false,
  deshabilitada = false,
  orden,
  alElegir,
}: Omit<Elemento, "clave" | "accion"> & { orden: number; alElegir: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={deshabilitada}
      onClick={alElegir}
      style={{ animationDelay: `${orden * 20}ms` }}
      className={cn(
        styles.opcionEntra,
        "flex w-full items-center gap-3 rounded-[0.6rem] px-2.5 py-1.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50 disabled:hover:bg-transparent",
        compacta ? "min-h-9" : "min-h-11",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[0.45rem] border border-muted bg-muted",
          compacta ? "size-7" : "size-8",
        )}
      >
        {icono}
      </span>
      <span className="flex min-w-0 grow flex-col gap-px">
        <span className="text-sm font-medium">{titulo}</span>
        {detalle !== undefined && (
          <span className="text-xs leading-[1.35] text-muted-foreground">{detalle}</span>
        )}
      </span>
      {siguiente && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
    </button>
  );
}
