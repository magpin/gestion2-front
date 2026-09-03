"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Input>;

/**
 * Campo de contraseña con interruptor para verla.
 *
 * Las contraseñas de este sistema las genera el administrador y llegan por
 * correo o dictadas: son largas y con caracteres que se confunden entre sí.
 * Escribirlas a ciegas produce el mismo error tres veces seguidas.
 *
 * El botón queda fuera del recorrido con Tab —`tabIndex={-1}`— para que pasar de
 * la contraseña al botón de entrar siga siendo una sola tecla.
 */
export const CampoPassword = forwardRef<HTMLInputElement, Props>(function CampoPassword(
  { className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Ver contraseña"}
        aria-pressed={visible}
        className="absolute right-0 top-0 grid h-full w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
