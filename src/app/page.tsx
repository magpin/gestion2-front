import type { Metadata } from "next";
import { LandingView } from "@/modules/landing/views/LandingView";

// La raíz dejó de ser un `redirect` a /login: ahora es la página pública.
//
// Queda fuera del `matcher` del proxy a propósito (`proxy.ts`), así que se ve
// con sesión y sin ella. Quien ya entró y vuelve acá tiene el botón "Iniciar
// sesión" del nav, y el proxy lo manda al dashboard o al selector de empresa
// según le corresponda: la decisión de a dónde va alguien con sesión vive en un
// solo sitio, y no se duplica acá.
export const metadata: Metadata = {
  title: "ERP Gestión — Contabilidad auditada por IA",
  description:
    "Registra compras y ventas, aplica el PUC y genera cada asiento de forma automática. Una IA revisa todo antes de que llegue a tus libros.",
};

export default function Home() {
  return <LandingView />;
}
