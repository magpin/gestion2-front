import { cookies } from "next/headers";

import { AnunciosPlataforma } from "@/components/layout/AnunciosPlataforma";
import { BarraLateral } from "@/components/layout/BarraLateral";
import { BarraSuperior } from "@/components/layout/BarraSuperior";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Armazón del área de trabajo: la barra lateral con los módulos, y a la
 * derecha la barra superior con la empresa y el contenido.
 *
 * Es un componente de servidor a propósito: lee la cookie que dice si la
 * barra estaba abierta o colapsada, y así el primer HTML ya sale con el ancho
 * correcto en vez de abrirse y cerrarse al hidratar.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  // Sin cookie —primera visita— la barra va abierta: el mapa del sistema se
  // muestra antes de que alguien decida que no lo necesita.
  const abierta = jar.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={abierta}>
      <BarraLateral />
      <SidebarInset className="min-w-0">
        <BarraSuperior />
        <AnunciosPlataforma />
        <div className="min-w-0 flex-1 px-4 py-7 md:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
