"use client";

import { createContext, useContext } from "react";

/**
 * Un paso del asistente dibujado **dentro del chat del modo IA**, no en su
 * pantalla. Ahí el marco no pone riel ni navegación —ni «Atrás», ni «Omitir»,
 * ni ir al paso siguiente—: el chat decide qué sigue. Y los pasos no navegan al
 * guardar, porque eso sacaba del modo IA.
 */
const ModoEmbebido = createContext(false);

export const ModoEmbebidoProvider = ModoEmbebido.Provider;

export function useEmbebido(): boolean {
  return useContext(ModoEmbebido);
}
