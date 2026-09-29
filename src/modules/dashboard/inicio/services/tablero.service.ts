import { api } from "@/core/api/api";
import type { Tablero } from "../types/tablero.types";

export const tableroApi = {
  /** Todo el tablero de la plata en una sola llamada. */
  plata: () => api.get<Tablero>("/tablero/plata").then((r) => r.data),
};
