"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * El botón de "crear" de una pantalla de listado.
 *
 * Existe porque cada sección se lo había escrito por su cuenta y no habían
 * quedado iguales: Compras tenía uno con su ícono y su sombra, y las cuatro
 * secciones de Ventas uno plano. Es la misma acción en las siete pantallas y
 * tiene que verse igual en todas.
 *
 * Va en la cabecera, **arriba de las pestañas**: lo que se crea no depende de
 * qué pestaña esté abierta —la pestaña dice qué se está mirando—, y tenerlo
 * debajo lo hacía parecer una acción de la lista.
 */
export function BotonNuevo({
  etiqueta,
  onClick,
}: {
  /** Qué se crea, ya escrito: `Nueva factura`, `Nueva nota crédito`. */
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
        <Plus className="size-4" />
      </span>
      {etiqueta}
    </Button>
  );
}
