import Link from "next/link";
import { Flecha, Marca, NOMBRE_SISTEMA } from "./Marca";
import { MariaClara } from "./MariaClara";
import styles from "../landing.module.css";

/**
 * El cierre y el pie, sobre la misma superficie oscura.
 *
 * Acá el papel contable vuelve invertido —renglones claros sobre riel— y los
 * dos márgenes naranjas atraviesan la sección enteros, sin desvanecerse: en el
 * hero la hoja empieza, acá termina.
 *
 * Es el único lugar donde el naranja es texto sobre oscuro. Ahí sí alcanza
 * contraste de lectura (~5.2:1) y el reglamento lo permite; sobre claro habría
 * que usar `brand-text`, que es lo que hace el resto de la página.
 */
export function Cierre() {
  return (
    <>
      <section
        data-cierre
        className={`${styles.papelCierre} relative flex flex-col items-center justify-center gap-7 overflow-hidden bg-rail px-6 py-28 text-center text-rail-foreground lg:py-35`}
      >
        <div
          aria-hidden="true"
          className={`${styles.resplandorCierre} pointer-events-none absolute top-1/2 left-1/2 h-[420px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full`}
        />
        <div
          aria-hidden="true"
          className={`${styles.margenCierre} absolute inset-y-0 left-6 w-px lg:left-24`}
        />
        <div
          aria-hidden="true"
          className={`${styles.margenCierre} absolute inset-y-0 left-[30px] w-px lg:left-[102px]`}
        />

        {/* María, contenta: terminó y no queda nada. Reemplaza al destello. */}
        <MariaClara estado="lista" tamano={64} intensidad="calma" className={`${styles.rv} relative`} />

        <h2
          className={`${styles.rv} relative m-0 max-w-[980px] font-serif text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.98] tracking-[-2px]`}
        >
          La contabilidad que se hace sola,{" "}
          <span className="italic text-brand">con su firma.</span>
        </h2>

        <p
          className={`${styles.rv} relative m-0 max-w-[520px] text-lg leading-relaxed text-rail-muted`}
        >
          María propone. Usted decide.
        </p>

        <Link
          href="/login"
          className={`${styles.rv} ${styles.flecha} relative mt-3 flex h-13 items-center gap-2.5 rounded-[0.6rem] bg-rail-foreground px-6.5 text-[15px] font-medium text-rail no-underline`}
        >
          Iniciar sesión
          <Flecha />
        </Link>
      </section>

      <footer className="flex flex-col gap-6 border-t border-rail-line bg-rail px-6 pt-9 pb-28 text-[13px] text-rail-muted sm:pb-9 lg:px-36">
        {/* La línea de María: lo que es y lo que no. */}
        <div className="flex items-start justify-center gap-2.5 text-center sm:justify-start sm:text-left">
          <MariaClara estado="reposo" tamano={20} className="mt-px shrink-0" />
          <span>
            María es una asistente de IA: propone asientos, no los firma. El criterio y la firma
            son del contador.
          </span>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Marca tamano={24} invertido conNombre={false} />
          <span>
            © {new Date().getFullYear()} {NOMBRE_SISTEMA} · Hecho en Colombia
          </span>
        </div>
        <nav className="flex gap-6" aria-label="Legal">
          <Link href="/terminos" className="text-rail-muted no-underline hover:text-rail-foreground">
            Términos
          </Link>
          <Link
            href="/tratamiento-de-datos"
            className="text-rail-muted no-underline hover:text-rail-foreground"
          >
            Tratamiento de datos
          </Link>
          <Link href="/contacto" className="text-rail-muted no-underline hover:text-rail-foreground">
            Contacto
          </Link>
        </nav>
        </div>
      </footer>
    </>
  );
}
