import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";

/** Adónde se registra lo que la DIAN autorizó: el paso del asistente. */
const RUTA_RESOLUCIONES = "/configuracion/resoluciones";

/**
 * Los errores de ventas, con salida cuando la hay.
 *
 * Emitir una factura o una nota crédito sin resolución vigente falla con un
 * mensaje correcto pero que deja al usuario en el mismo lugar. La resolución
 * se registra en otra pantalla, así que el aviso ofrece ir hasta ella.
 */
export function avisarErrorVenta(
  error: unknown,
  irA: (ruta: string) => void,
): void {
  const mensaje = mensajeDeError(error);
  if (/resoluci[oó]n activa/i.test(mensaje)) {
    aviso.errorConSalida(mensaje, {
      etiqueta: "Registrar resolución",
      ir: () => irA(RUTA_RESOLUCIONES),
    });
    return;
  }
  aviso.error(mensaje);
}
