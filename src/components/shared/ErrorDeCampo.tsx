import { CircleAlert } from "lucide-react";

/**
 * Lo que está mal en un campo, debajo del campo (lienzo «Estados de error»,
 * «campo con error»): qué corregir, con el número del que se trata.
 *
 * Va con `aria-describedby` en el campo y `aria-invalid` para que el lector
 * de pantalla lo diga al entrar. Sin mensaje no pinta nada.
 */
export function ErrorDeCampo({ id, mensaje }: { id: string; mensaje: string | null | false | undefined }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-danger">
      <CircleAlert className="mt-px size-3.5 shrink-0" />
      {mensaje}
    </p>
  );
}
