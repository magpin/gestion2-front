"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Pencil, Plus, Power, Star } from "lucide-react";

import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccionesDropdown } from "@/components/shared/AccionesDropdown";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/SelectField";
import { Campo } from "@/modules/configuracion/components/Campo";
import { empresaApi } from "@/modules/configuracion/services/nucleo.service";
import { planCuentasApi } from "../services/plan-cuentas.service";
import { RepartosCentros } from "./RepartosCentros";
import type { CentroCosto, DatosCentro, TipoCentro } from "../types/plan-cuentas.types";
import {
  CLAVE_CENTROS,
  CLAVE_MANEJO_CENTROS,
  SelectorCentroCosto,
} from "./SelectorCentroCosto";

const TIPOS: Array<{ value: TipoCentro; label: string; ayuda: string }> = [
  { value: "PRODUCTIVO", label: "Productivo", ayuda: "vende o produce: punto de venta, taller, línea de servicio" },
  { value: "APOYO", label: "De apoyo", ayuda: "sirve a los productivos: bodega, mantenimiento, despachos" },
  { value: "ADMINISTRATIVO", label: "Administrativo", ayuda: "gerencia, contabilidad, talento humano" },
];
const NOMBRE_TIPO: Record<TipoCentro, string> = {
  PRODUCTIVO: "Productivo",
  APOYO: "De apoyo",
  ADMINISTRATIVO: "Administrativo",
};
const SIN = "__sin";

/** Los padres primero y cada uno con sus hijos debajo; los sueltos, en su lugar. */
export function enArbol(centros: CentroCosto[]): Array<{ centro: CentroCosto; nivel: 0 | 1 }> {
  const hijos = new Map<string, CentroCosto[]>();
  for (const c of centros) {
    if (c.padreId) hijos.set(c.padreId, [...(hijos.get(c.padreId) ?? []), c]);
  }
  const ids = new Set(centros.map((c) => c.id));
  const filas: Array<{ centro: CentroCosto; nivel: 0 | 1 }> = [];
  for (const c of centros) {
    // Un hijo cuyo padre no está a la vista (desactivado y oculto) va suelto.
    if (c.padreId && ids.has(c.padreId)) continue;
    filas.push({ centro: c, nivel: c.padreId ? 1 : 0 });
    for (const h of hijos.get(c.id) ?? []) filas.push({ centro: h, nivel: 1 });
  }
  return filas;
}

interface Borrador {
  codigo: string;
  nombre: string;
  tipo: TipoCentro;
  padreId: string | null;
  sedeId: string | null;
}
const VACIO: Borrador = { codigo: "", nombre: "", tipo: "PRODUCTIVO", padreId: null, sedeId: null };

/**
 * Los centros de costo de la empresa: dónde se vende o se gasta (sede, área,
 * proyecto). La cuenta del PUC dice en qué; el centro, dónde.
 *
 * Encenderlos marca todas las cuentas de ingresos, costos y gastos (clases 4
 * a 7) para que lleven centro; lo que no diga el suyo va al de por defecto.
 */
