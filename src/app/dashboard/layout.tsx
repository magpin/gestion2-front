"use client";

import { BarraSuperior } from "@/components/layout/BarraSuperior";

/**
 * Armazón del área de trabajo.
 *
 * Provisional a propósito: la navegación por procesos vuelve cuando existan los
 * módulos que la llenaban —ventas, compras, inventario—. Hoy el sistema solo
 * tiene núcleo, y un menú con seis puertas cerradas es peor que no tenerlo.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior />
      <main className="min-w-0 flex-1 px-4 py-7 md:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
