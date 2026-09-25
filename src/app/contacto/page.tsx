import type { Metadata } from "next";
import { ContactoView } from "@/modules/legal/views/ContactoView";

// Página pública: fuera del `matcher` de `proxy.ts`, como la landing.
export const metadata: Metadata = { title: "Contacto — ERP Gestión" };

export default function ContactoPage() {
  return <ContactoView />;
}
