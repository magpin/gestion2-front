import type { Metadata } from "next";
import { LandingView } from "@/modules/landing/views/LandingView";

// La raíz dejó de ser un `redirect` a /login: ahora es la página pública.
//
// Queda fuera del `matcher` del proxy a propósito (`proxy.ts`), así que se ve
// con sesión y sin ella. Quien ya entró y vuelve acá tiene el botón "Iniciar
// sesión" del nav, y el proxy lo manda al dashboard o a `/empresa`, que entra solo
// según le corresponda: la decisión de a dónde va alguien con sesión vive en un
// solo sitio, y no se duplica acá.
export const metadata: Metadata = {
  title: "ERP Gestión — Contabilidad con María, tu asistente de IA",
  description:
    "María lee tus facturas de compra y los pedidos de tus clientes y te deja cada asiento listo para aprobar. Nada se asienta sin tu aprobación.",
};

export default function Home() {
  return <LandingView />;
}
