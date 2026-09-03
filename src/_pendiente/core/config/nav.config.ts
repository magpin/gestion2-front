import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Package,
  Wrench,
  Users,
  Banknote,
  ListTree,
  ShieldCheck,
  CalendarRange,
  BookOpen,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";

// §Navegación por procesos.
//
//   - ESTRATÉGICOS  → cúpula (Inicio, Administración, Configuración)
//   - MISIONALES    → los básicos: Reparación y Venta
//   - TRANSVERSALES → áreas de apoyo
//
// Las claves `modulo` son las mismas de `roles.config.ts` → `puedeVer()` sigue
// gobernando la visibilidad. Este archivo define la PRESENTACIÓN.
//
// `disponible` dice si el módulo del backend ya existe. Lo que está en false se
// muestra apagado y no se puede abrir: es el mapa completo del sistema, sin
// puertas que no llevan a ninguna parte. Se enciende cuando su módulo aterriza.
// Estado al 19/08: nucleo, contabilidad, inventario, compras, facturacion,
// ventas y tesoreria en el backend. Taller queda diferido, así que Reparación
// sigue apagada. Las pantallas se encienden a medida que se adaptan.

/** Hoja de navegación: un módulo concreto con su ruta. */
export interface NavHoja {
  label: string;
  /** Clave de MODULOS_POR_ROL para filtrar por rol. */
  modulo: string;
  ruta: string;
  icon: LucideIcon;
  /** false = el módulo del backend todavía no existe. Se muestra apagado. */
  disponible: boolean;
}

/** Área transversal: agrupa 1..N módulos de apoyo bajo un nombre. */
export interface AreaTransversal {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavHoja[];
  /** Si el área tiene flujo propio, sus toques alimentan la columna izquierda. */
  transversales?: ToqueTransversal[];
}

/** Toque de un proceso misional sobre un área transversal, con su evento contable. */
export interface ToqueTransversal {
  areaId: string;
  evento: string;
}

export interface ProcesoMisional {
  id: string;
  label: string;
  icon: LucideIcon;
  ruta: string;
  modulos: string[];
  transversales: ToqueTransversal[];
  disponible: boolean;
}

export interface ProcesoEstrategico {
  label: string;
  modulo: string | null;
  ruta: string;
  icon: LucideIcon;
  disponible: boolean;
}

// ── Estratégico raíz: Inicio ────────────────────────────────────────────────────
export const INICIO: ProcesoEstrategico = {
  label: "Inicio",
  modulo: null,
  ruta: "/dashboard",
  icon: LayoutDashboard,
  disponible: true,
};

// ── Áreas transversales (de apoyo) ──────────────────────────────────────────────
export const TRANSVERSALES: AreaTransversal[] = [
  {
    // Módulo 8. Reescrita, no adaptada: la pantalla vieja manejaba turnos de
    // caja y el modelo nuevo no los tiene —un arqueo por día y el saldo como
    // suma de los movimientos—.
    id: "caja",
    label: "Caja",
    icon: Banknote,
    items: [{ label: "Caja", modulo: "caja", ruta: "/dashboard/caja", icon: Banknote, disponible: true }],
  },
  {
    // Módulo 5. Encendido desde que `ventas` se registró como origen
    // facturable. La pantalla muestra lo emitido y lo corregido; EMITIR sigue
    // viviendo en el nodo `Facturar` del proceso de venta, que es donde está el
    // trabajo pendiente.
    id: "facturacion",
    label: "Facturas",
    icon: FileText,
    items: [
      { label: "Facturas", modulo: "facturacion", ruta: "/dashboard/facturacion", icon: FileText, disponible: true },
    ],
  },
  {
    id: "contabilidad",
    // El área se nombra por lo que se abre desde el menú, no por la disciplina:
    // quien la busca va a ver los asientos, no a estudiar contabilidad.
    label: "Asientos",
    icon: BookOpen,
    items: [
      { label: "PUC", modulo: "puc", ruta: "/dashboard/puc", icon: ListTree, disponible: true },
      { label: "Períodos", modulo: "periodos", ruta: "/dashboard/periodos", icon: CalendarRange, disponible: true },
      { label: "Asientos", modulo: "asientos", ruta: "/dashboard/asientos", icon: BookOpen, disponible: true },
    ],
  },
  {
    id: "inventario",
    label: "Productos",
    icon: Package,
    items: [
      // Stock crítico dejó de ser pantalla: es el chip «Inventario bajo» de la
      // tabla de productos, y el panel del módulo ya dice cuántos hay.
      { label: "Productos", modulo: "productos", ruta: "/dashboard/productos", icon: Package, disponible: true },
    ],
  },
  {
    id: "terceros",
    label: "Terceros",
    icon: Users,
    items: [
      { label: "Terceros", modulo: "terceros", ruta: "/dashboard/terceros", icon: Users, disponible: true },
    ],
  },
  {
    // Apoyo CON flujo propio: la compra entra al costo real y genera asiento.
    id: "compra",
    label: "Compras",
    icon: Truck,
    items: [{ label: "Compras", modulo: "compras", ruta: "/dashboard/compras", icon: Truck, disponible: true }],
    // La compra no factura: no emite, recibe la factura del proveedor. Por eso
    // le falta `facturacion` y el resto conserva el mismo orden.
    transversales: [
      { areaId: "caja", evento: "Pago al proveedor · D: Proveedores / C: Caja" },
      { areaId: "contabilidad", evento: "IVA descontable + retención del 2,5% por pagar" },
      { areaId: "inventario", evento: "Entrada al kardex · D: Inventario / C: Proveedores" },
      { areaId: "terceros", evento: "El proveedor y su saldo" },
    ],
  },
  {
    // Módulo 9.
    id: "reportes",
    label: "Reportes",
    icon: BarChart3,
    items: [{ label: "Reportes", modulo: "reportes", ruta: "/dashboard/reportes", icon: BarChart3, disponible: false }],
  },
];

