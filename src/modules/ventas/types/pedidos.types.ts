// Espejo de `/pedidos-leidos` — el pedido de un cliente que María leyó, y el
// borrador de factura que salió de él (fase 8 de
// `docs/planes/maria-facturas-y-errores.md`).
//
// **Un pedido leído no es una factura.** Una factura de venta nace emitida,
// con su consecutivo de la DIAN; esto es lo que se lleva al formulario de
// siempre para que una persona la revise y la emita.

import type {
  Comprobacion,
  EstadoLectura,
  PreguntaLectura,
} from "@/modules/compras/types/lecturas.types";

export interface RenglonPedido {
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  /** Lo que dice el pedido, antes de IVA. **No es a lo que se factura.** */
  valorUnitario: number | null;
}

export interface PedidoLeido {
  cliente: { nombre: string; nit: string | null };
  /** El número de la orden del cliente. */
  numero: string | null;
  fecha: string | null;
  renglones: RenglonPedido[];
  subtotalImpreso: number;
}

export interface RenglonPedidoCruzado {
  orden: number;
  leido: RenglonPedido;
  resuelto: { id: string; codigo: string; nombre: string } | null;
  motivo: string;
  /** El precio de lista vigente: a este se factura. */
  precioLista: number | null;
  /** Cuando el pedido dice otro precio. */
  avisoPrecio: string | null;
}

export interface PedidoCruzado {
  pedido: PedidoLeido;
  /** Vacío cuando el pedido no trae subtotal o precios con qué sumarse. */
  comprobaciones: Comprobacion[];
  cliente: { id: string; nombre: string } | null;
  renglones: RenglonPedidoCruzado[];
  lineas: Array<{ productoId: string; cantidad: number }>;
  juntadas: number;
  preguntas: PreguntaLectura[];
  completa: boolean;
}

export interface LecturaPedido {
  id: string;
  tipo: "PEDIDO_VENTA";
  estado: EstadoLectura;
  extraido: PedidoCruzado | null;
  /** En qué factura terminó, si alguien ya la emitió. Una anulada no cuenta. */
  venta: { id: string; numero: string; estado: string } | null;
  error: string | null;
  creadoEn: string;
  leidoEn: string | null;
  /** Por qué se descartó. Solo en DESCARTADO. */
  motivoDescarte: string | null;
}
