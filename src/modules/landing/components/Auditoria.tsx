import { Rotulo, TituloSeccion, Visto } from "./Marca";
import styles from "../landing.module.css";

/**
 * "Una IA registra. Otra revisa."
 *
 * La tarjeta de la derecha muestra el caso que importa: tres verificaciones en
 * verde y una en ámbar. No es un panel de todo-correcto — enseña justamente lo
 * que el sistema hace cuando algo no cuadra, que es detenerse y preguntar.
 *
 * El texto de la alerta va en color neutro, no en ámbar: el ámbar es el ícono y
 * el borde. Un párrafo entero en color de estado se lee peor y no avisa más.
 */
const VERIFICACIONES = [
  "Débitos iguales a créditos",
  "Soporte adjunto y legible",
  "Cuenta coherente con la actividad del proveedor",
];

export function Auditoria() {
  return (
    <section
      id="auditoria"
      className={`${styles.ancla} border-y border-border bg-card py-24 lg:py-32`}
    >
      <div className="mx-auto grid max-w-[1152px] items-center gap-16 px-6 lg:grid-cols-2 lg:gap-24">
        <div className={`${styles.rv} flex flex-col gap-5.5`}>
          <Rotulo>03 — Auditoría</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] tracking-[-1.6px]">
            Una IA registra.
            <br />
            <span className="italic text-brand-text">Otra revisa.</span>
          </TituloSeccion>
          <p className="m-0 text-[17px] leading-[1.65] text-muted-foreground">
            Antes de que un asiento llegue a tus libros, se verifica que cuadre, que tenga
            soporte, que la cuenta tenga sentido y que no esté duplicado. Si algo no encaja, no
            se contabiliza: te llega a ti con la razón.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] text-muted-foreground">
            Así no tienes que revisar cien asientos. Solo los dos que lo necesitan.
          </p>
        </div>

        <div className={`${styles.rv} relative`} aria-hidden="true">
          {/* La placa oscura detrás, corrida: da profundidad sin una sombra más. */}
          <div
            className={`${styles.tramaFina} absolute inset-[40px_-20px_-20px_40px] rounded-[1.35rem] max-sm:inset-[16px_-8px_-8px_16px]`}
          />
          <div
            className={`${styles.sombraTarjeta} relative flex flex-col gap-1 rounded-[1.05rem] border border-border bg-card p-7`}
          >
            <div className="mb-2 flex items-center justify-between border-b border-border pb-4">
              <span className="font-mono text-[13px] font-medium">
                Revisión · Factura FE-2231
              </span>
              <span className="text-xs text-muted-foreground">4 verificaciones</span>
            </div>

            {/* La auditoría corre mientras se mira: cada verificación se marca
                después de la anterior, y la alerta llega al final. Es lo mismo
                que hace el panel del hero, pero guiado por el scroll. */}
            {VERIFICACIONES.map((texto, i) => (
              <div
                key={texto}
                className={`${styles.rvFila} ${[styles.e2, styles.e3, styles.e4][i]} flex items-center gap-3 p-3`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15">
                  <Visto size={14} strokeWidth={2.6} className="text-success" />
                </span>
                <span className="text-sm">{texto}</span>
              </div>
            ))}

            <div
              className={`${styles.rvFila} ${styles.e5} mt-1 flex items-start gap-3 rounded-[0.6rem] border border-warning/30 bg-warning/10 px-3 py-3.5`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning/15">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-warning"
                >
                  <path d="M12 8v5" />
                  <path d="M12 16.5v.5" />
                </svg>
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Posible factura duplicada</span>
                <span className="text-[13px] leading-normal text-muted-foreground">
                  Un documento con el mismo número y proveedor ya fue registrado. Queda en
                  espera hasta que lo revises.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
