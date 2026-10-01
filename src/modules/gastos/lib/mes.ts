/** «2026-09» del día de hoy. */
export function mesDeHoy(hoy = new Date()): string {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

/** «Septiembre 2026». */
export function nombreMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  const nombre = new Date(anio, numero - 1, 1).toLocaleDateString("es-CO", { month: "long" });
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** El mes de al lado: -1 el anterior, +1 el siguiente. */
export function moverMes(mes: string, pasos: number): string {
  const [anio, numero] = mes.split("-").map(Number);
  const d = new Date(anio, numero - 1 + pasos, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** El último día del mes: «2026-09» → «2026-09-30». */
export function finDeMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(anio, numero, 0).getDate()).padStart(2, "0")}`;
}
