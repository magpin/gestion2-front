"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { retencionesApi } from "../services/retenciones.service";

const fecha = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * La residencia fiscal de un proveedor del exterior (plan motor de
 * retenciones, Fase 8, §8.15). Con un certificado vigente y un país con
 * convenio, la compra ofrece la tarifa del convenio. Solo aparece en
 * terceros del exterior.
 */
export function ResidenciaFiscal({ terceroId }: { terceroId: string }) {
  const cliente = useQueryClient();
  const puede = useTieneRol("DIRECTOR", "CONTADOR");
  const [abierto, setAbierto] = useState(false);
  const [pais, setPais] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const clave = ["retenciones", "residencia", terceroId];
  const { data } = useQuery({
    queryKey: clave,
    queryFn: () => retencionesApi.residencia(terceroId),
  });
  const guardar = useMutation({
    mutationFn: () =>
      retencionesApi.nuevaResidencia(terceroId, {
        paisCodigo: pais,
        certificadoDesde: desde,
        certificadoHasta: hasta,
      }),
    onSuccess: async () => {
      aviso.exito("Certificado de residencia guardado");
      setAbierto(false);
      await cliente.invalidateQueries({ queryKey: clave });
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  if (data === undefined || !data.exterior) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Residencia fiscal (convenios)</span>
        {puede && !abierto && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAbierto(true)}
          >
            <Plus className="size-3.5" /> Certificado
          </Button>
        )}
      </div>
      {data.residencias.length === 0 ? (
        <p className="m-0 text-xs text-muted-foreground">
          Sin certificado de residencia: se le retiene la tarifa del Estatuto.
        </p>
      ) : (
        <ul className="m-0 list-none p-0 text-xs text-muted-foreground">
          {data.residencias.map((r) => (
            <li key={r.id}>
              {r.paisNombre ?? r.paisCodigo}: del {fecha(r.certificadoDesde)} al{" "}
              {fecha(r.certificadoHasta)}
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate();
          }}
        >
          <label className="flex flex-col gap-1 text-xs">
            País
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
            >
              <option value="">Elija</option>
              {data.paises.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Cubre desde
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Hasta
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={
              pais === "" || desde === "" || hasta === "" || guardar.isPending
            }
          >
            {guardar.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Guardar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAbierto(false)}
          >
            Cancelar
          </Button>
        </form>
      )}
    </div>
  );
}
