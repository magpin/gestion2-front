"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Stepper compositivo: cada pieza se estiliza sola y el consumidor arma la
// estructura. Es a propósito que NO tenga un "paso actual" propio —hay dos usos
// distintos y un estado interno solo serviría a uno—:
//
//   · Asistente lineal (intake, wizards): un paso activo, los previos completados.
//   · Línea de proceso (Mi Taller): los seis nodos vivos a la vez, cada uno con
//     su carga. Ahí "completado" no significa nada: un nodo con órdenes está
//     lleno, no terminado.
//
// Quien lo use decide el estado de cada paso y qué significa. El estado viaja por
// data-state en el item, y los hijos lo leen con group-data-[state=…]/step, así
// no hace falta contexto de React ni CSS propio.

export type EstadoPaso = "completado" | "activo" | "pendiente";

export function Stepper({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("w-full", className)} {...props} />;
}

// <ol> y no <div>: es una secuencia de pasos, y un lector de pantalla anuncia
// cuántos son y en cuál va.
//
// ⚠️ El `sm:gap-8` entra en el ancho de la flecha de StepperSeparator, que cruza
// el hueco para llegar al círculo siguiente. Si cambia el gap, cambia ese ancho.
// En una sola columna (móvil) no hay flecha —apuntaría a la derecha en una lista
// que baja— y el gap-4 solo separa.
export function StepperNav({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "grid grid-cols-1 gap-4 sm:auto-cols-fr sm:grid-flow-col sm:gap-8",
        className,
      )}
      {...props}
    />
  );
}

interface StepperItemProps extends Omit<ComponentProps<"li">, "children"> {
  estado?: EstadoPaso;
  children: ReactNode;
}

export function StepperItem({
  estado = "pendiente",
  className,
  children,
  ...props
}: StepperItemProps) {
  return (
    <li
      data-state={estado}
      className={cn("group/step relative flex items-start", className)}
      {...props}
    >
      {children}
    </li>
  );
}

interface StepperTriggerProps extends Omit<ComponentProps<"button">, "disabled"> {
  // Sin onClick el paso se renderiza como texto estático, no como <button disabled>:
  // un botón deshabilitado no recibe foco y desaparece para un lector de pantalla,
  // aunque siga viéndose. Un paso que no se puede operar sigue siendo información.
  onClick?: ComponentProps<"button">["onClick"];
}

export function StepperTrigger({ className, onClick, ...props }: StepperTriggerProps) {
  const clases = cn("flex w-full flex-col items-start gap-2 text-left", className);

  if (!onClick) {
    return <div className={clases}>{props.children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        clases,
        "rounded-lg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
      {...props}
    />
  );
}

// El círculo. Por defecto lleva el color del estado; se puede sobrescribir con
// className, que gana por venir después en cn().
export function StepperIndicator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
        "group-data-[state=pendiente]/step:border-border group-data-[state=pendiente]/step:text-muted-foreground",
        "group-data-[state=activo]/step:border-primary group-data-[state=activo]/step:bg-primary group-data-[state=activo]/step:text-primary-foreground",
        "group-data-[state=completado]/step:border-primary group-data-[state=completado]/step:text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function StepperTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-sm font-semibold text-foreground group-data-[state=pendiente]/step:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function StepperDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

// La flecha que va de un paso al siguiente. Dice hacia dónde sigue el proceso,
// que es lo que una fila de nodos sueltos no comunica por sí sola.
//
// Va de CÍRCULO A CÍRCULO, no solo por el hueco entre columnas: una flecha corta
// metida en el hueco queda pegada al nodo siguiente y se lee como parte de él,
// no como el paso de uno al otro. Por eso es un asta larga que arranca donde
// termina el círculo de este paso y una punta que muere antes del círculo del
// siguiente.
//
// No lleva z-index. La versión anterior era una línea con `-z-10`: como ningún
// ancestro crea contexto de apilamiento, el z-index negativo la mandaba a pintar
// antes que los fondos de los descendientes, así que el `bg-card` de la tarjeta
// la tapaba y no se veía nunca. Al ser un absolute con z-index auto pinta después
// del fondo del disparador, así que tampoco desaparece bajo el hover.
//
// Cruza la mitad derecha de la columna, que a la altura del círculo está vacía:
// el texto del paso arranca por debajo.
//
// ⚠️ El ancho asume el `sm:gap-8` de StepperNav (2rem) y el disparador acolchado
// con `p-1`. Las tres medidas van juntas:
//     left  = 0.25rem (p-1) + 2.25rem (size-9) + 0.5rem de aire = 3rem
//     width = 100% + 2rem (gap) − 0.25rem (p-1 del siguiente)
//             − 0.5rem de aire − 3rem = 100% − 1.25rem
//
// aria-hidden: la secuencia ya la comunica el <ol> de StepperNav, así que para un
// lector de pantalla la flecha sería ruido.
export function StepperSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        // top = centro del círculo: 0.25rem del p-1 + 1.125rem de media altura.
        "absolute left-12 top-[1.375rem] hidden w-[calc(100%-1.25rem)] -translate-y-1/2 items-center text-muted-foreground sm:flex",
        "group-data-[state=completado]/step:text-primary",
        className,
      )}
      {...props}
    >
      <span className="h-0.5 flex-1 bg-current" />
      {/* -ml-1.5 = los 6px que el glifo deja libres a su izquierda (el path
          arranca en x=9 de un viewBox de 24). Sin eso el asta y la punta quedan
          separadas por un mordisco. strokeWidth 3 sobre size 16 da 2px, el mismo
          grosor del asta. */}
      <ChevronRight size={16} strokeWidth={3} className="-ml-1.5 shrink-0" />
    </div>
  );
}
