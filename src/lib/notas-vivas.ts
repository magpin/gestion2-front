/**
 * Una factura —de venta o de compra— con notas crédito o débito vivas no se
 * anula: primero se anulan las notas, cada una con su motivo. El backend lo
 * rechaza igual (`common/notas-vivas.ts`); esto lo avisa antes, en el
 * diálogo, para no pedir un motivo que después no sirve.
 */

/** Lo que hace falta de cada nota para nombrarla. */
export interface NotaDeFactura {
  tipo: string;
  estado: string;
  /** Como la conoce la persona: `NC-5`, o el número que puso el proveedor. */
  numero: string;
}

function nombre(nota: NotaDeFactura): string {
  const clase = nota.tipo === "NOTA_DEBITO" ? "nota débito" : "nota crédito";
  return `la ${clase} ${nota.numero}`;
}

/** Las notas que siguen vivas: las que traban la anulación. */
export function notasVivas(
  notas: readonly NotaDeFactura[] | undefined,
): NotaDeFactura[] {
  return (notas ?? []).filter((n) => n.estado !== "ANULADA");
}

/**
 * El aviso, nombrando las notas; `null` si no hay ninguna viva. Mismo texto
 * que el rechazo del backend. `documento`: «factura», «compra».
 */
export function avisoNotasVivas(
  documento: string,
  notas: readonly NotaDeFactura[] | undefined,
): string | null {
  const vivas = notasVivas(notas);
  if (vivas.length === 0) return null;
  if (vivas.length === 1) {
    return `Esta ${documento} tiene ${nombre(vivas[0])} viva: anulala primero.`;
  }
  const nombres = vivas.map(nombre);
  const lista = `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return `Esta ${documento} tiene vivas ${lista}: anulalas primero.`;
}
