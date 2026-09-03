"use client";

import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCuentaPuc } from "../hooks/usePuc";

interface PucTreeNodeProps {
  codigo: string;
  nombre: string;
  // null = desconocido aún (nodos raíz). El backend dice si es transaccional (hoja).
  transaccional: boolean | null;
  nivel: number;
}

export function PucTreeNode({ codigo, nombre, transaccional, nivel }: PucTreeNodeProps) {
  const [abierto, setAbierto] = useState(false);
  // Reason: solo se consulta el detalle (hijos) cuando el nodo se expande (lazy).
  const { data: cuenta, isLoading, isError } = useCuentaPuc(codigo, abierto);

  const esHoja = transaccional === true;
  const hijos = cuenta?.hijos ?? [];

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
          !esHoja && "cursor-pointer hover:bg-muted",
        )}
        style={{ paddingLeft: `${(nivel - 1) * 16 + 8}px` }}
        onClick={esHoja ? undefined : () => setAbierto((previo) => !previo)}
      >
        {esHoja ? (
          <span className="size-4 shrink-0" />
        ) : (
          <ChevronRight
            size={15}
            strokeWidth={2}
            className={cn(
              "shrink-0 text-muted-foreground/70 transition-transform",
              abierto && "rotate-90",
            )}
          />
        )}
        <span className="font-mono text-xs text-muted-foreground/70">{codigo}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {nombre}
        </span>
        {esHoja && (
          <Badge
            className="border border-success/20 bg-success/15 px-1.5 py-0.5 text-[10px] text-success"
          >
            Transaccional
          </Badge>
        )}
        {isLoading && (
          <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground/70" />
        )}
      </div>

      {abierto && !isLoading && hijos.length > 0 && (
        <ul>
          {hijos
            .slice()
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map((hijo) => (
              <PucTreeNode
                key={hijo.id}
                codigo={hijo.codigo}
                nombre={hijo.nombre}
                transaccional={hijo.transaccional}
                nivel={nivel + 1}
              />
            ))}
        </ul>
      )}

      {abierto && !isLoading && cuenta && hijos.length === 0 && !esHoja && (
        <p
          className="py-1 text-xs italic text-muted-foreground/70"
          style={{ paddingLeft: `${nivel * 16 + 8}px` }}
        >
          Sin subcuentas.
        </p>
      )}

      {abierto && isError && (
        <p
          className="py-1 text-xs text-destructive"
          style={{ paddingLeft: `${nivel * 16 + 8}px` }}
        >
          Error al cargar subcuentas.
        </p>
      )}
    </li>
  );
}
