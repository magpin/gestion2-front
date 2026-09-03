"use client";

import { useEffect, useState } from "react";
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DataTableProps<TDato> {
  columns: ColumnDef<TDato, unknown>[];
  data: TDato[];
  isLoading?: boolean;
  isError?: boolean;
  onReintentar?: () => void;
  onRowClick?: (fila: TDato) => void;
  enableSeleccion?: boolean;
  onSeleccionChange?: (filas: TDato[]) => void;
  // Inmutable tras el primer render (se aplica vía initialState de TanStack Table).
  pageSize?: number;
  mensajeVacio?: string;
  /**
   * Los filtros de ESTA tabla, dentro de su mismo bloque.
   *
   * Van acá y no sueltos en la página para que se lean como lo que son —los
   * controles de esta tabla— en vez de como unos botones que flotan encima. Se
   * pintan también cuando no hay resultados: si desaparecieran, no habría cómo
   * deshacer el filtro que dejó la tabla vacía.
   */
  barra?: ReactNode;
  /**
   * Las pestañas del módulo, DENTRO del bloque de la tabla.
   *
   * Sueltas bajo el título quedaban flotando entre el encabezado y la tabla; acá
   * encabezan el bloque que gobiernan, como en el panel de proceso de Ventas.
   * Se pasan con `linea={false}`: el bloque ya cierra con su propio borde.
   */
  pestanas?: ReactNode;
  /**
   * Las acciones del módulo, a la derecha de las pestañas.
   *
   * Van arriba y no en la barra de filtros porque no son un filtro: gobiernan
   * la tabla entera, igual que «Cobrar» en el panel de Venta. Abajo quedan solo
   * los filtros, que es lo único que acota la lista.
   */
  acciones?: ReactNode;
  /**
   * El pie de la tabla: los totales de lo que se está viendo.
   *
   * Recibe el `<tr>` completo con sus `<td>`, para que cada cifra caiga bajo su
   * columna — un total que no está debajo de la columna que suma obliga a
   * contar celdas con el dedo.
   *
   * Es la forma de un libro auxiliar: los totales cierran abajo, al final del
   * recorrido, y cuadran con el filtro que esté puesto.
   */
  pie?: ReactNode;
}

// DataTable — TanStack Table v8, sin bordes de celda,
// con sort por columna, paginación y selección múltiple opcional.
export function DataTable<TDato>({
  columns,
  data,
  isLoading = false,
  isError = false,
  onReintentar,
  onRowClick,
  enableSeleccion = false,
  onSeleccionChange,
  pageSize = 10,
  mensajeVacio = "No hay registros para mostrar",
  barra,
  pestanas,
  acciones,
  pie,
}: DataTableProps<TDato>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Reason: TanStack Table devuelve funciones que el React Compiler no puede memoizar; uso seguro aquí.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabla = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: enableSeleccion,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  // Reason: propagar la selección DESPUÉS del commit; dentro del updater `tabla` aún refleja el estado previo.
  useEffect(() => {
    if (!onSeleccionChange) {
      return;
    }
    onSeleccionChange(tabla.getSelectedRowModel().rows.map((fila) => fila.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  /* Pestañas y filtros encabezan el bloque, en ese orden: primero qué lista se
     está viendo, después cómo se acota. */
  const cabecera = (
    <>
      {(pestanas || acciones) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 pt-3">
          {pestanas}
          {acciones && <div className="flex items-center gap-2 pb-3">{acciones}</div>}
        </div>
      )}
      {barra && <div className="border-b border-border px-5 py-4">{barra}</div>}
    </>
  );

  /* Envuelve cualquiera de los estados con la cabecera, para que las pestañas y
     los filtros no desaparezcan justo cuando hacen falta. */
  const conBarra = (contenido: ReactNode) =>
    barra || pestanas || acciones ? (
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {cabecera}
        {contenido}
      </div>
    ) : (
      <>{contenido}</>
    );

  const enBloque = Boolean(barra || pestanas || acciones);

  if (isLoading) {
    return conBarra(<SkeletonTable columnas={columns.length} sinMarco={enBloque} />);
  }

  if (isError) {
    return conBarra(
      <EmptyState
        titulo="No se pudieron cargar los datos"
        descripcion="Ocurrió un error al consultar la información."
        accion={onReintentar ? { label: "Reintentar", onClick: onReintentar } : undefined}
        sinMarco={enBloque}
      />,
    );
  }

  if (data.length === 0) {
    return conBarra(
      <EmptyState titulo="Sin resultados" descripcion={mensajeVacio} sinMarco={enBloque} />,
    );
  }

  const totalPaginas = tabla.getPageCount();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {cabecera}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {tabla.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id} className="border-b border-border bg-muted/40">
                {grupo.headers.map((header) => {
                  const puedeOrdenar = header.column.getCanSort();
                  const direccion = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : puedeOrdenar ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 transition-colors hover:text-muted-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {direccion === "asc" ? (
                            <ChevronUp size={13} strokeWidth={2} />
                          ) : direccion === "desc" ? (
                            <ChevronDown size={13} strokeWidth={2} />
                          ) : (
                            <ChevronsUpDown size={13} strokeWidth={2} className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tabla.getRowModel().rows.map((fila) => (
              <tr
                key={fila.id}
                onClick={onRowClick ? () => onRowClick(fila.original) : undefined}
                className={cn(
                  "border-b border-border transition-colors last:border-0 hover:bg-muted/50",
                  onRowClick && "cursor-pointer",
                  fila.getIsSelected() && "bg-primary/10",
                )}
              >
                {fila.getVisibleCells().map((celda) => (
                  <td key={celda.id} className="px-5 py-4 text-foreground">
                    {flexRender(celda.column.columnDef.cell, celda.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {pie && (
            <tfoot className="border-t-2 border-border bg-muted font-semibold [&_td]:px-5 [&_td]:py-4">
              {pie}
            </tfoot>
          )}
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Página {tabla.getState().pagination.pageIndex + 1} de {totalPaginas}
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => tabla.previousPage()}
              disabled={!tabla.getCanPreviousPage()}
              aria-label="Página anterior"
              className="size-8 p-0"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </Button>
            <Button
              onClick={() => tabla.nextPage()}
              disabled={!tabla.getCanNextPage()}
              aria-label="Página siguiente"
              className="size-8 p-0"
            >
              <ChevronRight size={16} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
