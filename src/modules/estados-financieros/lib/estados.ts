import { moverMes, nombreMes } from "@/modules/gastos/lib/mes";
import type { BalanceGeneral, EstadoResultados, FlujoDirecto } from "../types/estados.types";

/** Variación en porcentaje con un decimal; `null` si el anterior es cero. La misma cuenta del backend. */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / Math.abs(anterior)) * 1000) / 10;
}

/** «+7,6 %», «−3 %» o «—». */
export function formatoPorcentaje(v: number | null, conSigno = true): string {
  if (v === null) return "—";
  const signo = conSigno && v > 0 ? "+" : "";
  return `${signo}${v.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
}

/** «Sep 2026». */
export function mesCorto(mes: string): string {
  const [nombre, anio] = nombreMes(mes).split(" ");
  return `${nombre.slice(0, 3)} ${anio}`;
}

/** «30 sep 2026». */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  // Tres letras siempre: «short» en es-CO da «sept.».
  const nombre = new Date(anio, mes - 1, 1).toLocaleDateString("es-CO", { month: "long" }).slice(0, 3);
  return `${dia} ${nombre} ${anio}`;
}

/** Contra qué se puede comparar: los doce meses de antes y el mismo mes del año anterior primero. */
export function opcionesComparar(mes: string): Array<{ value: string; label: string }> {
  const anterior = moverMes(mes, -1);
  const haceUnAnio = moverMes(mes, -12);
  const resto = Array.from({ length: 10 }, (_, i) => moverMes(mes, -(i + 2)));
  return [
    { value: "", label: "Sin comparar" },
    { value: anterior, label: `${nombreMes(anterior)} (mes anterior)` },
    { value: haceUnAnio, label: `${nombreMes(haceUnAnio)} (hace un año)` },
    ...resto.map((m) => ({ value: m, label: nombreMes(m) })),
  ];
}

/** Lo que valía cada renglón y cada cuenta del estado de resultados comparado, por su clave o su código. */
export function valoresResultados(estado: EstadoResultados | undefined): Map<string, number> {
  const valores = new Map<string, number>();
  for (const r of estado?.renglones ?? []) {
    valores.set(r.clave, r.valor);
    for (const c of r.cuentas ?? []) valores.set(`${r.clave}:${c.codigo}`, c.valor);
  }
  return valores;
}

/** Lo mismo para el balance: por grupo, por cuenta y por sección. Los grupos del PUC no se repiten entre lados. */
export function valoresBalance(balance: BalanceGeneral | undefined): Map<string, number> {
  const valores = new Map<string, number>();
  if (balance === undefined) return valores;
  for (const lado of [balance.activo, balance.pasivo, balance.patrimonio]) {
    for (const s of lado.secciones) {
      valores.set(`seccion:${s.etiqueta}`, s.total);
      for (const r of s.renglones) {
        valores.set(r.grupo, r.valor);
        for (const c of r.cuentas) valores.set(`cuenta:${c.codigo}`, c.valor);
      }
    }
  }
  valores.set("total:activo", balance.activo.total);
  valores.set("total:pasivo", balance.pasivo.total);
  valores.set("total:patrimonio", balance.patrimonio.total);
  valores.set("total:pasivoPatrimonio", balance.pasivo.total + balance.patrimonio.total);
  return valores;
}

/**
 * Lo del corto plazo del balance (PC10): el activo y el pasivo corrientes, el
 * capital de trabajo (lo que queda si se pagara hoy todo lo de corto plazo),
 * la razón corriente y el endeudamiento.
 */
export function indicadoresBalance(balance: BalanceGeneral): {
  activoCorriente: number;
  pasivoCorriente: number;
  capitalDeTrabajo: number;
  razonCorriente: number | null;
  endeudamiento: number | null;
} {
  const seccion = (lado: BalanceGeneral["activo"], etiqueta: string) =>
    lado.secciones.find((s) => s.etiqueta === etiqueta)?.total ?? 0;
  const activoCorriente = seccion(balance.activo, "Activo corriente");
  const pasivoCorriente = seccion(balance.pasivo, "Pasivo corriente");
  return {
    activoCorriente,
    pasivoCorriente,
    capitalDeTrabajo: activoCorriente - pasivoCorriente,
    razonCorriente: pasivoCorriente === 0 ? null : activoCorriente / pasivoCorriente,
    endeudamiento: balance.activo.total === 0 ? null : (balance.pasivo.total / balance.activo.total) * 100,
  };
}

/**
 * La nota del flujo del mes, armada con reglas y no con texto fijo (PC10):
 * si la plata subió o bajó, y qué pesó más en cada sentido.
 */
export function notaDelFlujo(flujo: FlujoDirecto): string | null {
  const rubros = flujo.actividades.flatMap((a) => a.rubros);
  if (rubros.length === 0) return null;
  const pesos = (v: number) => `$ ${Math.round(Math.abs(v)).toLocaleString("es-CO")}`;
  const salida = rubros.filter((r) => r.valor < 0).sort((a, b) => a.valor - b.valor)[0];
  const entrada = rubros.filter((r) => r.valor > 0).sort((a, b) => b.valor - a.valor)[0];
  if (flujo.neto < 0) {
    return `Salió más de lo que entró: caja y bancos bajaron ${pesos(flujo.neto)}.${
      salida ? ` Lo que más pesó fue ${salida.rubro.toLowerCase()} (${pesos(salida.valor)}).` : ""
    }`;
  }
  if (flujo.neto > 0) {
    return `Entró más de lo que salió: caja y bancos subieron ${pesos(flujo.neto)}.${
      entrada ? ` Lo que más aportó fue ${entrada.rubro.toLowerCase()} (${pesos(entrada.valor)}).` : ""
    }`;
  }
  return "Entró lo mismo que salió: caja y bancos quedaron igual.";
}
