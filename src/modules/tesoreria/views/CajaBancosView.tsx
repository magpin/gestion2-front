"use client";

import { useState } from "react";
import { ArrowLeftRight, History, Landmark, Plus } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { Button } from "@/components/ui/button";
import { funcionActiva } from "@/core/config/funciones";
import { useTieneRol } from "@/core/store/authStore";
import {
  DialogoNuevaCaja,
  DialogoNuevaCuentaBancaria,
} from "../components/DialogosAltaTesoreria";
import { SaldosTesoreria } from "../components/SaldosTesoreria";
import { ListaTraslados, TrasladoDialog } from "../components/Traslados";
import { usePrepararTesoreria } from "../hooks/usePrepararTesoreria";
import { CajasSeccion } from "./CajasSeccion";
import { CuentasBancariasSeccion } from "./CuentasBancariasSeccion";
import { LibroBancoSeccion } from "./LibroBancoSeccion";
import { LibroCajaSeccion } from "./LibroCajaSeccion";

type Seccion = "Saldos" | "Movimientos" | "Traslados";

const SECCIONES: Array<[Seccion, typeof Landmark]> = [
  ["Saldos", Landmark],
  ["Movimientos", History],
  // Pieza nueva del menú: se ve cuando su interruptor está encendido.
  ...(funcionActiva("traslados") ? [["Traslados", ArrowLeftRight] as [Seccion, typeof Landmark]] : []),
];

/**
 * Dinero → Caja y bancos: la mitad operativa de lo que era Tesorería. Dónde
 * está la plata y qué entró y salió de cada caja y cada cuenta.
 *
 * Son las mismas secciones de antes, juntas por lo que responden y no por el
 * instrumento: «Saldos» reúne cajas y cuentas bancarias; «Movimientos», los dos
 * libros; «Traslados», la plata que pasa de una caja o cuenta a otra. La otra
 * mitad —arqueo, corte, extractos, conciliación— es Control.
 */
export function CajaBancosView() {
  usePrepararTesoreria();
  const puedeCrear = useTieneRol("CAJA", "DIRECTOR");

  const [seccion, setSeccion] = useState<Seccion>("Saldos");
  const [creandoCaja, setCreandoCaja] = useState(false);
  const [creandoCuenta, setCreandoCuenta] = useState(false);
  const [trasladando, setTrasladando] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Dinero
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Caja y bancos<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dónde está la plata: cada caja y cada cuenta, y lo que entró y salió de ellas.
          </p>
        </div>
        {seccion === "Traslados" && puedeCrear && (
          <BotonNuevo etiqueta="Nuevo traslado" onClick={() => setTrasladando(true)} />
        )}
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Saldos" && (
        <>
          <SaldosTesoreria />
          <div className="flex flex-col gap-10">
            <section>
              <TituloBloque
                titulo="Cajas"
                accion={puedeCrear ? "Nueva caja" : undefined}
                onAccion={() => setCreandoCaja(true)}
              />
              <CajasSeccion />
            </section>
            <section>
              <TituloBloque
                titulo="Cuentas bancarias"
                accion={puedeCrear ? "Nueva cuenta bancaria" : undefined}
                onAccion={() => setCreandoCuenta(true)}
              />
              <CuentasBancariasSeccion />
            </section>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
            <Landmark className="size-3.5 text-success" />
            Las cajas y las cuentas no se eliminan: se desactivan para conservar su libro.
          </p>
        </>
      )}

      {seccion === "Movimientos" && (
        <div className="flex flex-col gap-10">
          <LibroCajaSeccion />
          <LibroBancoSeccion />
        </div>
      )}

      {seccion === "Traslados" && <ListaTraslados puedeAnular={puedeCrear} />}

      <TrasladoDialog abierto={trasladando} onCerrar={() => setTrasladando(false)} />
      <DialogoNuevaCaja abierto={creandoCaja} onCerrar={() => setCreandoCaja(false)} />
      <DialogoNuevaCuentaBancaria abierto={creandoCuenta} onCerrar={() => setCreandoCuenta(false)} />
    </div>
  );
}

/**
 * Título de cada bloque de «Saldos», con su alta al lado. Las dos altas no van
 * en la cabecera: serían dos acciones principales compitiendo, y cada una es
 * de su bloque.
 */
function TituloBloque({
  titulo,
  accion,
  onAccion,
}: {
  titulo: string;
  accion?: string;
  onAccion: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {accion && (
        <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={onAccion}>
          <Plus className="size-4" />
          {accion}
        </Button>
      )}
    </div>
  );
}
