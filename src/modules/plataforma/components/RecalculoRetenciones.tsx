"use client";

import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { plataformaService } from "../services/plataforma.service";
import { Mono, Tarjeta, Td, Th } from "./piezas";

const CLAVE = ["plataforma", "retenciones", "recalculos"];

const ESTADO: Record<string, string> = {
  PENDIENTE: "Pendiente",
  AJUSTADA: "Ajustada",
  DESCARTADA: "Descartada",
};

/**
 * Recalcular por cambio de norma (plan motor de retenciones, Fase 6, §6.3).
 *
 * Primero se carga la vigencia nueva de la tarifa; después se recalcula el
 * rango que afecta. Cada compra se vuelve a calcular con la misma entrada y
 * el mismo concepto, con la ley que rige hoy para su fecha. No toca asientos:
 * cada empresa ve sus diferencias y las ajusta una persona (R-D6).
 */
export function RecalculoRetenciones() {
  const cliente = useQueryClient();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const recalculos = useQuery({
    queryKey: CLAVE,
    queryFn: plataformaService.recalculos,
  });
  const recalcular = useMutation({
    mutationFn: () =>
      plataformaService.recalcularRetenciones({
        desde,
        hasta,
        motivo: motivo.trim(),
      }),
    onSuccess: async (r) => {
      aviso.exito(
        r.diferencias === 0
          ? "Recalculado: no cambió nada."
          : `Recalculado: ${r.diferencias} diferencias en ${r.empresas} empresas.`,
        `${r.documentos} compras recalculadas${r.sinEntrada > 0 ? ` · ${r.sinEntrada} sin entrada guardada` : ""}${r.conError > 0 ? ` · ${r.conError} empresas con error` : ""}.`,
      );
      setAbierto(r.id);
      await cliente.invalidateQueries({ queryKey: CLAVE });
    },
    onError: (e: unknown) => aviso.falla(e),
  });
  const listo =
    desde !== "" && hasta !== "" && hasta >= desde && motivo.trim().length >= 3;

  return (
    <Tarjeta titulo="Recalcular por cambio de norma">
      <p className="mb-4 text-xs text-muted-foreground">
        Después de cargar la vigencia nueva, recalculá el rango que afecta. Se
        vuelve a correr el motor con la misma entrada y el mismo concepto de
        cada compra. No se toca ningún asiento: cada empresa ve sus diferencias
        en Contabilidad → Retenciones y las ajusta una persona.
      </p>
      <form
        className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,160px))_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          recalcular.mutate();
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Desde</span>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Hasta</span>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Norma que cambió</span>
          <Input
            placeholder="Sentencia del Consejo de Estado sobre el Decreto 572"
            value={motivo}
            maxLength={300}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={!listo || recalcular.isPending}>
          {recalcular.isPending && <Loader2 className="size-4 animate-spin" />}
          Recalcular
        </Button>
      </form>

      <div className="mt-6 overflow-x-auto">
        {(recalculos.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no se ha recalculado nada.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr>
                <Th>Cuándo</Th>
                <Th>Rango</Th>
                <Th>Norma</Th>
                <Th derecha>Compras</Th>
                <Th derecha>Diferencias</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {(recalculos.data ?? []).map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <Td>
                      <Mono>{r.creadoEn.slice(0, 16).replace("T", " ")}</Mono>
                    </Td>
                    <Td>
                      <Mono>
                        {r.desde} → {r.hasta}
                      </Mono>
                      {r.empresa && (
                        <span className="block text-xs text-muted-foreground">
                          {r.empresa}
                        </span>
                      )}
                    </Td>
                    <Td className="text-sm">{r.motivo}</Td>
                    <Td derecha>
                      <Mono>{r.resumen.documentos ?? 0}</Mono>
                    </Td>
                    <Td derecha>
                      <Mono>{r.resumen.diferencias ?? 0}</Mono>
                    </Td>
                    <Td derecha>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAbierto(abierto === r.id ? null : r.id)
                        }
                        aria-expanded={abierto === r.id}
                      >
                        Ver
                        <ChevronDown
                          className={`size-4 transition-transform ${abierto === r.id ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </Td>
                  </tr>
                  {abierto === r.id && (
                    <tr>
                      <td colSpan={6} className="bg-muted/30 px-4 py-4">
                        <DetalleRecalculo id={r.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Tarjeta>
  );
}

function DetalleRecalculo({ id }: { id: string }) {
  const detalle = useQuery({
    queryKey: [...CLAVE, id],
    queryFn: () => plataformaService.recalculo(id),
  });
  if (detalle.isPending) {
    return <Loader2 className="size-4 animate-spin" aria-label="Cargando" />;
  }
  if (detalle.isError || !detalle.data) {
    return (
      <p className="text-sm text-destructive">No pude cargar el reporte.</p>
    );
  }
  const { resumen, diferencias } = detalle.data;
  const conProblemas = (resumen.porEmpresa ?? []).filter(
    (e) => e.error !== undefined || (e.sinCalcular ?? []).length > 0,
  );

  return (
    <div className="space-y-4">
      {conProblemas.map((e) => (
        <p key={e.empresaId} className="text-sm text-destructive">
          <strong>{e.empresa}:</strong>{" "}
          {e.error ??
            `no se pudo recalcular ${(e.sinCalcular ?? []).join(" · ")}`}
        </p>
      ))}
      {diferencias.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguna compra cambió con la norma nueva.
        </p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <Th>Empresa</Th>
              <Th>Compra</Th>
              <Th>Concepto</Th>
              <Th derecha>Antes</Th>
              <Th derecha>Ahora</Th>
              <Th derecha>Diferencia</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {diferencias.map((d) => (
              <tr key={d.id} title={d.texto ?? undefined}>
                <Td className="text-sm">{d.empresa}</Td>
                <Td>
                  <Mono>{d.documento ?? "—"}</Mono>
                  <span className="block text-xs text-muted-foreground">
                    {d.fecha}
                  </span>
                </Td>
                <Td className="text-sm">
                  {d.concepto}
                  {d.municipio ? ` · ${d.municipio}` : ""}
                </Td>
                <Td derecha>
                  <Mono>{formatCOP(Number(d.valorAntes))}</Mono>
                </Td>
                <Td derecha>
                  <Mono>{formatCOP(Number(d.valorNuevo))}</Mono>
                </Td>
                <Td derecha>
                  <Mono>{formatCOP(Number(d.diferencia))}</Mono>
                </Td>
                <Td className="text-xs">
                  {ESTADO[d.estado] ?? d.estado}
                  {d.motivo ? ` · ${d.motivo}` : ""}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
