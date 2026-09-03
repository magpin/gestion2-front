import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  filas?: number;
  columnas?: number;
  /** Ya vive dentro de un bloque con borde: sin marco propio, para no anidar dos. */
  sinMarco?: boolean;
}

export function SkeletonTable({
  filas = 6,
  columnas = 5,
  sinMarco = false,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        "space-y-3 p-4",
        !sinMarco && "rounded-2xl border border-border bg-card shadow-sm",
      )}
    >
      {Array.from({ length: filas }).map((_fila, indiceFila) => (
        <div key={indiceFila} className="flex gap-3">
          {Array.from({ length: columnas }).map((_col, indiceCol) => (
            <Skeleton key={indiceCol} className="h-8 flex-1 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}