/** Índice rápido área.id → AreaTransversal. */
export const AREA_POR_ID: ReadonlyMap<string, AreaTransversal> = new Map(
  TRANSVERSALES.map((area) => [area.id, area]),
);

// ── Procesos misionales (los básicos) ───────────────────────────────────────────
export const MISIONALES: ProcesoMisional[] = [
  {
    // Módulo 7.
    id: "reparacion",
    label: "Reparación",
    icon: Wrench,
    ruta: "/dashboard/taller",
    modulos: ["panelTecnico", "tallerStats", "ordenesTrabajo"],
    disponible: false,
    transversales: [
      { areaId: "caja", evento: "Cobro · D: Caja / C: Cartera" },
      { areaId: "facturacion", evento: "La factura sale del mismo numerador que la venta" },
      { areaId: "contabilidad", evento: "Ingreso 415540 + IVA generado al facturar" },
      { areaId: "inventario", evento: "Consumo de repuesto · D: Costo / C: Inventario" },
      { areaId: "terceros", evento: "El dueño del equipo" },
    ],
  },
  {
    // Módulo 6.
    id: "venta",
    label: "Venta",
    icon: ShoppingCart,
    ruta: "/dashboard/ventas",
    modulos: ["ventas", "cotizaciones"],
    disponible: true,
    // El orden de los toques ES el orden de la columna izquierda. Se mantiene
    // igual en los tres procesos: la columna no debe reacomodarse al cambiar de
    // proceso, porque entonces se lee cada vez desde cero.
    transversales: [
      { areaId: "caja", evento: "Cobro · D: Caja / C: Cartera" },
      { areaId: "facturacion", evento: "Emitir congela la venta: deja de editarse" },
      { areaId: "contabilidad", evento: "DOS asientos: el del ingreso y el del costo" },
      { areaId: "inventario", evento: "Salida al costo promedio, congelado en la línea" },
      { areaId: "terceros", evento: "El cliente y su cartera" },
    ],
  },
];

// ── Procesos estratégicos (cúpula) ──────────────────────────────────────────────
export const ESTRATEGICOS: ProcesoEstrategico[] = [
  {
    // Hoy es solo la bandeja de precios bajo el piso: lo demás del módulo viejo
    // —catálogo de diagnóstico y reportería— espera a los módulos 7 y 9.
    label: "Administración",
    modulo: "administracion",
    ruta: "/dashboard/administracion",
    icon: ShieldCheck,
    disponible: true,
  },
  {
    label: "Configuración",
    modulo: "configuracion",
    ruta: "/dashboard/configuracion",
    icon: Settings,
    disponible: true,
  },
];
