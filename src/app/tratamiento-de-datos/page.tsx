import type { Metadata } from "next";
import { TratamientoDatosView } from "@/modules/legal/views/TratamientoDatosView";

// Página pública: fuera del `matcher` de `proxy.ts`, como la landing.
export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales — ERP Gestión",
};

export default function TratamientoDatosPage() {
  return <TratamientoDatosView />;
}
