import { BienvenidaView } from "@/modules/configuracion/pasos/BienvenidaView";

// La entrada al asistente. Queda fuera de `[paso]` como `lista/`: no es un
// paso —no tiene estado en `estado-configuracion` ni se puede omitir—, es lo
// que se ve antes de que exista el primero.
export default function BienvenidaPage() {
  return <BienvenidaView />;
}
