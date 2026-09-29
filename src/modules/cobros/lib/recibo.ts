import type { FacturaPorCobrar } from "../types/cobros.types";

/**
 * Lo que se abona: una factura de venta en el recibo de caja o una compra en
 * el comprobante de egreso. Si trae `descuentoSugerido` (el pronto pago del
 * proveedor, en plazo), marcarla lo propone.
 */
export interface DocumentoAbonable {
  id: string;
  numero: string;
  pendiente: number;
  descuentoSugerido?: number;
}

/** Un renglón mientras se edita: el documento, cuánto se abona y cuánto se descuenta. */
export interface AbonoBorrador<F extends DocumentoAbonable = FacturaPorCobrar> {
  factura: F;
  marcada: boolean;
  /** Texto: vacío es «sin llenar», no cero. */
  valor: string;
  /** Descuento por pronto pago que se le concede: salda sin que entre plata. */
  descuento: string;
}

const centavos = (texto: string) => Math.round(Number(texto || 0) * 100);

/**
 * Los renglones con que arranca el recibo. Si viene una factura elegida (el
 * atajo «Cobrar» desde Ventas), solo esa va marcada y por su saldo; si no,
 * ninguna: quien cobra dice cuáles.
 */
export function abonosIniciales<F extends DocumentoAbonable>(
  facturas: F[],
  facturaElegida?: string,
): AbonoBorrador<F>[] {
  return facturas.map((f) => (f.id === facturaElegida ? marcar(f) : { factura: f, marcada: false, valor: "", descuento: "" }));
}

/** El renglón marcado por su saldo entero, menos el descuento sugerido si lo hay. */
function marcar<F extends DocumentoAbonable>(f: F): AbonoBorrador<F> {
  const saldo = Math.round(f.pendiente * 100);
  const sugerido = Math.min(Math.round((f.descuentoSugerido ?? 0) * 100), saldo);
  return {
    factura: f,
    marcada: true,
    valor: String((saldo - sugerido) / 100),
    descuento: sugerido > 0 ? String(sugerido / 100) : "",
  };
}

/**
 * Marcar una factura propone su saldo entero; desmarcarla borra el abono y
 * el descuento. Escribir un valor la marca: una casilla vacía con plata al
 * lado es el error que el diseño dejaba pasar.
 */
export function alternar<F extends DocumentoAbonable>(abonos: AbonoBorrador<F>[], id: string): AbonoBorrador<F>[] {
  return abonos.map((a) =>
    a.factura.id !== id ? a : a.marcada ? { ...a, marcada: false, valor: "", descuento: "" } : marcar(a.factura),
  );
}

export function cambiarValor<F extends DocumentoAbonable>(
  abonos: AbonoBorrador<F>[],
  id: string,
  valor: string,
): AbonoBorrador<F>[] {
  return abonos.map((a) =>
    a.factura.id !== id
      ? a
      : { ...a, valor, marcada: Number(valor) > 0 || Number(a.descuento) > 0 },
  );
}

/**
 * Poner un descuento baja el abono en lo mismo si el abono era el saldo
 * entero: el cliente paga el saldo menos el descuento, que es el caso normal.
 */
export function cambiarDescuento<F extends DocumentoAbonable>(
  abonos: AbonoBorrador<F>[],
  id: string,
  descuento: string,
): AbonoBorrador<F>[] {
  return abonos.map((a) => {
    if (a.factura.id !== id) return a;
    const saldo = Math.round(a.factura.pendiente * 100);
    const antes = centavos(a.descuento);
    const valor =
      centavos(a.valor) + antes === saldo
        ? String(Math.max(saldo - centavos(descuento), 0) / 100)
        : a.valor;
    return { ...a, descuento, valor, marcada: Number(valor) > 0 || Number(descuento) > 0 };
  });
}

/** Lo que el cliente paga en plata por las facturas, en centavos enteros. */
export function totalRecibo(abonos: AbonoBorrador<DocumentoAbonable>[]): number {
  return abonos.filter((a) => a.marcada).reduce((t, a) => t + centavos(a.valor), 0) / 100;
}

export function totalDescuentos(abonos: AbonoBorrador<DocumentoAbonable>[]): number {
  return abonos.filter((a) => a.marcada).reduce((t, a) => t + centavos(a.descuento), 0) / 100;
}

/** Qué impide guardar, o `null`. Uno a la vez, como el pie de los demás formularios. */
export function problemaDelRecibo(
  abonos: AbonoBorrador<DocumentoAbonable>[],
  anticipo = "",
  comision = "",
  cuales = "factura",
): string | null {
  const marcadas = abonos.filter((a) => a.marcada);
  if (marcadas.length === 0 && !(Number(anticipo) > 0)) {
    return `Marcá al menos una ${cuales} o escribí un anticipo.`;
  }
  for (const a of marcadas) {
    const valor = centavos(a.valor);
    const descuento = centavos(a.descuento);
    if (valor < 0 || descuento < 0) return "Los valores no pueden ser negativos.";
    if (valor + descuento === 0) return `Escribí cuánto se abona a ${a.factura.numero}.`;
    if (valor + descuento > Math.round(a.factura.pendiente * 100)) {
      return `A ${a.factura.numero} solo le faltan ${a.factura.pendiente.toLocaleString("es-CO")}: el abono y el descuento no pueden pasar de ahí.`;
    }
  }
  const plata = Math.round(totalRecibo(abonos) * 100) + centavos(anticipo);
  if (plata <= 0) return "No se mueve plata: un descuento se concede cuando se paga.";
  if (centavos(comision) >= plata) return "La comisión tiene que ser menor que lo que entró.";
  return null;
}
