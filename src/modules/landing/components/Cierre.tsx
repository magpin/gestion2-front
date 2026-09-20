import Link from "next/link";
import { Destello, Flecha, Marca, NOMBRE_SISTEMA } from "./Marca";
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

        <Destello size={32} className={`${styles.rv} relative text-brand`} />

        <h2
          className={`${styles.rv} relative m-0 max-w-[980px] font-serif text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.98] tracking-[-2px]`}
        >
          La contabilidad que se hace sola,{" "}
          <span className="italic text-brand">y se revisa sola.</span>
        </h2>

        <p
          className={`${styles.rv} relative m-0 max-w-[520px] text-lg leading-relaxed text-rail-muted`}
        >
          Tú decides. La IA hace el resto.
        </p>

        <Link
          href="/login"
          className={`${styles.rv} ${styles.flecha} relative mt-3 flex h-13 items-center gap-2.5 rounded-[0.6rem] bg-rail-foreground px-6.5 text-[15px] font-medium text-rail no-underline`}
        >
          Iniciar sesión
          <Flecha />
        </Link>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-rail-line bg-rail px-6 py-9 text-[13px] text-rail-muted sm:flex-row lg:px-36">
        <div className="flex items-center gap-2.5">
          <Marca tamano={24} invertido conNombre={false} />
          <span>
            © {new Date().getFullYear()} {NOMBRE_SISTEMA} · Hecho en Colombia
          </span>
        </div>
        <nav className="flex gap-6" aria-label="Legal">
          <a href="#" className="text-rail-muted no-underline hover:text-rail-foreground">
            Términos
          </a>
          <a href="#" className="text-rail-muted no-underline hover:text-rail-foreground">
            Tratamiento de datos
          </a>
          <a href="#" className="text-rail-muted no-underline hover:text-rail-foreground">
            Contacto
          </a>
        </nav>
      </footer>
    </>
  );
}
