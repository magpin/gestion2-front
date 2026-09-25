"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Maria } from "@/modules/asistente/components/Maria";

/**
 * La barra de abajo, solo en el celular: «Conocé a María» e «Iniciar sesión»
 * donde está el pulgar.
 *
 * Aparece cuando el cuerpo del hero ya se fue —sus botones dejaron de verse— y
 * se esconde al llegar al cierre, que ya tiene su propio botón. Mientras está
 * escondida no se puede enfocar ni tocar.
 */
export function BarraMovil() {
  const [heroFuera, setHeroFuera] = useState(false);
  const [enCierre, setEnCierre] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("[data-hero-cuerpo]");
    const cierre = document.querySelector("[data-cierre]");
    const observadores: IntersectionObserver[] = [];
    if (hero) {
      const o = new IntersectionObserver(([e]) => setHeroFuera(!e!.isIntersecting), {
        rootMargin: "-60% 0px 0px 0px",
      });
      o.observe(hero);
      observadores.push(o);
    }
    if (cierre) {
      const o = new IntersectionObserver(([e]) => setEnCierre(e!.isIntersecting));
      o.observe(cierre);
      observadores.push(o);
    }
    return () => observadores.forEach((o) => o.disconnect());
  }, []);

  const visible = heroFuera && !enCierre;

  return (
    <nav
      aria-label="Acciones rápidas"
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 flex gap-2 rounded-2xl border border-rail-line bg-rail/92 p-2 backdrop-blur-md transition-transform duration-350 ease-out motion-reduce:transition-none sm:hidden ${
        visible ? "translate-y-0" : "translate-y-[140%]"
      }`}
    >
      <a
        href="#como"
        className="flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-xl border border-rail-line text-sm font-medium text-rail-foreground no-underline"
      >
        <span className="inline-flex [--primary-foreground:var(--neutral-900)] [--primary:var(--neutral-0)]">
          <Maria estado="reposo" tamano={22} />
        </span>
        Conocé a María
      </a>
      <Link
        href="/login"
        className="flex h-12 flex-1 items-center justify-center rounded-xl bg-rail-foreground text-sm font-medium text-rail no-underline"
      >
        Iniciar sesión
      </Link>
    </nav>
  );
}
