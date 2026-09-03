import type { FiltroPaginado } from "@/core/types/pagination.types";

// Espejo de `tercero` (backend/src/modules/nucleo/entities/tercero.entity.ts).

export type TipoDocumento = "CC" | "NIT" | "CE" | "PAS";

/**
 * Cliente y proveedor son la MISMA tabla.
 *
 * El mismo NIT puede ser las dos cosas, y duplicarlo produce dos saldos para
 * una sola persona. Por eso los roles son banderas y no tablas separadas — y
 * por eso un tercero sin ninguna de las dos no existe: la base lo rechaza.
 */
export interface Tercero {
  id: string;
  empresaId: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombre: string;
  esCliente: boolean;
  esProveedor: boolean;
  /** Si es true, este cliente le retiene a la empresa al facturarle. */
  esAgenteRetenedor: boolean;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearTerceroPayload {
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombre: string;
  esCliente?: boolean;
  esProveedor?: boolean;
  esAgenteRetenedor?: boolean;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export type ActualizarTerceroPayload = Partial<Omit<CrearTerceroPayload, "tipoDocumento" | "numeroDocumento">> & {
  activo?: boolean;
};

export interface FiltrosTercero extends FiltroPaginado {
  soloClientes?: boolean;
  soloProveedores?: boolean;
  incluirInactivos?: boolean;
}

// Alias con los nombres que ya usa el resto del módulo.
export type CreateTerceroPayload = CrearTerceroPayload;
export type UpdateTerceroPayload = ActualizarTerceroPayload;

/** Los cuatro tipos que admite el CHECK de la base. */
export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "NIT", label: "NIT" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PAS", label: "Pasaporte" },
];

/** Filtro visual de la bandeja. No es lo que viaja al backend. */
export type FiltroTipoTercero = "TODOS" | "CLIENTE" | "PROVEEDOR";
