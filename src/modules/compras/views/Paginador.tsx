"use client";

import { Button } from "@/components/ui/button";

/**
 * El paginador de las listas de Compras. Vivía dentro de `ComprasView`, que
 * era la única lista del módulo; con las dos de notas pasaron a ser tres y
 * copiarlo una tercera vez no tenía defensa.
 */
export function Paginador({
  pagina,
  tamano,
  total,
  alCambiar,
}: {
  pagina: number;
  tamano: number;
  total: number;
  alCambiar: (p: number) => void;
}) {
  const paginas = tamano > 0 ? Math.ceil(total / tamano) : 1;
  if (paginas <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
      <p className="text-sm text-muted-foreground">
        {(pagina - 1) * tamano + 1}–{Math.min(pagina * tamano, total)} de{" "}
        {total}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          disabled={pagina <= 1}
          onClick={() => alCambiar(pagina - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          {pagina} de {paginas}
        </span>
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          disabled={pagina >= paginas}
          onClick={() => alCambiar(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
