import type { LucideIcon } from "lucide-react";
import type { RolCodigo } from "@/modules/auth/types/auth.types";
import { puedeVer } from "@/core/config/roles.config";
import {
  MISIONALES,
  TRANSVERSALES,
  ESTRATEGICOS,
  AREA_POR_ID,
  type ProcesoMisional,
  type AreaTransversal,
  type ProcesoEstrategico,
  type ToqueTransversal,
} from "@/core/config/nav.config";

// Filtrado de la navegación por procesos según el rol. Todo pasa por `puedeVer`
// (opción A: solo se expone lo alcanzable). Funciones puras → los componentes
// las envuelven en useMemo. Compartidas por `ProcesoNav` (barra superior) y
// `TransversalesPanel` (columna izquierda).

/** Un transversal que "toca" el proceso activo, con su ruta de entrada y evento contable. */
export interface TransversalActivo {
  area: AreaTransversal;
  evento: string;
  /** Primera hoja alcanzable del área (a dónde navega el ítem de la columna). */
  primaryRuta: string;
}

/**
 * Proceso CON flujo (genera asientos → tiene mapa de toques). Unifica los misionales
 * (Reparación, Venta) y las áreas de apoyo con flujo propio (Compras). Es lo que
 * puede quedar "activo" y determinar la columna izquierda.
 */
export interface ProcesoConFlujo {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Rutas que marcan este proceso como activo. */
  rutas: string[];
  transversales: ToqueTransversal[];
}

/** Misionales (básicos) que el rol puede ver (tiene alguno de sus módulos). */
export function misionalesVisibles(roles: RolCodigo[]): ProcesoMisional[] {
  return MISIONALES.filter((m) => m.modulos.some((mod) => puedeVer(roles, mod)));
}

/** Áreas transversales con solo las hojas que el rol puede abrir; descarta áreas vacías. */
export function areasVisibles(roles: RolCodigo[]): AreaTransversal[] {
  return TRANSVERSALES.map((area) => ({
    ...area,
    items: area.items.filter((it) => puedeVer(roles, it.modulo)),
  })).filter((area) => area.items.length > 0);
}

/** Estratégicos que el rol puede ver (Inicio va aparte; `modulo: null` = siempre). */
export function estrategicosVisibles(roles: RolCodigo[]): ProcesoEstrategico[] {
  return ESTRATEGICOS.filter((e) => e.modulo === null || puedeVer(roles, e.modulo));
}

/**
 * Procesos con flujo que el rol puede ver: los misionales + las áreas de apoyo que
 * declaran `transversales` (p. ej. Compras). Alimenta la detección del proceso activo
 * y la columna izquierda.
 */
export function procesosConFlujo(roles: RolCodigo[]): ProcesoConFlujo[] {
  const desdeMisionales: ProcesoConFlujo[] = misionalesVisibles(roles).map((m) => ({
    id: m.id,
    label: m.label,
    icon: m.icon,
    rutas: [m.ruta],
    transversales: m.transversales,
  }));
  const desdeApoyos: ProcesoConFlujo[] = areasVisibles(roles)
    .filter((a): a is AreaTransversal & { transversales: ToqueTransversal[] } =>
      Array.isArray(a.transversales) && a.transversales.length > 0,
    )
    .map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      rutas: a.items.map((it) => it.ruta),
      transversales: a.transversales,
    }));
  return [...desdeMisionales, ...desdeApoyos];
}

/** Transversales que toca un proceso, filtrados por lo que el rol puede abrir. */
export function transversalesDe(roles: RolCodigo[], toques: ToqueTransversal[] | undefined): TransversalActivo[] {
  if (!toques) return [];
  const out: TransversalActivo[] = [];
  for (const toque of toques) {
    const area = AREA_POR_ID.get(toque.areaId);
    if (!area) continue;
    const items = area.items.filter((it) => puedeVer(roles, it.modulo));
    if (items.length === 0) continue;
    out.push({ area, evento: toque.evento, primaryRuta: items[0].ruta });
  }
  return out;
}
