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
  return /existencia negativa|nunca ha tenido una entrada|no vende sin existencia/i.test(
    mensajeDeError(error),
  );
}

/**
 * ¿Falló porque la venta perdería plata?
 *
 * El backend contesta "se vendería por debajo de su costo: cuesta X y el
 * precio de la línea es Y". Como la falta de existencia, no es un "no" sino un
 * "¿seguro?" — pero este solo lo puede levantar un DIRECTOR, y el segundo
 * mensaje lo dice.
 */
export function esPrecioBajoCosto(error: unknown): boolean {
  return /por debajo de su costo/i.test(mensajeDeError(error));
}

/**
 * ¿Falló porque quien factura confirmó vender sin existencia, pero la empresa
 * no lo tiene habilitado? El backend lo dice con «no vende sin existencia».
 */
export function esEmpresaSinDescubierto(error: unknown): boolean {
  return /no vende sin existencia/i.test(mensajeDeError(error));
}

/** Lo que se reintenta al confirmar: la misma emisión con una confirmación más. */
interface ConConfirmaciones {
  confirmaSinExistencia?: boolean;
  confirmaPrecioBajoCosto?: boolean;
}

/**
 * Los errores de emitir una factura, sea directa o desde una cotización: las
 * dos preguntas que no son un «no» sino un «¿seguro?» —la venta con pérdida y
 * la falta de existencia— y el resto como aviso.
 *
 * «Emitir igual» solo se ofrece si sirve: si la empresa no vende sin
 * existencia (`vendeSinExistencia === false`), o el producto nunca tuvo una
 * entrada, el reintento se rechazaría igual, y el mensaje ya dice qué hacer.
 */
export async function manejarErrorEmision<T extends ConConfirmaciones>(
  e: unknown,
  datos: T,
  reintentar: (datos: T) => void,
  irA: (ruta: string) => void,
  vendeSinExistencia?: boolean,
): Promise<void> {
  // Vender con pérdida: se pregunta y se reintenta, pero el backend solo lo
  // acepta de un DIRECTOR y deja anotado en la línea quién lo autorizó.
  if (esPrecioBajoCosto(e) && datos.confirmaPrecioBajoCosto !== true) {
    const seguir = await aviso.confirmar(
      mensajeDeError(e),
      "Emitirla igual deja la venta con pérdida y anota en la línea quién lo autorizó. Solo un DIRECTOR puede hacerlo.",
      "Emitir con pérdida",
    );
    if (seguir) reintentar({ ...datos, confirmaPrecioBajoCosto: true });
    return;
  }
  if (
    !esFaltaDeExistencia(e) ||
    datos.confirmaSinExistencia === true ||
    vendeSinExistencia === false ||
    esDescubiertoImposible(e) ||
    esEmpresaSinDescubierto(e)
  ) {
    avisarErrorVenta(e, irA);
    return;
  }
  const seguir = await aviso.confirmar(
    mensajeDeError(e),
    "Si emitís la factura igual, el inventario de ese producto queda en negativo y lo que falte queda anotado en la lista de compras pendientes, con la factura que lo sacó.",
    "Emitir igual",
  );
  if (seguir) reintentar({ ...datos, confirmaSinExistencia: true });
}
