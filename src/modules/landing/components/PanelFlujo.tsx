import { Visto } from "./Marca";
import { MariaDelPanel } from "./MariaDelPanel";
import styles from "../landing.module.css";

/**
 * Documento → María → asiento propuesto.
 *
 * Decorativo y `aria-hidden`: lo que dice ya está dicho en el titular y en la
 * sección "Cómo funciona". Un lector de pantalla que recorriera estas tres
 * tablas escucharía una factura de ejemplo, cuenta por cuenta, sin que eso le
 * aporte nada.
 *
 * Los números son reales y cuadran: 2.380.000 de un lado y del otro. Una
 * factura de ejemplo que no cuadrara sería, en esta página, la peor errata
 * posible.
 */

const CHEQUEOS = [
  { texto: "Proveedor y NIT validados", retraso: styles.k1 },
  { texto: "Útiles y papelería: la cuenta que indicaste la vez pasada", retraso: styles.k2 },
  { texto: "IVA descontable identificado", retraso: styles.k3 },
  { texto: "Sumas del papel cuadradas", retraso: styles.k4 },
];

const ASIENTO = [
  { cuenta: "519530", debe: "2.000.000", haber: "", retraso: styles.r2 },
  { cuenta: "240810", debe: "380.000", haber: "", retraso: styles.r3 },
  { cuenta: "220505", debe: "", haber: "2.380.000", retraso: styles.r4 },
];

function FlechaPaso({ retraso }: { retraso: string }) {
  return (
    <div className="flex justify-center max-lg:rotate-90 max-sm:hidden">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-rail-muted"
      >
        <path className={`${styles.arrow} ${retraso}`} d="M4 12h15M13 6l6 6-6 6" />
      </svg>
    </div>
  );
}

export function PanelFlujo() {
  return (
    <div className="relative mt-20 flex flex-col items-center gap-4">
      <div
        aria-hidden="true"
        className={`${styles.panel} ${styles.trama} ${styles.sombraPanel} grid w-full max-w-[1200px] items-center gap-4 rounded-[1.35rem] p-4 text-rail-foreground sm:p-9 grid-cols-[minmax(0,1fr)] [&>*]:min-w-0 lg:grid-cols-[1fr_44px_1fr_44px_1.25fr] lg:gap-0`}
      >
        {/* 1 · El documento, tal como llega. En el celular no va: el panel es
            una sola tarjeta, y el documento es el chip de la tarjeta de María. */}
        <div
          className={`${styles.card} ${styles.c1} flex flex-col max-sm:hidden gap-3.5 rounded-lg border border-rail-line bg-rail-foreground/5 p-5`}
        >
          <span className="font-mono text-[11px] uppercase tracking-[1px] text-rail-muted">
            1 · Documento
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-sm font-medium">Factura FE-2231</span>
            <span className="text-[13px] text-rail-muted">Papelería Central S.A.S.</span>
          </div>
          <div className="flex flex-col gap-2 border-t border-rail-line pt-3 font-mono text-[13px]">
            <div className="flex justify-between">
              <span className="text-rail-muted">Subtotal</span>
              <span>2.000.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rail-muted">IVA 19 %</span>
              <span>380.000</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>2.380.000</span>
            </div>
          </div>
        </div>

        <FlechaPaso retraso={styles.a1} />

        {/* 2 · María lee. Los chequeos llegan de a uno. El borde naranja: es la
            tarjeta donde está ella. */}
        <div
          className={`${styles.card} ${styles.c2} flex flex-col gap-4 rounded-lg border border-brand/45 bg-brand/[0.06] p-5`}
        >
          <span className="font-mono text-[11px] uppercase tracking-[1px] text-rail-muted">
            2 · María lee
          </span>
          {/* El documento en chip: solo en el celular, donde no hay tarjeta 1. */}
          <span className="flex items-center justify-between gap-3 rounded-md border border-rail-line bg-rail-foreground/5 px-3 py-2 font-mono text-xs sm:hidden">
            <span className="truncate text-rail-muted">FE-2231 · Papelería Central</span>
            <span className="font-medium text-rail-foreground">$2.380.000</span>
          </span>
          <MariaDelPanel />
          <div className="flex flex-col gap-2.5 text-[13px] text-rail-foreground">
            {CHEQUEOS.map(({ texto, retraso }) => (
              <div key={texto} className={`${styles.row} ${retraso} flex items-start gap-2.5`}>
                <Visto
                  size={14}
                  strokeWidth={2.4}
                  className="mt-0.5 shrink-0 text-rail-muted"
                />
                <span>{texto}</span>
              </div>
            ))}
          </div>
        </div>

        <FlechaPaso retraso={styles.a2} />

        {/* 3 · El asiento, escrito renglón por renglón, y el sello al final */}
        <div
          className={`${styles.card} ${styles.c3} flex flex-col gap-3.5 rounded-lg border border-rail-line bg-rail-foreground/5 p-5 font-mono text-xs`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[1px] text-rail-muted">
              3 · Asiento propuesto
            </span>
            <span
              className={`${styles.pop} flex items-center gap-1.5 rounded-full border border-success/40 bg-success/15 px-2.5 py-0.5 font-sans text-xs font-medium text-rail-foreground`}
            >
              <Visto size={11} strokeWidth={2.6} />
              Cuadra
            </span>
          </div>
          <div className="flex flex-col text-rail-foreground">
            <div
              className={`${styles.row} ${styles.r1} grid grid-cols-[1.3fr_1fr_1fr] border-b border-rail-line pb-2 text-[10px] uppercase tracking-[0.8px] text-rail-muted`}
            >
              <span>Cuenta</span>
              <span className="text-right">Debe</span>
              <span className="text-right">Haber</span>
            </div>
            {ASIENTO.map(({ cuenta, debe, haber, retraso }) => (
              <div
                key={cuenta}
                className={`${styles.row} ${retraso} grid grid-cols-[1.3fr_1fr_1fr] border-b border-rail-line py-2`}
              >
                <span>{cuenta}</span>
                <span className="text-right">{debe}</span>
                <span className="text-right">{haber}</span>
              </div>
            ))}
            <div
              className={`${styles.row} ${styles.r6} grid grid-cols-[1.3fr_1fr_1fr] pt-2 font-medium text-rail-foreground`}
            >
              <span>Sumas</span>
              <span className="text-right">2.380.000</span>
              <span className="text-right">2.380.000</span>
            </div>
          </div>
        </div>
      </div>

      <span className={`${styles.nota} text-xs text-muted-foreground`}>
        Ejemplo ilustrativo de una factura de compra.
      </span>
    </div>
  );
}
