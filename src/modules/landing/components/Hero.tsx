import { Destello, Flecha } from "./Marca";
import { NavLanding } from "./NavLanding";
import { PanelFlujo } from "./PanelFlujo";
import styles from "../landing.module.css";

/**
 * El hero, con la navegación encima y el papel contable detrás.
 *
 * Las cuatro capas de fondo son decorativas y van absolutas: renglones,
 * márgenes naranjas, margen derecho y el resplandor. Se dibujan solas al
 * cargar —los renglones barren de izquierda a derecha, los márgenes caen desde
 * arriba— y esa es la primera cosa que pasa en la página: la hoja se prepara
 * antes de que alguien escriba en ella.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24">
      {/* Capa 1 — los renglones */}
      <div
        aria-hidden="true"
        className={`${styles.rules} ${styles.papelHero} absolute inset-x-0 top-0 h-[1100px]`}
      />
      {/* Capa 2 — el margen del cuaderno, dos líneas juntas */}
      <div
        aria-hidden="true"
        className={`${styles.margin} ${styles.margenBrand} absolute top-0 left-6 h-[900px] w-px lg:left-24`}
      />
      <div
        aria-hidden="true"
        className={`${styles.margin} ${styles.margenBrand} absolute top-0 left-[30px] h-[900px] w-px lg:left-[102px]`}
      />
      {/* Capa 3 — el margen derecho, neutro: cierra la hoja sin competir */}
      <div
        aria-hidden="true"
        className={`${styles.margin} ${styles.margenNeutro} absolute top-0 right-6 h-[900px] w-px lg:right-24`}
      />
      {/* Capa 4 — el resplandor, que nace justo donde va a aterrizar el panel */}
      <div
        aria-hidden="true"
        className={`${styles.glow} ${styles.resplandorHero} pointer-events-none absolute top-[700px] left-1/2 h-[520px] w-[1000px] -translate-x-1/2 rounded-full`}
      />

      <NavLanding />

      <div className="relative mx-auto flex max-w-[1152px] flex-col items-center gap-7 px-6 pt-16 text-center lg:pt-24">
        <span
          className={`${styles.drop} flex items-center gap-2.5 rounded-full border border-border bg-card py-1.5 pr-4 pl-2 text-[13px] font-medium`}
        >
          <span className="flex size-[22px] items-center justify-center rounded-full bg-rail">
            <Destello className="text-brand" />
          </span>
          Contabilidad auditada por IA
        </span>

        {/* Cada línea vive dentro de una máscara con `overflow: hidden` y sube
            desde debajo. Por eso el padding lateral y el inferior: sin ellos la
            máscara recorta las cursivas y las descendentes. */}
        <h1 className="m-0 font-serif text-[clamp(2.75rem,8.5vw,6.5rem)] leading-[0.98] tracking-[-2.5px] text-foreground">
          <span className="block overflow-hidden px-[0.06em] pb-[0.08em]">
            <span className={`${styles.line} ${styles.l1}`}>Tú subes la factura.</span>
          </span>
          <span className="block overflow-hidden px-[0.1em] pb-[0.14em]">
            <span className={`${styles.line} ${styles.l2}`}>
              La contabilidad se hace{" "}
              <span className="relative inline-block italic text-brand-text">
                sola.
                {/* El trazo se dibuja a mano, y llega después de la palabra:
                    primero se lee, después se subraya. */}
                <svg
                  aria-hidden="true"
                  width="100%"
                  height="18"
                  viewBox="0 0 200 18"
                  preserveAspectRatio="none"
                  className="absolute bottom-[-2px] left-0 overflow-visible"
                >
                  <path
                    className={styles.ink}
                    d="M4 12 C 50 4, 120 4, 196 10"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
          </span>
        </h1>

        <p
          className={`${styles.up} ${styles.u1} m-0 max-w-[620px] text-lg leading-relaxed text-muted-foreground sm:text-[19px]`}
        >
          Registra compras y ventas, aplica el PUC y genera cada asiento de forma automática.
          Una IA revisa todo antes de que llegue a tus libros.
        </p>

        <div className={`${styles.up} ${styles.u2} mt-1 flex flex-wrap justify-center gap-3`}>
          <a
            href="#como"
            className={`${styles.flecha} flex h-13 items-center gap-2.5 rounded-[0.6rem] bg-primary px-6 text-[15px] font-medium text-primary-foreground no-underline`}
          >
            Ver cómo funciona
            <Flecha />
          </a>
          <a
            href="#auditoria"
            className="flex h-13 items-center rounded-[0.6rem] border border-input bg-card px-6 text-[15px] font-medium text-foreground no-underline"
          >
            Cómo se audita
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-[1152px] px-6">
        <PanelFlujo />
      </div>
    </section>
  );
}
