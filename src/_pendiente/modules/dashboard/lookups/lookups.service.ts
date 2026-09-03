import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type { ClienteLookup, CuentaLookup, ProductoLookup, UsuarioLookup } from "./types";

/**
 * Búsquedas ligeras para los pickers de formularios.
 *
 * Reusan los endpoints paginados de `nucleo`, `inventario` y `contabilidad` con
 * los nombres del backend nuevo: `buscar` y `limite`, no `q` y `limit`. El
 * filtro de tipo también cambió: eran `?tipo=CLIENTE`, ahora son dos banderas
 * —`soloClientes` y `soloProveedores`— porque cliente y proveedor son la misma
 * tabla y el mismo NIT puede ser las dos cosas.
 */
export const lookupsService = {
  buscarClientes: (buscar: string) =>
    api
      .get<Paginado<ClienteLookup>>("/terceros", {
        params: { soloClientes: true, buscar, limite: 20 },
      })
      .then((r) => r.data.datos),

  buscarTerceros: (buscar: string) =>
    api
      .get<Paginado<ClienteLookup>>("/terceros", { params: { buscar, limite: 20 } })
      .then((r) => r.data.datos),

  buscarProveedores: (buscar: string) =>
    api
      .get<Paginado<ClienteLookup>>("/terceros", {
        params: { soloProveedores: true, buscar, limite: 20 },
      })
      .then((r) => r.data.datos),

  /** El listado de productos trae `stock` y `costoPromedio` leídos del kardex. */
  buscarProductos: (buscar: string) =>
    api
      .get<Paginado<ProductoLookup>>("/productos", { params: { buscar, limite: 20 } })
      .then((r) => r.data.datos),

  listarUsuarios: () =>
    api
      .get<Paginado<UsuarioLookup>>("/usuarios", { params: { limite: 100 } })
      .then((r) => r.data.datos),

  /**
   * El PUC busca por código o por nombre con el mismo parámetro, y devuelve un
   * arreglo plano: es un catálogo del sistema, no un listado paginado por
   * empresa. Quedarse solo con las transaccionales es cosa de quien lo usa —
   * asentar en una cuenta de grupo lo impide la base, no el picker.
   */
  buscarCuentas: (buscar: string) =>
    api
      .get<CuentaLookup[]>("/contabilidad/puc", {
        params: { buscar: buscar.trim() || undefined },
      })
      .then((r) => r.data),
};
