"use client";

import Link from "next/link";
import { Lock, Search, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Las piezas que los cinco pasos comparten.
 *
 * Están juntas y no repartidas porque su valor es justamente ser las mismas:
 * cuando cada paso inventaba su propio aviso de faltante, el mismo mensaje se
 * veía de tres maneras distintas según en qué pantalla apareciera.
 *
 * Una regla atraviesa todo el archivo: **el color de estado va en el fondo y
 * el borde; el texto va neutro.** Un párrafo entero en ámbar se lee peor y no
 * avisa más. La única excepción es el error pegado a un campo, donde `danger`
 * sí va como texto — ahí son seis palabras y el contraste alcanza (5.62:1).
 */

/**
 * Un solo control, dos constantes — y hay un motivo.
 *
 * El diseño dice que el campo de texto y el selector se ven **idénticos**:
 * 44px de alto, 12px de padding, borde `input`, radio 0.6rem, fondo `card`,
 * 14px de texto. En el prototipo son un `<input>` y un `<button>` con la misma
 * lista de estilos.
 *
 * Acá no alcanza con una sola clase porque `SelectTrigger` de shadcn no fija
 * su alto con una utilidad normal sino con una variante de atributo:
 * `data-[size=default]:h-8`. Para `tailwind-merge` eso no entra en conflicto
 * con un `h-11` suelto —son selectores distintos—, así que las dos reglas
 * sobreviven y gana la del atributo por especificidad. Resultado: los inputs
 * miden 44 y los selectores 32, y la fila queda desfasada.
 *
 * Por eso `CONTROL_SELECT` pisa la variante con la variante. Es la única forma
 * de que los dos terminen del mismo alto sin tocar el componente de shadcn.
 */
const BASE_CONTROL = "rounded-md border border-input bg-card px-3 text-sm text-foreground";

export const CONTROL = `h-11 ${BASE_CONTROL}`;

export const CONTROL_SELECT = `data-[size=default]:h-11 w-full justify-between ${BASE_CONTROL}`;

/**
 * Lo que falta para que el paso quede completo, con la salida a resolverlo.
 *
 * Lleva el botón porque un aviso que dice qué falta pero no a dónde ir obliga a
 * buscarlo en el recorrido. Si el faltante se resuelve en otro paso, el botón
 * es la diferencia entre un aviso y una instrucción.
 */
export function AvisoFaltante({
  children,
  accion,
}: {
  children: ReactNode;
  accion?: { texto: string; href: string };
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3.5 text-[13px] leading-normal">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="flex min-w-0 flex-col items-start gap-2.5">
        <span>{children}</span>
        {accion && (
          <Link
            href={accion.href}
            className="flex h-9 items-center rounded-md border border-input bg-card px-3 text-[13px] font-medium text-foreground no-underline hover:bg-secondary"
          >
            {accion.texto}
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Una regla del sistema que conviene saber antes de llenar: por qué un campo no
 * se puede cambiar, qué implica guardar. Sin color de estado — no es una
 * advertencia, es contexto.
 */
export function NotaInformativa({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-background p-3.5 text-[13px] leading-normal text-muted-foreground">
      <Lock className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Cuando todavía no hay nada, decir qué va a haber.
 *
 * El borde punteado dice "acá va algo" sin fingir que ya hay una tabla vacía.
 * La ayuda explica qué pasa cuando se agregue el primero, que suele ser la
 * pregunta real ("¿cuál queda como principal?").
 */
export function EstadoVacio({ titulo, ayuda }: { titulo: string; ayuda?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="m-0 text-sm font-medium">{titulo}</p>
      {ayuda && <p className="m-0 max-w-[380px] text-[13px] text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

/**
 * Sí o No, con los dos siempre a la vista.
 *
 * Un interruptor esconde la opción que no está elegida y obliga a deducir qué
 * significa "apagado". Acá las dos palabras están escritas, y la elegida se
 * rellena. `aria-pressed` en cada botón: el estado viaja al lector de pantalla
 * sin depender del relleno.
 */
export function SegmentadoSiNo({
  valor,
  onCambio,
  etiquetaGrupo,
  deshabilitado,
}: {
  valor: boolean | null;
  onCambio: (v: boolean) => void;
  etiquetaGrupo: string;
  deshabilitado?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={etiquetaGrupo}
      className="inline-flex gap-1 rounded-lg border border-border bg-background p-1"
    >
      {[true, false].map((opcion) => {
        const activo = valor === opcion;
        return (
          <button
            key={String(opcion)}
            type="button"
            aria-pressed={activo}
            disabled={deshabilitado}
            onClick={() => onCambio(opcion)}
            className={cn(
              "h-9 rounded-[0.45rem] px-4 text-[13px] font-medium transition-colors disabled:opacity-50",
              activo
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-foreground hover:bg-secondary",
            )}
          >
            {opcion ? "Sí" : "No"}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Un dato que existe y no se puede cambiar: el NIT, el tipo de persona.
 *
 * Con candado y no deshabilitado a secas. Un input gris sin explicación se lee
 * como un error de carga; el candado dice que es a propósito.
 */
export function SoloLectura({
  valor,
  mono,
  className,
}: {
  valor: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <Lock className="size-3.5 shrink-0" />
      <span className={cn("truncate", mono && "font-mono")}>{valor}</span>
    </div>
  );
}

/**
 * Multiselección donde las opciones son pocas y se leen de un vistazo: los
 * sectores de la empresa.
 *
 * Píldoras y no casillas porque el conjunto importa más que cada una — lo que
 * se mira es "cuáles tengo marcados", no "¿marqué este?".
 */
export function Chips({
  opciones,
  elegidos,
  onAlternar,
  etiquetaGrupo,
}: {
  opciones: { valor: string; etiqueta: string }[];
  elegidos: string[];
  onAlternar: (valor: string) => void;
  etiquetaGrupo: string;
}) {
  return (
    <div role="group" aria-label={etiquetaGrupo} className="flex flex-wrap gap-2">
      {opciones.map(({ valor, etiqueta }) => {
        const activo = elegidos.includes(valor);
        return (
          <button
            key={valor}
            type="button"
            aria-pressed={activo}
            onClick={() => onAlternar(valor)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors",
              activo
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-card text-foreground hover:bg-secondary",
            )}
          >
            {activo && (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** El input con lupa de las búsquedas contra el catálogo del backend. */
export function CampoBusqueda({
  id,
  valor,
  onCambio,
  marcador,
  ...resto
}: {
  id: string;
  valor: string;
  onCambio: (v: string) => void;
  marcador: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type="search"
        value={valor}
        placeholder={marcador}
        onChange={(e) => onCambio(e.target.value)}
        className={cn(CONTROL, "w-full pl-9")}
        {...resto}
      />
    </div>
  );
}

/**
 * Una lista de hechos con vigencia: responsabilidades del RUT, actividades.
 *
 * Filas separadas por una línea, no una tarjeta por fila: cinco tarjetas son
 * cinco bordes compitiendo entre sí por algo que se lee en columna.
 *
 * **No existe "Eliminar".** Son hechos con fecha: una responsabilidad que la
 * empresa tuvo el año pasado siguió existiendo aunque hoy no aplique, y borrarla
 * rompería la trazabilidad de lo que se facturó bajo ella. Se **cierran**.
 */
export function ListaVigencia({ children }: { children: ReactNode }) {
  return <ul className="m-0 flex list-none flex-col divide-y divide-secondary p-0">{children}</ul>;
}

export function FilaVigencia({
  codigo,
  nombre,
  etiquetas,
  desde,
  onCerrar,
  suprimida,
}: {
  codigo: string;
  nombre: string;
  /** Píldoras neutras: "Va en la factura", "Principal". */
  etiquetas?: ReactNode;
  desde?: string;
  onCerrar?: () => void;
  /** El código que la reemplaza, cuando la DIAN suprimió este. */
  suprimida?: string;
}) {
  return (
    <li className="flex items-start gap-3 py-3 text-sm">
      <span
        className={cn(
          "w-14 shrink-0 font-mono text-xs text-muted-foreground",
          suprimida && "line-through",
        )}
      >
        {codigo}
      </span>
      <span className="flex min-w-0 grow flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn("min-w-0", suprimida && "text-muted-foreground line-through")}>
            {nombre}
          </span>
          {etiquetas}
        </span>
        {suprimida && (
          <span className="text-xs text-muted-foreground">
            La DIAN la suprimió — usa el código{" "}
            <span className="font-mono text-foreground">{suprimida}</span>
          </span>
        )}
      </span>
      {desde && (
        <span className="shrink-0 font-mono text-xs text-muted-foreground">desde {desde}</span>
      )}
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 text-[13px] font-medium text-brand-text hover:text-brand-hover"
        >
          Cerrar
        </button>
      )}
    </li>
  );
}

/** Una píldora neutra dentro de una fila: "Va en la factura", "Principal". */
export function Pildora({
  children,
  destacada,
}: {
  children: ReactNode;
  destacada?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        destacada
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
