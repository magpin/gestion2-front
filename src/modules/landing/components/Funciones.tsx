import type { ReactNode } from "react";
import { Rotulo, TituloSeccion } from "./Marca";
import styles from "../landing.module.css";

/**
 * Seis funciones en rejilla, y la quinta va en oscuro.
 *
 * Esa quinta —Auditoría continua— es el diferencial del producto, y romper la
 * rejilla es más barato que explicarlo: el ojo se detiene ahí antes de leer
 * nada. Es la única licencia que se toma la sección.
 *
 * El revelado al hacer scroll va en el `<li>` y el hover en el `<article>` de
 * adentro. Si compartieran elemento, el `fill-mode: both` del revelado dejaría
 * clavado `transform: none` y el levantamiento del hover no ocurriría nunca en
 * Chrome.
 */

function IconoAsiento() {
  return (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M12 4v16" />
      <path d="M4 9h16" />
    </>
  );
}

function IconoCompras() {
  return (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h7" />
      <path d="M9 17h5" />
    </>
  );
}

function IconoVentas() {
  return (
    <>
      <path d="M4 17l5-5 4 4 7-8" />
      <path d="M15 8h5v5" />
    </>
  );
}

function IconoPuc() {
  return (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h13" />
      <path d="M10 18h10" />
    </>
  );
}

function IconoAuditoria() {
  return (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  );
}

function IconoTrazabilidad() {
  return (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
      <path d="M11 8v3l2 1.5" />
    </>
  );
}

interface Funcion {
  titulo: string;
  texto: string;
  icono: ReactNode;
  oscura?: boolean;
}

const FUNCIONES: Funcion[] = [
  {
    titulo: "Asientos automáticos",
    texto:
      "Cada documento se convierte en un asiento con partida doble, cuadrado desde el primer momento.",
    icono: <IconoAsiento />,
  },
  {
    titulo: "Compras",
    texto:
      "Proveedores, IVA descontable y retenciones registrados sin que tengas que tocar la factura.",
    icono: <IconoCompras />,
  },
  {
    titulo: "Ventas",
    texto:
      "Ingresos, IVA generado y cuentas por cobrar asentados apenas se emite la factura.",
    icono: <IconoVentas />,
  },
  {
    titulo: "PUC aplicado",
    texto:
      "La IA elige la cuenta del Plan Único de Cuentas según el proveedor, el concepto y tu historial.",
    icono: <IconoPuc />,
  },
  {
    titulo: "Auditoría continua",
    texto:
      "Cada asiento pasa por una revisión automática antes de contabilizarse. Nada entra sin verificar.",
    icono: <IconoAuditoria />,
    oscura: true,
  },
  {
    titulo: "Trazabilidad total",
    texto: "Cada movimiento guarda su soporte y la explicación de por qué se registró así.",
    icono: <IconoTrazabilidad />,
  },
];

// Sin esto, las tres tarjetas de una fila entran a la vez y la rejilla se lee
// como un solo golpe. Con el rango corrido, se arman de a una.
const ESCALONES = [styles.e1, styles.e2, styles.e3, styles.e4, styles.e5, styles.e6];

export function Funciones() {
  return (
    <section id="funciones" className={`${styles.ancla} ${styles.papelFunciones} relative py-24 lg:py-32`}>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-10 px-6 lg:gap-16">
        <div
          className={`${styles.rv} flex flex-col justify-between gap-6 lg:flex-row lg:items-end lg:gap-12`}
        >
          <div className="flex max-w-[640px] flex-col gap-4.5">
            <Rotulo>02 — Funciones</Rotulo>
            <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
              Todo lo que antes era <span className="italic">digitación.</span>
            </TituloSeccion>
          </div>
          <p className="m-0 max-w-[360px] text-base leading-relaxed text-muted-foreground">
            El trabajo repetitivo lo hace la IA. El criterio contable sigue siendo tuyo.
          </p>
        </div>

        <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map(({ titulo, texto, icono, oscura }, i) => (
            <li key={titulo} className={`${styles.rv} ${ESCALONES[i]}`}>
              <article
                className={`${styles.tarjeta} flex h-full flex-col gap-3.5 rounded-lg border p-8 ${
                  oscura
                    ? "border-rail bg-rail text-rail-foreground"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-[0.6rem] ${
                    oscura ? "bg-rail-foreground/10" : "bg-secondary"
                  }`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={oscura ? "text-rail-foreground" : "text-foreground"}
                  >
                    {icono}
                  </svg>
                </div>
                <h3 className="mt-1.5 mb-0 text-lg font-semibold">{titulo}</h3>
                <p
                  className={`m-0 text-[15px] leading-relaxed ${
                    oscura ? "text-rail-muted" : "text-muted-foreground"
                  }`}
                >
                  {texto}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
