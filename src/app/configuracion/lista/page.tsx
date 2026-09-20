import { ConfiguracionListaView } from "@/modules/configuracion/pasos/ConfiguracionListaView";

// El cierre del asistente. Queda fuera de `[paso]` a propósito: no es un paso
// —no tiene estado en `estado-configuracion`, no se puede omitir y no enlaza al
// siguiente—, es lo que se ve cuando ya no quedan.
export default function ConfiguracionListaPage() {
  return <ConfiguracionListaView />;
}
