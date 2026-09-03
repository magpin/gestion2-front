"use client";

import { Card } from "@/components/ui/card";
import type { Tercero } from "../types/terceros.types";

/**
 * Ficha del tercero.
 *
 * Antes eran pestañas de equipos y contratos. Las dos salieron del modelo:
 *
 *   · El equipo ya no es una tabla. Entra en **custodia** —no es un activo de
 *     la empresa— y se guarda como texto en la orden de trabajo. Un equipo del
 *     cliente sin orden abierta no es un dato que el negocio necesite.
 *   · Los contratos son de RRHH, fuera del alcance.
 *
 * Su cartera aparecerá acá cuando exista `tesoreria`.
 */
export function TerceroTabs({ tercero }: { tercero: Tercero }) {
  return (
    <Card className="space-y-4 p-6">
      <h3 className="text-sm font-semibold">Datos de contacto</h3>

      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <Dato label="Documento" valor={`${tercero.tipoDocumento} ${tercero.numeroDocumento}`} />
        <Dato label="Teléfono" valor={tercero.telefono} />
        <Dato label="Email" valor={tercero.email} />
        <Dato label="Dirección" valor={tercero.direccion} />
      </dl>

      <div className="border-t pt-4">
        <h3 className="mb-3 text-sm font-semibold">Qué es</h3>
        <div className="flex flex-wrap gap-2">
          {tercero.esCliente && <Etiqueta>Cliente</Etiqueta>}
          {tercero.esProveedor && <Etiqueta>Proveedor</Etiqueta>}
          {tercero.esAgenteRetenedor && (
            <Etiqueta titulo="Al facturarle nace la línea de retención a favor">
              Agente retenedor
            </Etiqueta>
          )}
          {!tercero.activo && <Etiqueta tono="apagado">Inactivo</Etiqueta>}
        </div>
      </div>
    </Card>
  );
}

function Dato({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{valor?.trim() || "—"}</dd>
    </div>
  );
}

function Etiqueta({
  children,
  titulo,
  tono = "normal",
}: {
  children: React.ReactNode;
  titulo?: string;
  tono?: "normal" | "apagado";
}) {
  return (
    <span
      title={titulo}
      className={
        tono === "apagado"
          ? "text-muted-foreground rounded-full border px-3 py-1 text-xs"
          : "bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium"
      }
    >
      {children}
    </span>
  );
}
