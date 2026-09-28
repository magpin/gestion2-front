import { Hero } from "../components/Hero";
import { BandaPuc } from "../components/BandaPuc";
import { ConoceAMaria } from "../components/ConoceAMaria";
import { PorDentro } from "../components/PorDentro";
import { Funciones } from "../components/Funciones";
import { Revision } from "../components/Revision";
import { Certeza } from "../components/Certeza";
import { ParaQuien } from "../components/ParaQuien";
import { Preguntas } from "../components/Preguntas";
import { Cierre } from "../components/Cierre";
import { BarraMovil } from "../components/BarraMovil";

/**
 * La cara pública del sistema, con María como protagonista.
 *
 * Referencia: `mocks/landing-maria/landing-maria/1-landing/index.html`; textos en
 * `docs/planes/landing-maria-textos.md` (voseo, y nada que el producto no haga
 * hoy — lo que falta está en `docs/planes/funciones-faltantes.md`).
 *
 * Casi todo sigue siendo Server Component con animaciones en CSS. Llevan
 * JavaScript solo las piezas que lo necesitan: María del panel del hero, el
 * recorrido atado al scroll, el demo, el carrusel de pantallas y la barra del
 * celular.
 *
 * Las superficies alternan: papel, riel, blanco, riel, papel, blanco, papel,
 * blanco, papel, riel. Cada sección se despega de la anterior sin una línea
 * divisoria de más.
 */
export function LandingView() {
  return (
    <main className="bg-background">
      <Hero />
      <BandaPuc />
      <ConoceAMaria />
      <PorDentro />
      <Funciones />
      <Revision />
      <Certeza />
      <ParaQuien />
      <Preguntas />
      <Cierre />
      <BarraMovil />
    </main>
  );
}
