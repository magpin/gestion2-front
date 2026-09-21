import type {
  ConversacionEnLista,
  EventoConversacion,
} from "../types/conversacion.types";

/**
 * Parte lo que llegó del flujo en eventos completos. Un evento termina en
 * línea vacía; lo que quede a medias vuelve como `resto` y espera al trozo
 * siguiente —cortar un JSON por la mitad es lo que hace que un flujo parezca
 * roto cuando no lo está—. Un evento que no parsea se descarta.
 */
export function partirEventos(pendiente: string): {
  eventos: EventoConversacion[];
  resto: string;
} {
  const bloques = pendiente.split("\n\n");
  const resto = bloques.pop() ?? "";
  const eventos: EventoConversacion[] = [];
  for (const bloque of bloques) {
    const datos = bloque
      .split("\n")
      .filter((linea) => linea.startsWith("data:"))
      .map((linea) => linea.slice(5).trim())
      .join("");
    if (datos === "") continue;
    try {
      eventos.push(JSON.parse(datos) as EventoConversacion);
    } catch {
      // El turno queda guardado en la base igual; al terminar se relee.
    }
  }
  return { eventos, resto };
}

export interface GrupoDeConversaciones {
  rotulo: string;
  conversaciones: ConversacionEnLista[];
}

/**
 * Las conversaciones agrupadas por su último movimiento, como el prototipo:
 * «Hoy», «Ayer», «Esta semana» (los siete días anteriores) y «Antes». Los
 * grupos vacíos no aparecen. Se cuenta en días de calendario locales, no en
 * horas: una charla de anoche a las 23:50 es de ayer.
 */
export function agruparPorFecha(
  conversaciones: readonly ConversacionEnLista[],
  ahora: Date,
): GrupoDeConversaciones[] {
  const dia = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  const hoy = dia(ahora);
  const rotulos = ["Hoy", "Ayer", "Esta semana", "Antes"] as const;
  const grupos = new Map<string, ConversacionEnLista[]>(
    rotulos.map((r) => [r, []]),
  );
  for (const c of conversaciones) {
    const hace = hoy - dia(new Date(c.ultima_en));
    const rotulo =
      hace <= 0 ? "Hoy" : hace === 1 ? "Ayer" : hace <= 7 ? "Esta semana" : "Antes";
    grupos.get(rotulo)?.push(c);
  }
  return rotulos
    .map((rotulo) => ({ rotulo, conversaciones: grupos.get(rotulo) ?? [] }))
    .filter((g) => g.conversaciones.length > 0);
}

/** «3 preguntas · 14:05» para hoy; «3 preguntas · 12 sep» para otro día. */
export function detalleDeConversacion(
  c: ConversacionEnLista,
  ahora: Date,
): string {
  const fecha = new Date(c.ultima_en);
  const mismoDia = fecha.toDateString() === ahora.toDateString();
  const cuando = mismoDia
    ? fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false })
    : // Sin el «de» que pone es-CO: «12 sept», no «12 de sept».
      `${fecha.getDate()} ${fecha.toLocaleDateString("es-CO", { month: "short" }).replace(".", "")}`;
  return `${c.preguntas} ${c.preguntas === 1 ? "pregunta" : "preguntas"} · ${cuando}`;
}
