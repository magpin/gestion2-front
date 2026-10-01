import { CarruselPantallas } from "./CarruselPantallas";
import { DemoMaria } from "./DemoMaria";
import { Rotulo, TituloSeccion } from "./Marca";
import styles from "../landing.module.css";

/**
 * «02 — Por dentro»: María en acción y las pantallas de verdad.
 *
 * Sobre el riel oscuro, con la trama de puntos: es la única sección que
 * muestra el producto mismo, y el fondo la separa de las que lo cuentan.
 */
export function PorDentro() {
  return (
    <section
      id="por-dentro"
      className={`${styles.ancla} ${styles.trama} py-18 text-rail-foreground sm:py-24 lg:py-32`}
    >
      <div className="mx-auto flex max-w-[1152px] flex-col gap-10 px-6 lg:gap-14">
        <div className={`${styles.rv} flex flex-col gap-4.5`}>
          <span className="[&_*]:text-rail-muted">
            <Rotulo>02 — Por dentro</Rotulo>
          </span>
          <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
            María, <span className="italic text-brand">en acción.</span>
          </TituloSeccion>
        </div>

        <DemoMaria />

        <CarruselPantallas />
      </div>
    </section>
  );
}
