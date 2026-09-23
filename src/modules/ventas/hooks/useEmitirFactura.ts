"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import {
  avisarErrorVenta,
  esFaltaDeExistencia,
  esPrecioBajoCosto,
} from "../lib/errores";
import type {
  CrearFacturaInput,
  VentaDocumentoDetalle,
} from "../types/ventas.types";

/**
 * Emitir una factura, con las dos preguntas que no son un «no» sino un
 * «¿seguro?»: la falta de existencia y la venta con pérdida.
 *
 * Es un hook y no código de la sección porque **hay dos puertas que emiten**:
 * la factura de siempre (`POST /facturas`) y la que sale de un pedido que
 * María leyó (`POST /pedidos-leidos/:id/facturar`). Las dos tienen que
 * preguntar lo mismo y reintentar igual; si cada una lo hiciera por su cuenta,
 * tarde o temprano una preguntaría distinto.
 */
export function useEmitirFactura(
  emitir: (datos: CrearFacturaInput) => Promise<VentaDocumentoDetalle>,
  alEmitir: (factura: VentaDocumentoDetalle) => void | Promise<void>,
) {
  const router = useRouter();

  const mutacion = useMutation({
    mutationFn: emitir,
    onSuccess: alEmitir,
    /**
     * Falta de existencia no es un "no": es un "¿seguro?". El cliente está
     * esperando y la mercancía puede haber llegado sin registrarse, así que
     * se pregunta y, si confirma, se reintenta con `confirmaSinExistencia`.
     * El backend sigue teniendo la última palabra: si la empresa no habilitó
     * el descubierto, o el producto nunca tuvo una entrada, ese segundo
     * intento también se rechaza —y ahí el mensaje explica qué falta—.
     */
    onError: async (e: unknown, datos) => {
      // Vender con pérdida: mismo patrón que la falta de existencia —se
      // pregunta y se reintenta—, pero el backend solo lo acepta de un
      // DIRECTOR y deja anotado en la línea quién lo autorizó.
      if (esPrecioBajoCosto(e) && datos.confirmaPrecioBajoCosto !== true) {
        const seguir = await aviso.confirmar(
          mensajeDeError(e),
          "Emitirla igual deja la venta con pérdida y anota en la línea quién lo autorizó. Solo un DIRECTOR puede hacerlo.",
          "Emitir con pérdida",
        );
        if (seguir) {
          mutacion.mutate({ ...datos, confirmaPrecioBajoCosto: true });
        }
        return;
      }
      if (!esFaltaDeExistencia(e) || datos.confirmaSinExistencia === true) {
        avisarErrorVenta(e, router.push);
        return;
      }
      const seguir = await aviso.confirmar(
        mensajeDeError(e),
        "Si emitís la factura igual, el inventario de ese producto queda en negativo y lo que falte queda anotado en la lista de compras pendientes, con la factura que lo sacó.",
        "Emitir igual",
      );
      if (seguir) {
        mutacion.mutate({ ...datos, confirmaSinExistencia: true });
      }
    },
  });

  return mutacion;
}
