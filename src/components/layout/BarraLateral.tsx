"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  BookOpen,
  ChartColumn,
  ClipboardCheck,
  FileChartColumn,
  Home,
  Landmark,
  Library,
  Package,
  Percent,
  Receipt,
  ReceiptText,
  Scale,
  Settings2,
  ShoppingCart,
  Sparkle,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { funcionActiva, type Funcion } from "@/core/config/funciones";
import { useAuthStore } from "@/core/store/authStore";
import { Maria } from "@/modules/asistente/components/Maria";
import { ROLES_MARIA, usePendientes } from "@/modules/asistente/hooks/usePendientes";
import type { RolCodigo } from "@/modules/auth/types/auth.types";

interface Entrada {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /**
   * Quién puede LISTAR lo que hay detrás, copiado del `@Roles` del endpoint de
   * lectura en el backend. Sin lista, entra cualquiera con empresa elegida.
   *
   * Es cosmético: quién puede hacer qué lo decide el backend. Acá solo se evita
   * mostrar una puerta que al abrirla da 403.
   */
  roles?: RolCodigo[];
  /**
   * En vez de un ícono, la cara del asistente. Es una sola entrada: la cara
   * distingue a María de los módulos, y repetirla dejaría de distinguir nada.
   */
  cara?: boolean;
  /**
   * Pieza nueva del menú: no se muestra hasta que su backend esté y se
   * encienda (`core/config/funciones.ts`).
   */
  funcion?: Funcion;
  /** La entrada vieja que se retira cuando se prende su reemplazo: Retenciones cuando llega Impuestos. */
  hastaQue?: Funcion;
  /** Otras rutas que también la marcan activa. */
  alias?: string[];
}

interface Grupo {
  etiqueta?: string;
  entradas: Entrada[];
}

/**
 * El mapa del área de trabajo, en el orden en que se mueve la plata: lo que
 * entra, lo que sale, dónde está, y después cómo lo registra el libro y cómo
 * va el negocio. Lo que casi no se usa baja al pie.
 *
 * El árbol completo, con de dónde viene cada pantalla, está en
 * `docs/planes/menu-propuesto-ingresos-egresos.md`.
 */
