"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { retencionesApi } from "../services/retenciones.service";
import type { DiferenciaRecalculo } from "../types/retenciones.types";

const CLAVE = ["retenciones", "diferencias"];

const ESTADO: Record<DiferenciaRecalculo["estado"], string> = {
  PENDIENTE: "Pendiente",
  AJUSTADA: "Ajustada",
  DESCARTADA: "Descartada",
};

/**
 * Lo que cambió cuando la plataforma recalculó con una norma nueva (plan motor
 * de retenciones, Fase 6, §6.3). Nada se corrige solo (R-D6): quien responde
 * por la declaración mira el asiento y lo aprueba, o dice por qué no.
 *
 * No aparece si nunca hubo un recálculo que tocara a la empresa.
 */
export function DiferenciasRecalculo() {
  const { data: filas = [] } = useQuery({
    queryKey: CLAVE,
    queryFn: retencionesApi.diferencias,
  });
  if (filas.length === 0) return null;
  const pendientes = filas.filter((f) => f.estado === "PENDIENTE").length;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-semibold">
          Diferencias por cambio de norma
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendientes === 0 ? "Nada pendiente." : `${pendientes} por revisar.`}{" "}
          Cuando la ley cambia, recalculo sus compras y sus autorretenciones con
          la norma nueva y le muestro lo que cambió. Los asientos que ya hizo
          no se tocan: cada diferencia se corrige con un ajuste que usted aprueba.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {filas.map((f) => (
          <FilaDiferencia key={f.id} fila={f} />
        ))}
      </ul>
    </section>
  );
}

function FilaDiferencia({ fila }: { fila: DiferenciaRecalculo }) {
  const cliente = useQueryClient();
  const [abierta, setAbierta] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const pendiente = fila.estado === "PENDIENTE";
  const diferencia = Number(fila.diferencia);

  const ajuste = useQuery({
    queryKey: [...CLAVE, fila.id, "ajuste"],
    queryFn: () => retencionesApi.verAjuste(fila.id),
    enabled: abierta && pendiente,
  });
  const refrescar = () => cliente.invalidateQueries({ queryKey: CLAVE });
  const registrar = useMutation({
    mutationFn: () => retencionesApi.registrarAjuste(fila.id),
    onSuccess: async (r) => {
      aviso.exito(`Ajuste registrado: ${r.asiento}.`);
      await refrescar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });
  const descartar = useMutation({
    mutationFn: () => retencionesApi.descartarDiferencia(fila.id, motivo),
    onSuccess: async () => {
      aviso.exito("Listo: queda descartada con su motivo.");
      await refrescar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <li className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {fila.tercero}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {fila.documentoTipo === "VENTA" ? "venta" : "compra"}{" "}
              {fila.documento ?? "—"} · {fila.concepto}
              {fila.municipio ? ` · ${fila.municipio}` : ""}
            </span>
          </p>
          <p className="mt-1 text-sm">{fila.texto}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Por: {fila.norma}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-muted-foreground">
            {formatCOP(Number(fila.valorAntes))} →{" "}
            {formatCOP(Number(fila.valorNuevo))}
          </p>
          <p
            className={`font-mono text-lg font-semibold ${diferencia > 0 ? "text-destructive" : ""}`}
          >
            {diferencia > 0 ? "+" : ""}
            {formatCOP(diferencia)}
          </p>
          <p className="text-xs text-muted-foreground">
            {ESTADO[fila.estado]}
            {fila.asiento ? ` · ${fila.asiento}` : ""}
            {fila.estado === "DESCARTADA" && fila.motivo
              ? ` · ${fila.motivo}`
              : ""}
          </p>
        </div>
      </div>

      {pendiente && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAbierta((a) => !a)}
          >
            {abierta ? "Ocultar ajuste" : "Ver ajuste"}
          </Button>
          {!descartando && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDescartando(true)}
            >
              No ajustar
            </Button>
          )}
        </div>
      )}

      {pendiente && abierta && (
        <div className="mt-4 rounded-2xl border border-border p-4">
          {ajuste.isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-label="Cargando" />
          ) : ajuste.isError ? (
            <p className="text-sm text-destructive">
              No pude armar el ajuste. {String((ajuste.error as Error).message)}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {diferencia > 0
                  ? "Se retuvo de menos: le paga menos al proveedor y la diferencia va a la retención por pagar."
                  : "Se retuvo de más: se le debe al proveedor y baja la retención por pagar."}{" "}
                El asiento va con fecha de hoy.
              </p>
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="py-1">Cuenta</th>
                    <th className="py-1 text-right">Débito</th>
                    <th className="py-1 text-right">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {ajuste.data?.lineas.map((l) => (
                    <tr key={l.codigo + l.debito}>
                      <td className="py-1">
                        <span className="font-mono">{l.codigo}</span> {l.cuenta}
                      </td>
                      <td className="py-1 text-right font-mono">
                        {l.debito ? formatCOP(l.debito) : ""}
                      </td>
                      <td className="py-1 text-right font-mono">
                        {l.credito ? formatCOP(l.credito) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button
                type="button"
                className="mt-4"
                disabled={registrar.isPending}
                onClick={() => registrar.mutate()}
              >
                {registrar.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Registrar ajuste
              </Button>
            </>
          )}
        </div>
      )}

      {pendiente && descartando && (
        <form
          className="mt-4 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            descartar.mutate();
          }}
        >
          <Input
            className="max-w-md"
            placeholder="Por qué no se ajusta"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            autoFocus
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={motivo.trim().length === 0 || descartar.isPending}
          >
            Descartar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDescartando(false)}
          >
            Cancelar
          </Button>
        </form>
      )}
    </li>
  );
}
