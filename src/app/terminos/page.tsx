import type { Metadata } from "next";
import { TerminosView } from "@/modules/legal/views/TerminosView";

// Página pública: fuera del `matcher` de `proxy.ts`, como la landing.
export const metadata: Metadata = { title: "Términos y condiciones — ERP Gestión" };

export default function TerminosPage() {
  return <TerminosView />;
}
