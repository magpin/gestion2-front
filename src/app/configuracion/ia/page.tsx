import { redirect } from "next/navigation";

import { MARIA_PROXIMAMENTE } from "@/modules/asistente/proximamente";
import { ModoIaView } from "@/modules/configuracion/pasos/ModoIaView";

/**
 * El modo IA del asistente de configuración. Carpeta propia y no `[paso]`: no
 * es uno de los cinco pasos, es otra forma de llenarlos.
 *
 * Con María cerrada, a la lista: desde ahí sigue a mano.
 */
export default function ModoIaPage() {
  if (MARIA_PROXIMAMENTE) redirect("/configuracion/lista");
  return <ModoIaView />;
}
