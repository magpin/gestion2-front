"use client";

import { useEffect, useState } from "react";

import { MariaClara } from "./MariaClara";

/**
 * La María del panel del hero: lee la factura —el arco avanza— y termina lista.
 *
 * Es la única pieza del hero con JavaScript: el cambio de estado no se puede
 * hacer en CSS sin copiar la cara. Los tiempos siguen la entrada del panel
 * (`landing.module.css`): el arco arranca cuando la tarjeta ya se ve, y el
 * «lista» llega junto con el sello del asiento.
 *
 * Con movimiento reducido salta directo al final: la vista completa y quieta.
 */
const ARRANCA_MS = 2300;
const DURA_MS = 1300;
const TERMINA_MS = 3800;

export function MariaDelPanel() {
  const [progreso, setProgreso] = useState(0);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setLista(true), 0);
      return () => clearTimeout(t);
    }
    let cuadro = 0;
    const inicio = performance.now() + ARRANCA_MS;
    const avanzar = (ahora: number) => {
      const p = Math.min(1, Math.max(0, (ahora - inicio) / DURA_MS));
      setProgreso(p);
      if (p < 1) cuadro = requestAnimationFrame(avanzar);
    };
    cuadro = requestAnimationFrame(avanzar);
    const fin = setTimeout(() => setLista(true), TERMINA_MS);
    return () => {
      cancelAnimationFrame(cuadro);
      clearTimeout(fin);
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      <MariaClara
        estado={lista ? "lista" : "leyendo"}
        tamano={72}
        intensidad={lista ? "calma" : undefined}
        progreso={lista ? undefined : progreso}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-rail-foreground">María</span>
        <span className="text-[13px] leading-snug text-rail-muted">
          {lista ? "Lista para tu aprobación" : "Leyendo la FE-2231…"}
        </span>
      </div>
    </div>
  );
}
