import type { EstadoMaria } from "@/modules/asistente/components/Maria";
import { Maria } from "@/modules/asistente/components/Maria";
import { Rotulo, TituloSeccion } from "./Marca";
import styles from "../landing.module.css";

/**
 * «05 — Certeza»: de dónde sacó cada dato, dicho en palabras.
 *
 * Contada con lo que el sistema hace hoy al leer una factura (decisión del
 * dueño, 25 sep): el proveedor se resuelve por NIT, la cuenta del gasto queda
 * recordada de lo que contestó una persona, y lo que no sabe lo pregunta. Nada
 * de porcentajes, y nada que se asiente solo.
 *
 * Cuando exista la deducción por historial («La vi clara / La deduje / No sé»,
 * `docs/planes/funciones-faltantes.md` §5) y aprender «a la segunda» (§3), esta
 * sección se sube a esa versión.
 */
interface Fila {
  texto: React.ReactNode;
  chip: string;
  tono: "verde" | "ambar";
  estado: EstadoMaria;
}

const FILAS: Fila[] = [
  {
    texto: "Papelería Central: la encontré por el NIT de la factura.",
    chip: "Por NIT",
    tono: "verde",
    estado: "reposo",
  },
  {
    texto: (
      <>
        Útiles y papelería: a <span className="font-mono">519530</span>, como me dijiste la vez
        pasada.
      </>
    ),
    chip: "Recordado",
    tono: "verde",
    estado: "reposo",
  },
  {
    texto: "Servicios EPM: no sé si es gasto de administración o de ventas. Decime vos y lo recuerdo.",
    chip: "Te pregunto",
    tono: "ambar",
    estado: "noEntendi",
  },
];

export function Certeza() {
  return (
    <section id="certeza" className={`${styles.ancla} py-18 sm:py-24 lg:py-32`}>
      <div className="mx-auto grid max-w-[1152px] items-start gap-12 px-6 lg:grid-cols-2 lg:gap-24">
        <div className={`${styles.rv} flex flex-col gap-5.5`}>
          <Rotulo>05 — Certeza</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
            Te dice qué sabe. <span className="italic">Y qué no.</span>
          </TituloSeccion>
          <p className="m-0 text-[17px] leading-[1.65] text-muted-foreground">
            No te da porcentajes: un 87 % no le sirve a nadie. Te dice de dónde sacó cada dato, y
            lo que no sabe te lo pregunta. Nada se asienta solo.
          </p>
        </div>

        <div className="flex flex-col gap-5" aria-hidden="true">
          <div
            className={`${styles.rv} ${styles.e1} flex flex-col rounded-[1.05rem] border border-border bg-card px-5 py-2 sm:px-6`}
          >
            {FILAS.map(({ texto, chip, tono, estado }, i) => (
              <div
                key={chip}
                className={`grid grid-cols-[28px_1fr] items-start gap-x-3 gap-y-2 py-4 sm:grid-cols-[28px_1fr_auto] sm:items-center ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <Maria estado={estado} tamano={28} />
                <p className="m-0 text-sm leading-relaxed">{texto}</p>
                <span
                  className={`col-start-2 w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap sm:col-start-3 ${
                    tono === "verde"
                      ? "border-success/35 bg-success/10"
                      : "border-warning/40 bg-warning/10"
                  }`}
                >
                  {chip}
                </span>
              </div>
            ))}
          </div>

          <div
            className={`${styles.rv} ${styles.e3} flex flex-col gap-3 rounded-[1.05rem] border border-border bg-card px-5 py-5 sm:px-6`}
          >
            <span className="font-mono text-[11px] tracking-[1.2px] text-muted-foreground uppercase">
              Lo que le contestás, lo recuerda
            </span>
            <div className="flex items-start gap-3">
              <Maria estado="lista" tamano={28} />
              <p className="m-0 text-sm leading-relaxed">
                Listo: las compras de <strong>Papelería Central</strong> van a{" "}
                <span className="font-mono">519530</span>. La próxima vez no te pregunto.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Queda guardado con quién lo decidió y cuándo.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
