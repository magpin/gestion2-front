import { cn } from "@/lib/utils";

interface PanelProps extends React.ComponentProps<"div"> {
  elevated?: boolean;
}

// Superficie de tarjeta estándar (shadcn card): borde + fondo card + sombra.
export function Panel({ elevated = false, className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm",
        elevated ? "shadow-md" : "shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
