import { api } from "@/core/api/api";
import type { EstadoConfiguracion } from "../types/configuracion.types";

export const configuracionService = {
  estado: () =>
    api
      .get<EstadoConfiguracion>("/empresas/actual/estado-configuracion")
      .then((r) => r.data),
};
