import type { Metadata } from "next";

import { CromoPlataforma } from "@/modules/plataforma/components/CromoPlataforma";

/**
 * La consola del superadministrador. Un solo marco para todas sus pantallas:
 * el riel oscuro dice siempre que acá se administra el producto, no una
 * contabilidad.
 */
export const metadata: Metadata = {
  title: "Administración · ERP Gestión",
  robots: { index: false, follow: false },
};

export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  return <CromoPlataforma>{children}</CromoPlataforma>;
}