const GRUPOS: Grupo[] = [
  {
    entradas: [
      { href: "/dashboard", etiqueta: "Inicio", icono: Home },
      {
        // Arriba de todo y fuera de los grupos: no es un módulo del negocio,
        // es otra manera de entrar a todos.
        //
        // Los mismos tres roles que «Configurar empresa», que son los que el
        // backend exige para escribir: el asistente no amplía permisos.
        href: "/dashboard/asistente",
        etiqueta: "María",
        icono: Sparkle,
        roles: ROLES_MARIA,
        cara: true,
      },
    ],
  },
  {
    etiqueta: "Ingresos",
    entradas: [
      {
        href: "/dashboard/ventas",
        etiqueta: "Ventas",
        icono: ReceiptText,
        roles: ["DIRECTOR", "CONTADOR", "VENTAS", "CONSULTA"],
      },
      {
        href: "/dashboard/cobros",
        etiqueta: "Cobros",
        icono: BanknoteArrowDown,
        roles: ["DIRECTOR", "CONTADOR", "CAJA", "VENTAS", "CONSULTA"],
        funcion: "cobros",
      },
      {
        href: "/dashboard/anticipos",
        etiqueta: "Anticipos",
        icono: Wallet,
        roles: ["DIRECTOR", "CONTADOR", "CAJA", "VENTAS", "CONSULTA"],
        funcion: "cobros",
      },
    ],
  },
  {
    etiqueta: "Egresos",
    entradas: [
      {
        href: "/dashboard/compras",
        etiqueta: "Compras",
        icono: ShoppingCart,
        roles: ["DIRECTOR", "CONTADOR", "COMPRAS", "CONSULTA"],
      },
      {
        href: "/dashboard/gastos",
        etiqueta: "Gastos",
        icono: Receipt,
        roles: ["DIRECTOR", "CONTADOR", "COMPRAS", "CAJA", "CONSULTA"],
        funcion: "gastos",
      },
      {
        href: "/dashboard/pagos",
        etiqueta: "Pagos",
        icono: BanknoteArrowUp,
        roles: ["DIRECTOR", "CONTADOR", "CAJA", "CONSULTA"],
        funcion: "pagos",
      },
    ],
  },
  {
    // Las dos mitades de lo que era Tesorería: operar y cuadrar.
    etiqueta: "Dinero",
    entradas: [
      {
        href: "/dashboard/caja-bancos",
        etiqueta: "Caja y bancos",
        icono: Landmark,
        roles: ["DIRECTOR", "CONTADOR", "CAJA", "CONSULTA"],
      },
      {
        href: "/dashboard/control",
        etiqueta: "Control",
        icono: ClipboardCheck,
        roles: ["DIRECTOR", "CONTADOR", "CAJA", "CONSULTA"],
      },
    ],
  },
  {
    // Consume lo que hacen Ventas y Compras: no mueve plata por sí mismo.
    etiqueta: "Inventario",
    entradas: [
      {
        href: "/dashboard/inventario",
        etiqueta: "Inventario",
        icono: Package,
        roles: ["DIRECTOR", "CONTADOR", "INVENTARIO", "VENTAS", "COMPRAS", "CONSULTA"],
      },
    ],
  },
  {
    etiqueta: "Contabilidad",
    entradas: [
      {
        href: "/dashboard/contabilidad",
        etiqueta: "Libro",
        icono: Scale,
        roles: ["DIRECTOR", "CONTADOR", "CONSULTA"],
      },
      {
        href: "/dashboard/conceptos",
        etiqueta: "Conceptos",
        icono: Tags,
        roles: ["DIRECTOR", "CONTADOR"],
        funcion: "conceptos",
      },
      {
        href: "/dashboard/retenciones",
        etiqueta: "Retenciones",
        icono: Percent,
        roles: ["DIRECTOR", "CONTADOR", "CONSULTA"],
        hastaQue: "impuestos",
      },
      {
        // Retenciones, más el calendario, las declaraciones y su pago (PC6).
        href: "/dashboard/impuestos",
        etiqueta: "Impuestos",
        icono: Percent,
        roles: ["DIRECTOR", "CONTADOR", "CONSULTA"],
        funcion: "impuestos",
        alias: ["/dashboard/retenciones"],
      },
      {
        href: "/dashboard/plan-cuentas",
        etiqueta: "Plan de cuentas",
        icono: BookOpen,
      },
      {
        href: "/dashboard/terceros",
        etiqueta: "Terceros",
        icono: Users,
        roles: ["DIRECTOR", "CONTADOR", "VENTAS", "COMPRAS"],
      },
    ],
  },
  {
    // Lo que se saca de todo lo anterior. Los roles de Reportes son la unión
    // de los de cada reporte: quien no puede correr ninguno no ve la puerta.
    etiqueta: "Análisis",
    entradas: [
      {
        href: "/dashboard/estados-financieros",
        etiqueta: "Estados financieros",
        icono: FileChartColumn,
        roles: ["DIRECTOR", "CONTADOR", "CONSULTA"],
        funcion: "estadosFinancieros",
      },
      {
        href: "/dashboard/reportes",
        etiqueta: "Reportes",
        icono: ChartColumn,
        roles: ["DIRECTOR", "CONTADOR", "VENTAS", "CAJA", "CONSULTA"],
      },
    ],
  },
];

/**
 * El pie: lo que no cambia nunca y lo que se hace una vez. A un clic, pero
 * fuera del recorrido de todos los días.
 */
const PIE: Entrada[] = [
  {
    href: "/dashboard/referencia",
    etiqueta: "Referencia",
    icono: Library,
    alias: ["/dashboard/catalogos"],
  },
  {
    href: "/configuracion/empresa",
    etiqueta: "Configurar empresa",
    icono: Settings2,
    roles: ["ADMIN_TENANT", "DIRECTOR", "CONTADOR"],
  },
];

