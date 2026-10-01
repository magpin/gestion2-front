"use client";

import { useState } from "react";
import { ArrowLeftRight, Wallet } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { useTieneRol } from "@/core/store/authStore";
import { ListaCruces } from "@/modules/cobros/components/AnticiposYCruces";
import { AnticiposGlobales, CLIENTES, SALDOS_A_FAVOR } from "@/modules/tesoreria/components/AnticiposGlobales";
import { RecibirAnticipoDialog } from "../components/RecibirAnticipoDialog";

type Seccion = "Anticipos" | "Saldos a favor";

const SECCIONES: Array<[Seccion, typeof Wallet]> = [
  ["Anticipos", Wallet],
  ["Saldos a favor", ArrowLeftRight],
];

/**
 * Ingresos → Anticipos: la plata que los clientes dejaron para un pedido y lo
 * que les quedó a favor. Los dos se facturan desde aquí: la factura arranca
 * llena y los aplica sin volver a mover la caja.
 */
export function AnticiposView() {
  const puedeCobrar = useTieneRol("CAJA", "DIRECTOR");
  const [seccion, setSeccion] = useState<Seccion>("Anticipos");
  const [recibir, setRecibir] = useState(false);

  return (
    <div className="w-full">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Ingresos
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Anticipos<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lo que los clientes dejan para un pedido y lo que les queda a favor, hasta facturarlo.
          </p>
        </div>
        {/* En Saldos a favor no hay nada que crear: el saldo lo deja una nota crédito. */}
        {puedeCobrar && seccion === "Anticipos" && (
          <BotonNuevo etiqueta="Recibir anticipo" onClick={() => setRecibir(true)} />
        )}
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => setSeccion(nombre)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Anticipos" ? (
        <div className="flex flex-col gap-7">
          <AnticiposGlobales lado={CLIENTES} puedeMover={puedeCobrar} />
          <ListaCruces puedeAnular={puedeCobrar} />
        </div>
      ) : (
        <AnticiposGlobales lado={SALDOS_A_FAVOR} puedeMover={puedeCobrar} />
      )}

      <RecibirAnticipoDialog abierto={recibir} onCerrar={() => setRecibir(false)} />
    </div>
  );
}
