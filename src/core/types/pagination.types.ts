// Espejo de `PaginadoDto` del backend (backend/src/common/dto/paginacion.dto.ts).

/** Lo que devuelve cualquier listado del backend. */
export interface Paginado<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
}

/** Lo que acepta cualquier listado. */
export interface FiltroPaginado {
  pagina?: number;
  limite?: number;
  /** Texto libre; cada módulo decide sobre qué columnas busca. */
  buscar?: string;
}

/** Cuántas páginas hay. El backend no lo manda: se deriva. */
export function totalPaginas(p: Pick<Paginado<unknown>, "total" | "limite">): number {
  return Math.max(1, Math.ceil(p.total / p.limite));
}
