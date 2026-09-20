import { Hero } from "../components/Hero";
import { BandaPuc } from "../components/BandaPuc";
import { ComoFunciona } from "../components/ComoFunciona";
import { Funciones } from "../components/Funciones";
import { Auditoria } from "../components/Auditoria";
import { ParaQuien } from "../components/ParaQuien";
import { Preguntas } from "../components/Preguntas";
import { Cierre } from "../components/Cierre";

/**
 * La cara pública del sistema.
 *
 * Ni un `"use client"` en todo el módulo: no hay estado, no hay eventos, y las
 * animaciones —incluida la entrada de cuatro segundos y el revelado al hacer
 * scroll— son CSS. La página no envía JavaScript propio al navegador.
 *
 * El orden de las superficies alterna a propósito: papel, riel, blanco, papel,
 * blanco, papel, blanco, riel. Cada sección se despega de la anterior sin una
 * sola línea divisoria de más.
 */
export function LandingView() {
  return (
    <main className="bg-background">
      <Hero />
      <BandaPuc />
      <ComoFunciona />
      <Funciones />
      <Auditoria />
      <ParaQuien />
      <Preguntas />
      <Cierre />
    </main>
  );
}
