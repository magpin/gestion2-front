"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeftRight, History, Landmark, Plus, Wallet } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { funcionActiva } from "@/core/config/funciones";
import { useTieneRol } from "@/core/store/authStore";
import { hoyEnColombia } from "@/lib/utils";
import {
  DialogoNuevaCaja,
  DialogoNuevaCuentaBancaria,
} from "../components/DialogosAltaTesoreria";
import { ArranqueSaldos } from "../components/ArranqueSaldos";
import { BancosResumen } from "../components/BancosResumen";
import { CajaHoy } from "../components/CajaHoy";
import { MovimientosJuntos } from "../components/MovimientosJuntos";
import { ListaTraslados, TrasladoDialog } from "../components/Traslados";
import { usePrepararTesoreria } from "../hooks/usePrepararTesoreria";
import { cajasApi } from "../services/tesoreria.service";
import { CajasSeccion } from "./CajasSeccion";
import { CuentasBancariasSeccion } from "./CuentasBancariasSeccion";
import { LibroBancoSeccion } from "./LibroBancoSeccion";
import { LibroCajaSeccion } from "./LibroCajaSeccion";

type Seccion = "Caja" | "Bancos" | "Movimientos" | "Traslados";

const SECCIONES: Array<[Seccion, typeof Landmark]> = [
  ["Caja", Wallet],
  ["Bancos", Landmark],
  ["Movimientos", History],
  // Pieza nueva del menú: se ve cuando su interruptor está encendido.
  ...(funcionActiva("traslados") ? [["Traslados", ArrowLeftRight] as [Seccion, typeof Landmark]] : []),
];

/**
 * Dinero → Caja y bancos: la mitad operativa de lo que era Tesorería. Dónde
 * está la plata y qué entró y salió de cada caja y cada cuenta.
 *
 * Pestañas de la Fase 6 de las pantallas complementarias: «Caja», la
 * principal por defecto con su día (PC7); «Bancos», cada cuenta con su
 * conciliación y su 4×1000; «Movimientos», caja y bancos juntos con saldo
 * corrido; «Traslados», la plata que pasa de una a otra. Las altas de cajas y
 * cuentas se quedan acá (PC8). La otra mitad —arqueo, corte, extractos,
 * conciliación— es Control.
 */
export function CajaBancosView() {
  usePrepararTesoreria();
  const puedeCrear = useTieneRol("CAJA", "DIRECTOR");

  const [seccion, setSeccion] = useState<Seccion>("Caja");
  const [cuentaMovimientos, setCuentaMovimientos] = useState<string | null>(null);
  const [creandoCaja, setCreandoCaja] = useState(false);
  const [creandoCuenta, setCreandoCuenta] = useState(false);
  const [trasladando, setTrasladando] = useState(false);
  // Una empresa maneja una sola caja, la principal: con ella, no se ofrece otra.
  const { data: cajas = [] } = useQuery({ queryKey: ["cajas"], queryFn: () => cajasApi.listar(), meta: SILENCIOSO });
  const hayCaja = cajas.some((c) => c.activa);

  return (
    <div className="w-full">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Dinero
            <span className="font-semibold normal-case tracking-normal text-muted-foreground">
              · {format(parseISO(hoyEnColombia()), "EEEE d MMM", { locale: es }).replace(".", "")}
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Caja y bancos<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El dinero en efectivo y el dinero en el banco, cada una en su pestaña.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ArranqueSaldos />
          {(seccion === "Traslados" || seccion === "Movimientos") && puedeCrear && (
            <BotonNuevo etiqueta="Nuevo traslado" onClick={() => setTrasladando(true)} />
          )}
          {seccion === "Bancos" && puedeCrear && <BotonNuevo etiqueta="Agregar cuenta" onClick={() => setCreandoCuenta(true)} />}
        </div>
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => {
              setSeccion(nombre);
              setCuentaMovimientos(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
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

      {seccion === "Caja" && (
        <div className="flex flex-col gap-10">
          <CajaHoy onVerMovimientos={() => setSeccion("Movimientos")} onAgregar={puedeCrear && !hayCaja ? () => setCreandoCaja(true) : undefined} />
          <section>
            <TituloBloque
              titulo="Todas las cajas"
              accion={puedeCrear && !hayCaja ? "Nueva caja" : undefined}
              onAccion={() => setCreandoCaja(true)}
            />
            <CajasSeccion />
          </section>
        </div>
      )}

      {seccion === "Bancos" && (
        <div className="flex flex-col gap-10">
          <BancosResumen
            onAgregar={() => setCreandoCuenta(true)}
            onVerMovimientos={(id) => {
              setCuentaMovimientos(id);
              setSeccion("Movimientos");
            }}
          />
          <section>
            <TituloBloque titulo="Administrar cuentas" onAccion={() => setCreandoCuenta(true)} />
            <CuentasBancariasSeccion />
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
              <Landmark className="size-3.5 text-success" />
              Las cajas y las cuentas no se eliminan: se desactivan para conservar su libro.
            </p>
          </section>
        </div>
      )}

      {seccion === "Movimientos" && (
        <div className="flex flex-col gap-10">
          <MovimientosJuntos key={cuentaMovimientos ?? "todas"} cuentaInicial={cuentaMovimientos} />
          <details className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold">El libro de una caja o una cuenta, para reversar un movimiento</summary>
            <div className="mt-5 flex flex-col gap-10">
              <LibroCajaSeccion />
              <LibroBancoSeccion />
            </div>
          </details>
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
