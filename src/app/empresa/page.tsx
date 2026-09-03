import { SelectorEmpresaView } from "@/modules/auth/views/SelectorEmpresaView";

/**
 * Paso 2 de la entrada. Es una ruta propia y no un modal del login porque se
 * vuelve a ella: un contador cambia de contabilidad varias veces al día sin
 * cerrar sesión.
 */
export default function EmpresaPage() {
  return <SelectorEmpresaView />;
}
