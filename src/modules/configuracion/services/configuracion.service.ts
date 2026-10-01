import { api } from "@/core/api/api";
import type { EstadoConfiguracion } from "../types/configuracion.types";

export const configuracionService = {
  estado: () =>
    api
      .get<EstadoConfiguracion>("/empresas/actual/estado-configuracion")
      .then((r) => r.data),

  /**
   * Con qué modo se configura la empresa. IA no se abandona hasta terminar: el
   * backend rechaza volver a manual a mitad.
   */
  elegirModo: (modo: "IA" | "MANUAL") =>
    api.post("/empresas/actual/modo-configuracion", { modo }).then(() => undefined),

  /**
   * La bienvenida de María se mostró: de ahí en adelante se entra directo al
   * tablero. El backend solo la marca la primera vez.
   */
  marcarBienvenidaVista: () =>
    api.post("/empresas/actual/bienvenida-vista").then(() => undefined),
};
