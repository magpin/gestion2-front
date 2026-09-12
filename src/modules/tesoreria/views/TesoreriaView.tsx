"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  ClipboardCheck,
  FileText,
  GitCompareArrows,
  History,
  Landmark,
  Loader2,
  Plus,
  Settings2,
} from "lucide-react";

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
import {
  FormularioCuentaBancaria,
  type DatosCuentaBancaria,
} from "../components/FormularioCuentaBancaria";
import { cuentasBancariasApi } from "../services/bancos.service";
import { cajasApi } from "../services/tesoreria.service";
import { ArqueoSeccion } from "./ArqueoSeccion";
import { CajasSeccion } from "./CajasSeccion";
import { ConciliacionSeccion } from "./ConciliacionSeccion";
import { ConfiguracionSeccion } from "./ConfiguracionSeccion";
import { CuentasBancariasSeccion } from "./CuentasBancariasSeccion";
import { ExtractosSeccion } from "./ExtractosSeccion";
import { LibroBancoSeccion } from "./LibroBancoSeccion";
import { LibroCajaSeccion } from "./LibroCajaSeccion";

type Grupo = "Caja" | "Bancos";
type SeccionCaja = "Cajas" | "Libro" | "Arqueo" | "Configuración";
type SeccionBanco = "Cuentas" | "Libro" | "Extractos" | "Conciliación";

const SECCIONES_CAJA: Array<[SeccionCaja, typeof Landmark]> = [
  ["Cajas", Landmark],
  ["Libro", History],
  ["Arqueo", ClipboardCheck],
  ["Configuración", Settings2],
];

const SECCIONES_BANCO: Array<[SeccionBanco, typeof Landmark]> = [
  ["Cuentas", Landmark],
  ["Libro", History],
  ["Extractos", FileText],
  ["Conciliación", GitCompareArrows],
];

const ID_FORMULARIO_CAJA = "formulario-nueva-caja";
const ID_FORMULARIO_CUENTA_BANCARIA = "formulario-nueva-cuenta-bancaria";

/**
 * Tesorería — módulo 7 de la secuencia: Caja y Bancos, las dos partes de
 * un mismo módulo, no dos vistas ni dos rutas. `grupo` elige cuál de las
 * dos; cada uno tiene su propia fila de sub-pestañas — mezclar las 8 en
 * una sola fila las hacía ilegibles.
 *
 * El botón de alta del encabezado cambia según dónde se esté parado:
 * "Nueva caja" en Caja/Cajas, "Nueva cuenta bancaria" en Bancos/Cuentas,
 * oculto en el resto — es la acción de esa pantalla puntual, no un botón
 * genérico.
 */
