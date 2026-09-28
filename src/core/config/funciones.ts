/**
 * Qué piezas nuevas del menú están encendidas.
 *
 * El menú nuevo llega en dos tiempos (`docs/planes/plan-integracion-menu-nuevo.md`):
 * primero se reordena lo que ya existe, y después cada pieza nueva se prende
 * cuando su backend está listo. Hasta entonces su entrada no se ve.
 *
 * Se leen de `NEXT_PUBLIC_FUNCIONES` («cobros,pagos,gastos», o «todas»), así se
 * prenden por ambiente —QA primero— sin tocar código. Next la incrusta al
 * compilar: cambiarla pide volver a construir.
 */
export type Funcion =
  | "tableroPlata"
  | "cobros"
  | "pagos"
  | "gastos"
  | "conceptos"
  | "estadosFinancieros"
  | "traslados";

const encendidas = new Set(
  (process.env.NEXT_PUBLIC_FUNCIONES ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean),
);

export const funcionActiva = (f: Funcion): boolean =>
  encendidas.has(f) || encendidas.has("todas");
