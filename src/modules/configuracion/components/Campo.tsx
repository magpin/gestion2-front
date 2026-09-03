"use client";

import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CampoProps {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Etiqueta, control y error.
 *
 * La etiqueta siempre visible y asociada al control: un `placeholder` como
 * etiqueta desaparece justo cuando la persona empieza a escribir, que es cuando
 * más falta hace saber qué se está llenando.
 *
 * El error va pegado al campo, no en un resumen arriba. En un formulario de
 * quince campos, un resumen obliga a buscar cuál era.
 *
 * ---
 *
 * EL ANCHO LO DECIDE EL DATO, NO LA POSICIÓN EN LA REJILLA.
 *
 * El ancho no vive acá —lo pone la rejilla del formulario— pero la escala es una
 * sola en todo el asistente, y sale del contenido máximo real de cada tipo de
 * dato. Antes cada paso inventaba la suya y el mismo campo medía distinto en
 * cada pantalla: el tipo de documento ocupaba 100px en situación legal y 120px
 * en terceros.
 *
 *    72px   un dígito — el DV del NIT
 *   112px   cuatro a seis — código de sede, prefijo, mes de cierre
 *   128px   cifras con decimales — tarifa de ICA por mil
 *   152px   una fecha — `2026-08-28`, siempre diez caracteres
 *   160px   hasta doce — NIT, número de documento, rango de facturación
 *   176px   un enum del catálogo — el más largo es `PATRIMONIO_AUTONOMO`
 *     1fr   texto libre — nombres, direcciones, razón social
 *
 * Al agregar un campo se toma la medida de esta lista. Si ninguna sirve, es que
 * falta un caso: se agrega acá y se usa, no se inventa un número suelto.
 */
export function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  className,
  children,
}: CampoProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1 text-xs text-danger"
        >
          <AlertCircle className="size-3" />
          {error}
        </span>
      ) : ayuda ? (
        <span className="text-xs text-muted-foreground">{ayuda}</span>
      ) : null}
    </div>
  );
}
