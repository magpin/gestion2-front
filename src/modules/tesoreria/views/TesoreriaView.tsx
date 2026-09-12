"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, History, Landmark, Loader2, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { FormularioCaja, type DatosCaja } from "../components/FormularioCaja";
import { cajasApi } from "../services/tesoreria.service";
import { ArqueoSeccion } from "./ArqueoSeccion";
import { CajasSeccion } from "./CajasSeccion";
import { ConfiguracionSeccion } from "./ConfiguracionSeccion";
import { LibroCajaSeccion } from "./LibroCajaSeccion";

type Seccion = "Cajas" | "Libro" | "Arqueo" | "Configuración";

const SECCIONES: Array<[Seccion, typeof Landmark]> = [
  ["Cajas", Landmark],
  ["Libro", History],
  ["Arqueo", ClipboardCheck],
  ["Configuración", Settings2],
];

const ID_FORMULARIO = "formulario-nueva-caja";

/**
 * Tesorería — módulo 7 de la secuencia. Por ahora solo Caja: Bancos llega
 * en la Fase 2 del plan (`docs/planes/caja-bancos-backend.md`).
 *
 * Cuatro pestañas en una sola ruta, mismo criterio que `InventarioView`.
 * El botón "Nueva caja" vive en el encabezado y no dentro de la pestaña
 * Cajas: es la acción de la pantalla entera, igual que "Nuevo producto" en
 * Inventario.
 */
export function TesoreriaView() {
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("CAJA", "DIRECTOR");

  const [seccion, setSeccion] = useState<Seccion>("Cajas");
  const [creando, setCreando] = useState(false);
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);

  const crear = useMutation({
    mutationFn: (d: DatosCaja) =>
      cajasApi.crear({
        nombre: d.nombre,
        tipo: d.tipo,
        sedeId: d.tipo === "PRINCIPAL" ? d.sedeId : undefined,
        cuentaId: d.cuentaId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cajas"] });
      aviso.exito("Caja registrada");
      setCreando(false);
      setCuenta(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Tesorería / Caja
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Caja<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El efectivo de la empresa: sus cajas, el libro de movimientos y el cuadre diario.
          </p>
        </div>

        <Button
          onClick={() => setCreando(true)}
          disabled={!puedeCrear}
          className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
            <Plus className="size-4" />
          </span>
          Nueva caja
        </Button>
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Cajas" && <CajasSeccion />}
      {seccion === "Libro" && <LibroCajaSeccion />}
      {seccion === "Arqueo" && <ArqueoSeccion />}
      {seccion === "Configuración" && <ConfiguracionSeccion />}

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
        <Landmark className="size-3.5 text-success" />
        Las cajas no se eliminan: se desactivan para conservar su libro.
      </p>

      <Dialog open={creando} onOpenChange={(a) => !a && setCreando(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Nueva caja</DialogTitle>
              <DialogDescription>Una por sede (arqueo por punto de venta), o el fondo fijo de caja menor.</DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioCaja
              id={ID_FORMULARIO}
              cuenta={cuenta}
              onCuenta={setCuenta}
              alGuardar={(d) => crear.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => {
                setCreando(false);
                setCuenta(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORMULARIO} className="h-12 rounded-xl px-6" disabled={crear.isPending}>
              {crear.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
