export type FrecuenciaCredito = "QUINCENAL" | "MENSUAL";

export interface CuotaCalculada {
  numero: number;
  fechaVencimiento: Date;
  monto: number;
}

const DIAS_QUINCENA = 15;

// ⚠️ PARIDAD CON EL BACKEND — esto es la traducción 1:1 de
// backend/src/common/helpers/cuotas.ts. Acá solo se usa para el resumen que el
// usuario ve ANTES de guardar; las cuotas reales las genera el servidor.
//
// Si divergen, el formulario prometería un plan de pagos distinto del que queda
// registrado. Cualquier cambio en el reparto o en las fechas hay que hacerlo en
// los dos lados, en el mismo commit.

function sumarPeriodos(
  desde: Date,
  frecuencia: FrecuenciaCredito,
  periodos: number,
): Date {
  const fecha = new Date(desde);
  if (frecuencia === "QUINCENAL") {
    fecha.setDate(fecha.getDate() + DIAS_QUINCENA * periodos);
    return fecha;
  }
  const diaOriginal = fecha.getDate();
  fecha.setMonth(fecha.getMonth() + periodos);
  // setMonth desborda cuando el día no existe (31 de febrero → 3 de marzo):
  // se retrocede al último día real del mes destino.
  if (fecha.getDate() < diaOriginal) fecha.setDate(0);
  return fecha;
}

// El reparto trunca hacia abajo y le da todo el resto a la ÚLTIMA cuota, para
// que la suma dé exactamente el total. Repartir el redondeo entre todas dejaría
// centavos sin asignar, y un saldo que nunca llega a cero.
export function generarCuotas(
  total: number,
  frecuencia: FrecuenciaCredito,
  numeroCuotas: number,
  desde: Date = new Date(),
): CuotaCalculada[] {
  if (numeroCuotas < 1 || total <= 0) return [];

  const centavosTotal = Math.round(total * 100);
  const centavosPorCuota = Math.floor(centavosTotal / numeroCuotas);

  const cuotas: CuotaCalculada[] = [];
  let acumulado = 0;

  for (let numero = 1; numero <= numeroCuotas; numero++) {
    const centavos =
      numero === numeroCuotas ? centavosTotal - acumulado : centavosPorCuota;
    acumulado += centavos;
    cuotas.push({
      numero,
      fechaVencimiento: sumarPeriodos(desde, frecuencia, numero),
      monto: centavos / 100,
    });
  }

  return cuotas;
}

export interface CuotaImputable {
  numero: number;
  saldo: number;
}

export interface Imputacion {
  numero: number;
  aplicado: number;
  saldoResultante: number;
}

// ⚠️ PARIDAD CON EL BACKEND — traducción 1:1 de `imputarAbono` de
// backend/src/common/helpers/cuotas.ts. Acá solo se usa para mostrarle al
// usuario a qué cuotas va a parar el abono ANTES de confirmarlo; la imputación
// real la hace el servidor.
//
// Si divergen, el modal prometería una imputación distinta de la que queda
// registrada. Cualquier cambio va en los dos lados, en el mismo commit.
//
// Nunca se prorratea: prorratear dejaría TODAS las cuotas parcialmente pagas y
// ninguna saldada, así que la cartera no podría decir cuántas cuotas debe el
// cliente — solo un monto difuso. Saldar en orden mantiene la respuesta simple:
// "va por la cuota 3".
export function imputarAbono(
  cuotas: CuotaImputable[],
  monto: number,
): Imputacion[] {
  let restante = Math.round(monto * 100);
  const imputaciones: Imputacion[] = [];

  for (const cuota of [...cuotas].sort((a, b) => a.numero - b.numero)) {
    if (restante <= 0) break;
    const saldoCentavos = Math.round(cuota.saldo * 100);
    if (saldoCentavos <= 0) continue;

    const aplicado = Math.min(restante, saldoCentavos);
    restante -= aplicado;
    imputaciones.push({
      numero: cuota.numero,
      aplicado: aplicado / 100,
      saldoResultante: (saldoCentavos - aplicado) / 100,
    });
  }

  return imputaciones;
}

export const FRECUENCIAS: { id: FrecuenciaCredito; label: string }[] = [
  { id: "QUINCENAL", label: "Quincenal" },
  { id: "MENSUAL", label: "Mensual" },
];

// Hasta 24: dos años a cuota mensual. Más que eso deja de ser una venta a
// crédito y pasa a ser una financiación, que este sistema no modela.
export const OPCIONES_CUOTAS = Array.from({ length: 24 }, (_, i) => i + 1);