export function CentrosDeCosto() {
  const queryClient = useQueryClient();
  const [verInactivos, setVerInactivos] = useState(false);
  const [nuevo, setNuevo] = useState<Borrador>(VACIO);
  const [editando, setEditando] = useState<CentroCosto | null>(null);
  const [borradorEdicion, setBorradorEdicion] = useState<Borrador>(VACIO);

  const { data: centros = [], isLoading } = useQuery({
    queryKey: CLAVE_CENTROS,
    queryFn: planCuentasApi.centros,
  });
  const { data: maneja = false } = useQuery({
    queryKey: CLAVE_MANEJO_CENTROS,
    queryFn: planCuentasApi.manejoCentros,
  });
  const { data: sedes = [] } = useQuery({
    queryKey: ["empresa", "sedes"],
    queryFn: empresaApi.sedes,
  });

  const { data: miCentro = null } = useQuery({
    queryKey: [...CLAVE_CENTROS, "mio"],
    queryFn: planCuentasApi.miCentro,
  });

  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CLAVE_CENTROS }),
      queryClient.invalidateQueries({ queryKey: ["plan-cuentas"] }),
    ]);

  const alFallar = (e: unknown) => aviso.falla(e);

  const crear = useMutation({
    mutationFn: (d: Borrador) =>
      planCuentasApi.crearCentro({
        codigo: d.codigo.trim(),
        nombre: d.nombre.trim(),
        tipo: d.tipo,
        padreId: d.padreId ?? undefined,
        sedeId: d.sedeId ?? undefined,
        // El primero de la empresa es el de por defecto: siempre tiene que haber uno.
        esPorDefecto: !centros.some((c) => c.esPorDefecto && c.activo),
      }),
    onSuccess: async () => {
      await refrescar();
      setNuevo(VACIO);
      aviso.exito("Centro de costo agregado");
    },
    onError: alFallar,
  });

  const editar = useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: DatosCentro }) =>
      planCuentasApi.editarCentro(id, datos),
    onSuccess: async () => {
      await refrescar();
      setEditando(null);
      aviso.exito("Centro de costo actualizado");
    },
    onError: alFallar,
  });

  const desactivar = useMutation({
    mutationFn: planCuentasApi.desactivarCentro,
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Centro de costo desactivado");
    },
    onError: alFallar,
  });

  const activar = useMutation({
    mutationFn: planCuentasApi.activarCentro,
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Centro de costo activado");
    },
    onError: alFallar,
  });

  const desdeSedes = useMutation({
    mutationFn: planCuentasApi.centrosDesdeSedes,
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Centros creados a partir de las sedes");
    },
    onError: alFallar,
  });

  const fijarMiCentro = useMutation({
    mutationFn: planCuentasApi.fijarMiCentro,
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Su centro de costo quedó guardado");
    },
    onError: alFallar,
  });

  const fijarManejo = useMutation({
    mutationFn: planCuentasApi.fijarManejoCentros,
    onSuccess: async (_, activo) => {
      await Promise.all([
        refrescar(),
        queryClient.invalidateQueries({ queryKey: CLAVE_MANEJO_CENTROS }),
      ]);
      aviso.exito(activo ? "Centros de costo encendidos" : "Centros de costo apagados");
    },
    onError: alFallar,
  });

  const visibles = verInactivos ? centros : centros.filter((c) => c.activo);
  const filas = enArbol(visibles);
  const hayPorDefecto = centros.some((c) => c.esPorDefecto && c.activo);
  const sedesSinCentro = sedes.filter(
    (s) => s.activo && !centros.some((c) => c.sedeId === s.id),
  );

  // Un padre: activo, de primer nivel, no el de por defecto y sin movimientos
  // (esto último lo dice el servidor si pasa).
  const padresPosibles = (excepto?: string) =>
    centros.filter(
      (c) => c.activo && !c.padreId && !c.esPorDefecto && c.id !== excepto,
    );
  const opcionesPadre = (excepto?: string) => [
    { value: SIN, label: "Ninguno (primer nivel)" },
    ...padresPosibles(excepto).map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` })),
  ];
  const opcionesSede = [
    { value: SIN, label: "Sin sede" },
    ...sedes.filter((s) => s.activo).map((s) => ({ value: s.id, label: s.nombre })),
  ];
  const opcionesTipo = TIPOS.map((t) => ({ value: t.value, label: t.label }));

  const abrirEdicion = (c: CentroCosto) => {
    setEditando(c);
    setBorradorEdicion({
      codigo: c.codigo,
      nombre: c.nombre,
      tipo: c.tipo,
      padreId: c.padreId,
      sedeId: c.sedeId,
    });
  };

  const camposCentro = (
    b: Borrador,
    cambiar: (p: Partial<Borrador>) => void,
    prefijo: string,
    excepto?: string,
  ) => (
    <>
      <Campo id={`${prefijo}Tipo`} etiqueta="Tipo" className="w-44">
        <SelectField
          value={b.tipo}
          onChange={(v) => cambiar({ tipo: v as TipoCentro })}
          options={opcionesTipo}
        />
      </Campo>
      <Campo id={`${prefijo}Padre`} etiqueta="Dentro de" className="w-56">
        <SelectField
          value={b.padreId ?? SIN}
          onChange={(v) => cambiar({ padreId: v === SIN ? null : v })}
          options={opcionesPadre(excepto)}
        />
      </Campo>
      <Campo id={`${prefijo}Sede`} etiqueta="Sede" className="w-48">
        <SelectField
          value={b.sedeId ?? SIN}
          onChange={(v) => cambiar({ sedeId: v === SIN ? null : v })}
          options={opcionesSede}
        />
      </Campo>
    </>
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-64 flex-1">
          <h2 className="text-sm font-semibold">Centros de costo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Dicen dónde se vendió o se gastó: una sede, un área, un proyecto. La
            cuenta dice en qué; el centro, dónde. No cambian ningún impuesto.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={maneja}
            disabled={fijarManejo.isPending || (!maneja && !hayPorDefecto)}
            onChange={(e) => fijarManejo.mutate(e.target.checked)}
            className="size-4"
            aria-label="Ver resultados por centro de costo"
          />
          Ver resultados por centro de costo
        </label>
      </div>

      <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        {maneja
          ? "Encendido: todas las cuentas de ingresos, costos y gastos (clases 4 a 7) llevan centro. Lo que no diga el suyo va al de por defecto."
          : hayPorDefecto
            ? "Apagado. Al encenderlo, las cuentas de ingresos, costos y gastos (clases 4 a 7) pasan a llevar centro desde hoy; lo anterior queda «Sin centro»."
            : "Para encenderlo, cree al menos un centro: el primero queda como el de por defecto, a donde va lo que no diga otro centro."}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {sedesSinCentro.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => desdeSedes.mutate()}
            disabled={desdeSedes.isPending}
          >
            {desdeSedes.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Building2 className="size-4" />
            )}
            Crear un centro por cada sede ({sedesSinCentro.length})
          </Button>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
            className="size-3.5"
          />
          Ver desactivados
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : filas.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {filas.map(({ centro: c, nivel }) => (
            <li
              key={c.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm",
                !c.activo && "text-muted-foreground",
              )}
            >
              <span className={cn("w-24 shrink-0 font-mono text-xs", nivel === 1 && "pl-5")}>
                {c.codigo}
              </span>
              <span className={cn("min-w-40 flex-1 truncate", c.agrupa && "font-medium")}>
                {c.nombre}
                {c.agrupa && <span className="ml-2 text-xs text-muted-foreground">agrupa</span>}
              </span>
              <span className="text-xs text-muted-foreground">{NOMBRE_TIPO[c.tipo]}</span>
              {c.sedeNombre && (
                <span className="text-xs text-muted-foreground">· {c.sedeNombre}</span>
              )}
              {c.esPorDefecto && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-text">
                  <Star className="size-3" /> Por defecto
                </span>
              )}
              {!c.activo && <span className="text-xs">Desactivado</span>}
              <AccionesDropdown
                acciones={[
                  { label: "Editar", icon: Pencil, onSelect: () => abrirEdicion(c) },
                  ...(c.activo && !c.esPorDefecto && !c.agrupa
                    ? [
                        {
                          label: "Usar por defecto",
                          icon: Star,
                          onSelect: () => editar.mutate({ id: c.id, datos: { esPorDefecto: true } }),
                        },
                      ]
                    : []),
                  c.activo
                    ? {
                        label: "Desactivar",
                        icon: Power,
                        variant: "destructive" as const,
                        separadorAntes: true,
                        disabled: c.esPorDefecto,
                        onSelect: () => desactivar.mutate(c.id),
                      }
                    : {
                        label: "Reactivar",
                        icon: Power,
                        separadorAntes: true,
                        onSelect: () => activar.mutate(c.id),
                      },
                ]}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no hay centros de costo.</p>
      )}

      {maneja && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
          <span className="text-sm">Su centro de costo</span>
          <span className="text-xs text-muted-foreground">
            lo que usted registre va ahí si el documento no dice otro
          </span>
          <div className="ml-auto w-64">
            <SelectorCentroCosto
              value={miCentro}
              onChange={(id) => fijarMiCentro.mutate(id)}
              centros={centros.filter((c) => c.activo && !c.agrupa)}
              permitirVacio
              textoVacio="El de la sede o el de por defecto"
              disabled={fijarMiCentro.isPending}
            />
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nuevo.codigo.trim() === "" || nuevo.nombre.trim().length < 2) {
            aviso.falla(new Error("Escriba el código y el nombre del centro."));
            return;
          }
          crear.mutate(nuevo);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Campo id="centroCodigo" etiqueta="Código">
          <Input
            id="centroCodigo"
            className="w-28 font-mono"
            maxLength={20}
            value={nuevo.codigo}
            onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value })}
          />
        </Campo>
        <Campo id="centroNombre" etiqueta="Nombre" className="min-w-48 flex-1">
          <Input
            id="centroNombre"
            maxLength={120}
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          />
        </Campo>
        {camposCentro(nuevo, (p) => setNuevo({ ...nuevo, ...p }), "nuevo")}
        <Button type="submit" variant="outline" disabled={crear.isPending}>
          {crear.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Agregar
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        {TIPOS.map((t) => `${t.label}: ${t.ayuda}`).join(". ")}.
      </p>

      {maneja && <RepartosCentros centros={centros.filter((c) => c.activo && !c.agrupa)} />}

      <FormDialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
        titulo={editando ? `Editar ${editando.codigo}` : "Editar centro"}
        ancho={560}
      >
        {editando && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editar.mutate({
                id: editando.id,
                datos: {
                  nombre: borradorEdicion.nombre.trim(),
                  tipo: borradorEdicion.tipo,
                  padreId: borradorEdicion.padreId,
                  sedeId: borradorEdicion.sedeId,
                },
              });
            }}
            className="flex flex-col gap-4"
          >
            <Campo id="editarNombre" etiqueta="Nombre">
              <Input
                id="editarNombre"
                maxLength={120}
                value={borradorEdicion.nombre}
                onChange={(e) => setBorradorEdicion({ ...borradorEdicion, nombre: e.target.value })}
              />
            </Campo>
            <div className="flex flex-wrap gap-3">
              {camposCentro(
                borradorEdicion,
                (p) => setBorradorEdicion({ ...borradorEdicion, ...p }),
                "editar",
                editando.id,
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editar.isPending}>
                {editar.isPending && <Loader2 className="size-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        )}
      </FormDialog>
    </section>
  );
}