export function TesoreriaView() {
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("CAJA", "DIRECTOR");

  const [grupo, setGrupo] = useState<Grupo>("Caja");
  const [seccionCaja, setSeccionCaja] = useState<SeccionCaja>("Cajas");
  const [seccionBanco, setSeccionBanco] = useState<SeccionBanco>("Cuentas");

  const [creandoCaja, setCreandoCaja] = useState(false);
  const [cuentaCaja, setCuentaCaja] = useState<CuentaEmpresa | null>(null);
  const [creandoCuentaBancaria, setCreandoCuentaBancaria] = useState(false);
  const [cuentaContableBanco, setCuentaContableBanco] = useState<CuentaEmpresa | null>(null);

  const crearCaja = useMutation({
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
      setCreandoCaja(false);
      setCuentaCaja(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const crearCuentaBancaria = useMutation({
    mutationFn: (d: DatosCuentaBancaria) => cuentasBancariasApi.crear(d),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
      aviso.exito("Cuenta bancaria registrada");
      setCreandoCuentaBancaria(false);
      setCuentaContableBanco(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const mostrarNuevaCaja = grupo === "Caja" && seccionCaja === "Cajas";
  const mostrarNuevaCuentaBancaria = grupo === "Bancos" && seccionBanco === "Cuentas";

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Tesorería
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            {grupo}
            <span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {grupo === "Caja"
              ? "El efectivo de la empresa: sus cajas, el libro de movimientos y el cuadre diario."
              : "Las cuentas bancarias, su libro y la conciliación contra el extracto."}
          </p>
        </div>

        {mostrarNuevaCaja && (
          <Button
            onClick={() => setCreandoCaja(true)}
            disabled={!puedeCrear}
            className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
              <Plus className="size-4" />
            </span>
            Nueva caja
          </Button>
        )}
        {mostrarNuevaCuentaBancaria && (
          <Button
            onClick={() => setCreandoCuentaBancaria(true)}
            disabled={!puedeCrear}
            className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
              <Plus className="size-4" />
            </span>
            Nueva cuenta bancaria
          </Button>
        )}
      </header>

      <div className="mb-5 inline-flex gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {(["Caja", "Bancos"] as const).map((g) => (
          <button
            key={g}
            type="button"
            aria-current={grupo === g ? "page" : undefined}
            onClick={() => setGrupo(g)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              grupo === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {g === "Caja" ? <Landmark className="size-4" /> : <Banknote className="size-4" />}
            {g}
          </button>
        ))}
      </div>

      {grupo === "Caja" ? (
        <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          {SECCIONES_CAJA.map(([nombre, Icono]) => (
            <button
              key={nombre}
              type="button"
              aria-current={seccionCaja === nombre ? "page" : undefined}
              onClick={() => setSeccionCaja(nombre)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                seccionCaja === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icono className="size-4" />
              {nombre}
            </button>
          ))}
        </nav>
      ) : (
        <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          {SECCIONES_BANCO.map(([nombre, Icono]) => (
            <button
              key={nombre}
              type="button"
              aria-current={seccionBanco === nombre ? "page" : undefined}
              onClick={() => setSeccionBanco(nombre)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                seccionBanco === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icono className="size-4" />
              {nombre}
            </button>
          ))}
        </nav>
      )}

      {grupo === "Caja" && (
        <>
          {seccionCaja === "Cajas" && <CajasSeccion />}
          {seccionCaja === "Libro" && <LibroCajaSeccion />}
          {seccionCaja === "Arqueo" && <ArqueoSeccion />}
          {seccionCaja === "Configuración" && <ConfiguracionSeccion />}
        </>
      )}
      {grupo === "Bancos" && (
        <>
          {seccionBanco === "Cuentas" && <CuentasBancariasSeccion />}
          {seccionBanco === "Libro" && <LibroBancoSeccion />}
          {seccionBanco === "Extractos" && <ExtractosSeccion />}
          {seccionBanco === "Conciliación" && <ConciliacionSeccion />}
        </>
      )}

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
        <Landmark className="size-3.5 text-success" />
        {grupo === "Caja"
          ? "Las cajas no se eliminan: se desactivan para conservar su libro."
          : "Las cuentas bancarias no se eliminan: se desactivan para conservar su libro."}
      </p>

      <Dialog open={creandoCaja} onOpenChange={(a) => !a && setCreandoCaja(false)}>
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
              id={ID_FORMULARIO_CAJA}
              cuenta={cuentaCaja}
              onCuenta={setCuentaCaja}
              alGuardar={(d) => crearCaja.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => {
                setCreandoCaja(false);
                setCuentaCaja(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORMULARIO_CAJA} className="h-12 rounded-xl px-6" disabled={crearCaja.isPending}>
              {crearCaja.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creandoCuentaBancaria} onOpenChange={(a) => !a && setCreandoCuentaBancaria(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Nueva cuenta bancaria</DialogTitle>
              <DialogDescription>Un auxiliar propio del plan de cuentas, uno por cuenta bancaria.</DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioCuentaBancaria
              id={ID_FORMULARIO_CUENTA_BANCARIA}
              cuenta={cuentaContableBanco}
              onCuenta={setCuentaContableBanco}
              alGuardar={(d) => crearCuentaBancaria.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => {
                setCreandoCuentaBancaria(false);
                setCuentaContableBanco(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO_CUENTA_BANCARIA}
              className="h-12 rounded-xl px-6"
              disabled={crearCuentaBancaria.isPending}
            >
              {crearCuentaBancaria.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar cuenta bancaria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
