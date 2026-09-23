"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  BookOpen,
  Briefcase,
  ChartColumn,
  Home,
  Landmark,
  Library,
  Package,
  ReceiptText,
  Scale,
  Settings2,
  ShoppingCart,
  Sparkle,
  Users,
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
   * El ícono va en naranja. Lo lleva **una sola entrada** —el asistente—, que es
   * la excepción que el reglamento de color permite: el acento señala un punto,
   * y si lo llevaran dos entradas dejaría de señalar ninguna.
   */
  acento?: boolean;
  /**
   * En vez de un ícono, la cara del asistente. Es una sola entrada: la cara
   * distingue a María de los módulos, y repetirla dejaría de distinguir nada.
   */
  cara?: boolean;
}

interface Grupo {
  etiqueta?: string;
  entradas: Entrada[];
}

/**
 * El mapa del área de trabajo, en el orden en que se piensa el negocio: lo que
 * mueve plata primero, el libro que lo registra después, y al final lo que no
 * cambia nunca.
 *
 * Los grupos son los del criterio de `docs/decisiones/arquitectura-modulos.md`:
 * misionales (ventas, compras, inventario, tesorería), transversales
 * (contabilidad y lo que la alimenta) y catálogos de referencia.
 */
const GRUPOS: Grupo[] = [
  {
    entradas: [
      { href: "/dashboard", etiqueta: "Inicio", icono: Home },
      {
        // Arriba de todo y fuera de los grupos, como en el prototipo: no es un
        // módulo del negocio, es otra manera de entrar a todos.
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
    etiqueta: "Operación",
    entradas: [
      {
        href: "/dashboard/ventas",
        etiqueta: "Ventas",
        icono: ReceiptText,
        roles: ["DIRECTOR", "CONTADOR", "VENTAS", "CONSULTA"],
      },
      {
        href: "/dashboard/compras",
        etiqueta: "Compras",
        icono: ShoppingCart,
        roles: ["DIRECTOR", "CONTADOR", "COMPRAS", "CONSULTA"],
      },
      {
        href: "/dashboard/inventario",
        etiqueta: "Inventario",
        icono: Package,
        roles: ["DIRECTOR", "CONTADOR", "INVENTARIO", "VENTAS", "COMPRAS", "CONSULTA"],
      },
      {
        href: "/dashboard/tesoreria",
        etiqueta: "Tesorería",
        icono: Landmark,
        roles: ["DIRECTOR", "CONTADOR", "CAJA", "CONSULTA"],
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
    // Lo que se saca de todo lo anterior. Los roles son la unión de los de
    // cada reporte: quien no puede correr ninguno no ve la puerta.
    etiqueta: "Análisis",
    entradas: [
      {
        href: "/dashboard/reportes",
        etiqueta: "Reportes",
        icono: ChartColumn,
        roles: ["DIRECTOR", "CONTADOR", "VENTAS", "CAJA", "CONSULTA"],
      },
    ],
  },
  {
    etiqueta: "Referencia",
    entradas: [
      { href: "/dashboard/catalogos/puc", etiqueta: "PUC", icono: Library },
      {
        href: "/dashboard/catalogos/ciiu",
        etiqueta: "Actividades CIIU",
        icono: Briefcase,
      },
    ],
  },
];

/** El asistente vive fuera del área de trabajo, pero se entra desde acá. */
const CONFIGURACION: Entrada = {
  href: "/configuracion/empresa",
  etiqueta: "Configurar empresa",
  icono: Settings2,
  roles: ["ADMIN_TENANT", "DIRECTOR", "CONTADOR"],
};

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
    entrada.roles === undefined ||
    (montado && entrada.roles.some((r) => roles.includes(r)));

  // Solo se pide si la persona ve a María: el número es suyo.
  const pendientes = usePendientes(
    montado && ROLES_MARIA.some((r) => roles.includes(r)),
  );
  const hayPendientes = (pendientes?.total ?? 0) > 0;

  // `/dashboard` es exacto; cualquier otra ruta también marca sus hijas.
  const esActiva = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

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
                <SidebarMenu>
                  {visibles.map((entrada) => (
                    <SidebarMenuItem key={entrada.href}>
                      <SidebarMenuButton
                        isActive={esActiva(entrada.href)}
                        tooltip={entrada.etiqueta}
                        render={<Link href={entrada.href} onClick={cerrarEnMovil} />}
                      >
                        {entrada.cara ? (
                          // 20 px, como en la lámina `Aplicada`. Con la barra
                          // plegada el número no entra: la cara pasa a «espera»,
                          // con su distintivo ámbar, para que igual se note.
                          <Maria
                            estado={state === "collapsed" && hayPendientes ? "espera" : "reposo"}
                            tamano={20}
                          />
                        ) : (
                          <entrada.icono
                            className={entrada.acento ? "text-brand" : undefined}
                            fill={entrada.acento ? "currentColor" : "none"}
                          />
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
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {puedeVer(CONFIGURACION) && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={CONFIGURACION.etiqueta}
                render={<Link href={CONFIGURACION.href} onClick={cerrarEnMovil} />}
              >
                <CONFIGURACION.icono />
                <span>{CONFIGURACION.etiqueta}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
