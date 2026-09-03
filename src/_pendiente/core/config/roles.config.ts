import type { RolCodigo } from "@/modules/auth/types/auth.types";

// Los ocho roles son los del backend (tabla `rol`, catálogo del sistema).
// Dos reglas que vienen del modelo y no se pueden relajar acá:
//
//   1. LOS PERMISOS SE SUMAN. Una persona tiene VARIOS roles —la cajera lleva
//      cuatro— así que la pregunta no es "¿cuál es tu rol?" sino "¿tienes
//      alguno que habilite esto?". No hay rol que reste.
//
//   2. DIRECTOR NO ES SUPERUSUARIO. No lleva comodín. Habilita reportes,
//      autorizaciones, cierre de período y asignación de roles; si además
//      vende, se le agrega VENTAS. Si fuera superusuario,
//      `precio_autorizado_por_id` dejaría de significar algo: el director
//      autorizaría por ser director, no porque alguien se lo pidió.
//
// Este archivo define QUÉ VE cada rol. Quién puede hacer qué lo decide el
// backend con `@Roles(...)`: acá solo se evita mostrar puertas cerradas.
export const MODULOS_POR_ROL: Record<RolCodigo, string[]> = {
  // `asientos` está en los cuatro roles operativos por decisión del negocio: el
  // libro diario es la vista de qué pasó hoy en la empresa —comercio y taller—
  // y quien opera necesita verlo entero, no solo su parte. Es SOLO LECTURA:
  // el backend no tiene endpoint para crear ni anular un asiento.
  VENTAS: ["cotizaciones", "ventas", "terceros", "facturacion", "productos", "asientos"],
  COMPRAS: ["compras", "terceros", "productos", "asientos"],
  INVENTARIO: ["productos", "asientos"],
  CAJA: ["caja", "cartera", "terceros", "asientos"],
  JEFE_TECNICO: ["ordenesTrabajo", "taller", "catalogoTaller", "terceros", "panelTecnico"],
  TECNICO: ["ordenesTrabajo", "panelTecnico"],
  DIRECTOR: [
    "reportes",
    "reportesTaller",
    "administracion",
    "configuracion",
    "puc",
    "periodos",
    "asientos",
    "tallerStats",
  ],
  // El contador LEE los libros y nada más. Ve las mismas tres pantallas de
  // contabilidad que el director, pero el backend solo le abre los GET: cerrar
  // el período y configurar las cuentas por concepto siguen siendo de él.
  CONTADOR: ["asientos", "puc", "periodos"],
};

/**
 * ¿Alguno de los roles de esta persona habilita el módulo?
 *
 * Recibe la LISTA porque los permisos se suman: quien tiene VENTAS y CAJA ve lo
 * de los dos.
 */
export function puedeVer(roles: RolCodigo[], modulo: string): boolean {
  return roles.some((rol) => MODULOS_POR_ROL[rol]?.includes(modulo));
}

/** Todo lo que ve una persona, sin repetir. Útil para armar el menú de una. */
export function modulosVisibles(roles: RolCodigo[]): string[] {
  return [...new Set(roles.flatMap((rol) => MODULOS_POR_ROL[rol] ?? []))];
}
