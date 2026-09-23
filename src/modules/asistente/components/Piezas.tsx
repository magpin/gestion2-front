import { File } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Las piezas chicas que se repiten en el chat.
 *
 * Están juntas porque ninguna llega a diez líneas y todas dicen lo mismo: un
 * estado, un archivo, una cifra resaltada.
 *
 * El avatar salió de acá: ahora es [`Maria`](./Maria.tsx), que ya no es un
 * ícono dentro de un círculo sino una cara con once estados.
 */

/**
 * Una píldora de estado: fondo y borde del color, **texto neutro**.
 *
 * El reglamento de color no deja escribir texto de color para decir un estado:
 * el color va en el relleno y en el borde, y lo que se lee sigue siendo texto
 * normal. El punto de la izquierda es lo único saturado.
 */
export function Pildora({
  tono,
  children,
}: {
  tono: "HECHO" | "PENDIENTE";
  children: React.ReactNode;
}) {
  const hecho = tono === "HECHO";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-xs font-medium whitespace-nowrap text-foreground",
        hecho ? "border-success/35 bg-success/12" : "border-warning/40 bg-warning/12",
      )}
    >
      <span className={cn("size-1.5 rounded-full", hecho ? "bg-success" : "bg-warning")} />
      {children}
    </span>
  );
}

/** El chip de un archivo, como lo ve la persona después de soltarlo. */
export function ChipArchivo({ nombre }: { nombre: string }) {
  const extension = nombre.split(".").pop()?.toUpperCase() ?? "";
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card py-1.5 pr-3 pl-1.5">
      <span className="flex size-[26px] items-center justify-center rounded-[0.3rem] bg-muted">
        <File className="size-3.5" strokeWidth={1.7} />
      </span>
      <span className="flex flex-col">
        <span className="max-w-[180px] truncate text-xs font-medium">{nombre}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{extension}</span>
      </span>
    </span>
  );
}

/** Texto con `**negrita**`: el asistente resalta la cifra que importa, y nada más. */
export function TextoRico({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("**").map((parte, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold">
            {parte}
          </strong>
        ) : (
          parte
        ),
      )}
    </>
  );
}

/** Un botón de acción de tarjeta: 34px, borde fuerte, sin relleno de color. */
export function BotonTarjeta({
  children,
  principal = false,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  principal?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-[34px] items-center gap-2 rounded-md px-4 text-[13px] font-medium whitespace-nowrap disabled:opacity-50",
        principal
          ? "border border-primary bg-primary text-primary-foreground"
          : "border border-input bg-card text-foreground",
      )}
    >
      {children}
    </button>
  );
}
