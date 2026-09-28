"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Info,
  Package,
  ReceiptText,
  Search,
  TrendingUp,
} from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { DialogoConcepto } from "../components/DialogoConcepto";
import { agruparConceptos } from "../lib/agrupar";
import { conceptosApi } from "../services/conceptos.service";
import {
  NOMBRE_FLUJO,
  NOMBRE_TIPO,
  type Concepto,
  type TipoConcepto,
} from "../types/conceptos.types";

const PESTANAS: Array<[TipoConcepto, typeof TrendingUp]> = [
  ["INGRESO", TrendingUp],
  ["COSTO", Package],
  ["GASTO", ReceiptText],
  ["NO_GASTO", ArrowLeftRight],
];

/**
 * Contabilidad → Conceptos: lo que se elige al registrar un ingreso o un gasto
 * en vez de una cuenta. Cada concepto ya sabe a qué auxiliar va, si toca el
 * resultado y en qué parte del flujo de caja cae.
 *
 * Al abrir la pantalla se siembra el catálogo inicial si falta (una vez por
 * visita, como la preparación de Tesorería): una empresa que ya existía antes
 * de los conceptos los recibe sin hacer nada.
 */
export function ConceptosView() {
  const queryClient = useQueryClient();
  const puedeEditar = useTieneRol("DIRECTOR", "CONTADOR");

  const [tipo, setTipo] = useState<TipoConcepto>("GASTO");
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [editando, setEditando] = useState<Concepto | null>(null);
  const [creando, setCreando] = useState(false);

  const preparado = useRef(false);
  const preparar = useMutation({
    mutationFn: conceptosApi.preparar,
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ["conceptos"] });
      if (r.creados > 0) {
        aviso.exito(
          `Se cargaron ${r.creados} conceptos`,
          r.cuentasCreadas.length > 0
            ? `Y se crearon ${r.cuentasCreadas.length} cuentas en el plan.`
            : undefined,
        );
      }
    },
    // Sin aviso de error: la lista se sigue viendo con lo que haya.
  });
  useEffect(() => {
    if (!puedeEditar || preparado.current) return;
    preparado.current = true;
    preparar.mutate();
  }, [puedeEditar, preparar]);

  const { data: conceptos = [], isLoading } = useQuery({
    queryKey: ["conceptos", verInactivos],
    queryFn: () => conceptosApi.listar({ incluirInactivos: verInactivos }),
  });

  const cambiarActivo = useMutation({
    mutationFn: (c: Concepto) => conceptosApi.editar(c.id, { activo: !c.activo }),
    onSuccess: async (c) => {
      await queryClient.invalidateQueries({ queryKey: ["conceptos"] });
      aviso.exito(c.activo ? "Concepto activado" : "Concepto desactivado");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const delTipo = conceptos.filter((c) => c.tipo === tipo);
  const grupos = agruparConceptos(delTipo, busqueda);
  const sinCuenta = conceptos.filter((c) => c.activo && c.cuenta === null).length;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Contabilidad
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Conceptos<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lo que se elige al registrar un ingreso o un gasto. Cada concepto ya sabe a qué cuenta va.
          </p>
        </div>
        {puedeEditar && <BotonNuevo etiqueta="Nuevo concepto" onClick={() => setCreando(true)} />}
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {PESTANAS.map(([t, Icono]) => (
          <button
            key={t}
            type="button"
            aria-current={tipo === t ? "page" : undefined}
            onClick={() => setTipo(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              tipo === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {NOMBRE_TIPO[t]}
            <span className="font-mono text-xs opacity-70">
              {conceptos.filter((c) => c.tipo === t).length}
            </span>
          </button>
        ))}
      </nav>

      <p className="mb-5 flex items-start gap-2 rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        Al cobrar, pagar o registrar un gasto se elige un concepto, nunca una cuenta. La cuenta libre
        solo queda en el comprobante manual del Libro.
      </p>

      {sinCuenta > 0 && (
        <p className="mb-5 rounded-2xl border border-warning/30 bg-warning/15 px-4 py-3 text-sm">
          {sinCuenta === 1 ? "Un concepto no tiene" : `${sinCuenta} conceptos no tienen`} cuenta: la
          empresa abrió varios auxiliares donde podría ir y hay que elegir uno. Mientras tanto no se
          puede usar.
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por concepto o código de cuenta"
            aria-label="Buscar concepto"
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
            className="size-4 accent-primary"
          />
          Ver inactivos
        </label>
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : grupos.length === 0 ? (
        <EmptyState
          titulo={busqueda ? "Nada coincide" : `Sin conceptos de ${NOMBRE_TIPO[tipo].toLowerCase()}`}
          descripcion={
            busqueda
              ? "Probá con otra palabra o con el código de la cuenta."
              : puedeEditar
                ? "Creá uno con «Nuevo concepto»."
                : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3">Concepto</th>
                <th className="px-5 py-3">Va a la cuenta</th>
                <th className="px-5 py-3">{tipo === "NO_GASTO" ? "Flujo de caja" : "Naturaleza"}</th>
                <th className="px-5 py-3 text-right">Usos</th>
                {puedeEditar && <th className="px-5 py-3" />}
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.grupo}>
                <tr className="bg-muted/60">
                  <td
                    colSpan={puedeEditar ? 5 : 4}
                    className="px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {g.grupo}
                  </td>
                </tr>
                {g.conceptos.map((c) => (
                  <tr key={c.id} className={`border-t border-border ${c.activo ? "" : "text-muted-foreground"}`}>
                    <td className="px-5 py-3">
                      <span className="font-semibold">{c.nombre}</span>
                      {c.automatico && (
                        <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
                          Automático
                        </span>
                      )}
                      {!c.activo && (
                        <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {c.cuenta ? (
                        <>
                          <span className="font-mono text-xs text-muted-foreground">{c.cuenta.codigo}</span>{" "}
                          {c.cuenta.nombre}
                        </>
                      ) : (
                        <span className="rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-medium">
                          Falta elegir la cuenta
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {tipo === "NO_GASTO"
                        ? NOMBRE_FLUJO[c.tipoFlujo]
                        : c.operacional === null
                          ? "—"
                          : c.operacional
                            ? "Operacional"
                            : "No operacional"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{c.usos}</td>
                    {puedeEditar && (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-lg px-3"
                            onClick={() => setEditando(c)}
                          >
                            {c.cuenta === null ? "Elegir cuenta" : "Editar"}
                          </Button>
                          {/* Los automáticos los usa el sistema: apagarlos
                              dejaría al 4×1000 o a un anticipo sin cuenta. */}
                          {!c.automatico && (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-lg px-3"
                              disabled={cambiarActivo.isPending}
                              onClick={() => cambiarActivo.mutate(c)}
                            >
                              {c.activo ? "Desactivar" : "Activar"}
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <p className="mt-5 text-xs text-muted-foreground">
        Los conceptos no se borran: se desactivan, y lo que ya se registró con ellos sigue igual.
      </p>

      <DialogoConcepto
        abierto={creando || editando !== null}
        concepto={editando}
        tipoInicial={tipo}
        onCerrar={() => {
          setCreando(false);
          setEditando(null);
        }}
      />
    </div>
  );
}
