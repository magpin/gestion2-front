"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { formatCOP } from "@/lib/utils";
import { retencionesApi } from "../services/retenciones.service";
import { Explicacion } from "./PropuestaRenta";

const DECISION: Record<string, string> = {
  CALCULADA: "Retención calculada por la ley a la fecha de la compra.",
  BAJO_BASE: "Sin retención: la base no llegó al mínimo.",
  NO_SUJETO: "Sin retención: no correspondía.",
  DECIDIDO_SIN: "Registrada sin retención, por decisión de una persona.",
};

/**
 * Por qué una compra lleva la retención que lleva —o ninguna—, con lo que
 * quedó guardado al registrarla (plan motor de retenciones, Fase 1). Las
 * compras de antes del motor no tienen explicación y no muestran nada.
 */
export function PorQueRetencion({
  tipo,
  documentoId,
  decision,
  motivo,
}: {
  tipo: "COMPRA" | "NOTA_CREDITO_COMPRA";
  documentoId: string;
  decision: string | null;
  motivo: string | null;
}) {
  const [abierta, setAbierta] = useState(false);
  const { data: calculadas = [] } = useQuery({
    queryKey: ["retenciones", "documento", tipo, documentoId],
    queryFn: () => retencionesApi.deDocumento(tipo, documentoId),
    enabled: decision !== null || tipo === "NOTA_CREDITO_COMPRA",
  });

  if ((decision === null || decision === "MANUAL") && calculadas.length === 0)
    return null;

  return (
    <div className="rounded-2xl bg-muted/40 px-4 py-3 text-sm">
      {decision !== null && DECISION[decision] && (
        <p className="m-0 font-medium">{DECISION[decision]}</p>
      )}
      {motivo && (
        <p className="m-0 mt-1 text-xs text-muted-foreground">{motivo}</p>
      )}
      {calculadas.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`size-3 transition-transform ${abierta ? "" : "-rotate-90"}`}
            />
            ¿Por qué esta retención?
          </button>
          {abierta && (
            <ul className="m-0 mt-2 flex list-none flex-col gap-3 p-0">
              {calculadas.map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.concepto_nombre}</span> ·{" "}
                  <span className="font-mono">
                    {formatCOP(Number(c.valor))}
                  </span>
                  {c.explicacion.texto && (
                    <span className="block text-xs text-muted-foreground">
                      {c.explicacion.texto}
                    </span>
                  )}
                  {c.explicacion.guardas && <Explicacion e={c.explicacion} />}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
