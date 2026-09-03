"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Envoltorio canónico shadcn para un gráfico: CardHeader (título + descripción)
// sobre CardContent. Unifica la estructura de todos los tableros analíticos.
export function ChartCard({
  titulo,
  descripcion,
  children,
  className,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
  className?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{titulo}</CardTitle>
        {descripcion && (
          <CardDescription className="text-xs">{descripcion}</CardDescription>
        )}
        {acciones}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