/** Si la entrada se muestra, sin mirar si ya montó: esa espera es de la barra. */
function entradaVisible(entrada: Entrada, roles: RolCodigo[]): boolean {
  return (
    (entrada.funcion === undefined || funcionActiva(entrada.funcion)) &&
    (entrada.hastaQue === undefined || !funcionActiva(entrada.hastaQue)) &&
    (entrada.roles === undefined || entrada.roles.some((r) => roles.includes(r)))
  );
}

/** Adónde puede ir quien tiene estos roles, en el orden del menú. Para las pruebas. */
export function destinosVisibles(roles: RolCodigo[]): string[] {
  return [...GRUPOS.flatMap((g) => g.entradas), ...PIE]
    .filter((e) => entradaVisible(e, roles))
    .map((e) => e.href);
}

/**
 * La navegación entre módulos.
 *
 * Colapsa a iconos y no desaparece: en una pantalla que se mira ocho horas el
 * ancho se recupera, pero el mapa del sistema tiene que seguir a un clic.
 *
 * Los roles se leen recién montado el árbol: el servidor no tiene
 * `localStorage` y lo que ve es siempre `[]`. Filtrar en el primer render
 * mostraría una lista distinta de la que llegó en el HTML y React lo marca
 * como error de hidratación. Hasta ese momento se listan solo las puertas que
 * no piden rol; el resto aparece un instante después. Aparecer es mejor que
 * desaparecer: nadie alcanza a hacer clic en algo que se le va.
 */
export function BarraLateral() {
  const pathname = usePathname();
  // En móvil el menú es un panel que tapa la pantalla: al elegir un destino
  // tiene que irse solo, o queda cubriendo la página a la que se acaba de ir.
  const { setOpenMobile, state } = useSidebar();
  const cerrarEnMovil = () => setOpenMobile(false);
  const roles = useAuthStore((s) => s.roles);
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const puedeVer = (entrada: Entrada) =>
    (entrada.roles === undefined || montado) && entradaVisible(entrada, roles);

  // Solo se pide si la persona ve a María: el número es suyo.
  const pendientes = usePendientes(
    montado && ROLES_MARIA.some((r) => roles.includes(r)),
  );
  const hayPendientes = (pendientes?.total ?? 0) > 0;

  // `/dashboard` es exacto; cualquier otra ruta también marca sus hijas.
  const coincide = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const esActiva = (entrada: Entrada) =>
    coincide(entrada.href) || (entrada.alias ?? []).some(coincide);

  const boton = (entrada: Entrada) => (
    <SidebarMenuItem key={entrada.href}>
      <SidebarMenuButton
        isActive={esActiva(entrada)}
        tooltip={entrada.etiqueta}
        render={<Link href={entrada.href} onClick={cerrarEnMovil} />}
      >
        {entrada.cara ? (
          // 20 px, como en la lámina `Aplicada`. Con la barra plegada el número
          // no entra: la cara pasa a «espera», con su distintivo ámbar, para
          // que igual se note.
          <Maria
            estado={state === "collapsed" && hayPendientes ? "espera" : "reposo"}
            tamano={20}
          />
        ) : (
          <entrada.icono />
        )}
        <span>{entrada.etiqueta}</span>
        {entrada.cara && hayPendientes && pendientes !== undefined && (
          <span
            aria-label={`${pendientes.total} pendientes`}
            className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums group-data-[collapsible=icon]:hidden"
          >
            {pendientes.total}
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const pie = PIE.filter(puedeVer);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Gestión"
              render={<Link href="/dashboard" onClick={cerrarEnMovil} />}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary font-mono text-[13px] font-bold text-primary-foreground">
                G
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">Gestión</span>
                <span className="text-[11px] text-muted-foreground">
                  Área de trabajo
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {GRUPOS.map((grupo, i) => {
          const visibles = grupo.entradas.filter(puedeVer);
          if (visibles.length === 0) return null;
          return (
            <SidebarGroup key={grupo.etiqueta ?? i}>
              {grupo.etiqueta && (
                <SidebarGroupLabel>{grupo.etiqueta}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>{visibles.map(boton)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {pie.length > 0 && (
        <SidebarFooter>
          <SidebarMenu>{pie.map(boton)}</SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
