"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { useVendeSinExistencia } from "@/core/hooks/useVendeSinExistencia";
import { manejarErrorEmision } from "../lib/errores";
import type {
  CrearFacturaInput,
  VentaDocumentoDetalle,
} from "../types/ventas.types";

/**
 * Emitir una factura, con las dos preguntas que no son un «no» sino un
 * «¿seguro?»: la falta de existencia y la venta con pérdida
 * (`manejarErrorEmision`).
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
  const vendeSinExistencia = useVendeSinExistencia();

  const mutacion = useMutation({
    mutationFn: emitir,
    onSuccess: alEmitir,
    onError: (e: unknown, datos) =>
      manejarErrorEmision(e, datos, (d) => mutacion.mutate(d), router.push, vendeSinExistencia),
  });

  return mutacion;
}
