import Link from "next/link";
import { Marca } from "./Marca";
import styles from "../landing.module.css";

/**
 * Tres zonas: marca, píldora de anclas, y la puerta de entrada.
 *
 * La píldora central desaparece por debajo de 1024px. No se reemplaza por un
 * menú desplegable: son cinco anclas de la misma página, y abajo está el mismo
 * recorrido en orden. Un hamburguesa acá sería un botón que abre una lista de
 * atajos a lo que el dedo ya alcanza deslizando.
 */
const ANCLAS = [
  { href: "#como", texto: "Cómo funciona" },
  { href: "#funciones", texto: "Funciones" },
  { href: "#auditoria", texto: "Auditoría" },
  { href: "#para-quien", texto: "Para quién" },
  { href: "#preguntas", texto: "Preguntas" },
];

export function NavLanding() {
  return (
    <header
      className={`${styles.nav} relative flex h-20 items-center justify-between px-6 lg:px-12 xl:px-36`}
    >
      <Marca />

      <nav
        aria-label="Principal"
        className="hidden gap-9 rounded-full border border-border bg-card/70 px-7 py-2.5 text-sm backdrop-blur-lg lg:flex"
      >
        {ANCLAS.map(({ href, texto }) => (
          <a key={href} href={href} className={styles.enlaceNav}>
            {texto}
          </a>
        ))}
      </nav>

      <Link
        href="/login"
        className="flex h-10 items-center rounded-[0.6rem] bg-primary px-[18px] text-sm font-medium text-primary-foreground no-underline"
      >
        Iniciar sesión
      </Link>
    </header>
  );
}
