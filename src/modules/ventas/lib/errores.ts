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
  aviso.falla(error);
}

/**
 * ¿Falló por falta de existencia?
 *
 * El backend contesta "Solo hay 3 en existencia; no se puede sacar 10"
 * (`kardex.reglas.ts`). No es un error cualquiera: quien factura puede
 * confirmarlo y emitir igual, si la empresa lo habilitó.
 */
export function esFaltaDeExistencia(error: unknown): boolean {
  return /en existencia/i.test(mensajeDeError(error));
}

/**
 * ¿Falló porque la empresa no permite el descubierto, o porque el producto
 * nunca tuvo una entrada? Son los dos casos donde confirmar no sirve de nada,
 * y el mensaje del backend ya explica qué hacer.
 */
export function esDescubiertoImposible(error: unknown): boolean {
  return /existencia negativa|nunca ha tenido una entrada/i.test(
    mensajeDeError(error),
  );
}

/**
 * ¿Falló porque la venta perdería plata?
 *
 * El backend contesta "se vendería por debajo de su costo: cuesta X y el
 * precio de lista es Y". Como la falta de existencia, no es un "no" sino un
 * "¿seguro?" — pero este solo lo puede levantar un DIRECTOR, y el segundo
 * mensaje lo dice.
 */
export function esPrecioBajoCosto(error: unknown): boolean {
  return /por debajo de su costo/i.test(mensajeDeError(error));
}

/** El caso en que confirmar no sirve: quien factura no es DIRECTOR. */
export function esAutorizacionAjena(error: unknown): boolean {
  return /lo tiene que autorizar un DIRECTOR/i.test(mensajeDeError(error));
}
