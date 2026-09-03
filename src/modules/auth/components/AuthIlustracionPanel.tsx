"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IlustracionDataAtWork } from "./IlustracionDataAtWork";
import { IlustracionDataInput } from "./IlustracionDataInput";
import { IlustracionPercentages } from "./IlustracionPercentages";

// Panel derecho del login. Decorativo: aria-hidden y oculto en móvil, donde
// robaría la pantalla al formulario sin aportar nada.
//
// Los valores --ilu-* los consumen los SVG generados. Se declaran acá y no en
// globals.css porque son de esta pantalla, no del sistema: utilidades arbitrarias
// de Tailwind, sin CSS propio.
//
// El tema oscuro invierte la luminosidad de las superficies (tinta y papel
// cambian de lado) pero NO la piel: una piel invertida deja de leerse como piel,
// se va a verdoso.
const TEMA_ILUSTRACION = [
  "[--ilu-accent:#f25623]",
  "[--ilu-tinta:#090814]",
  "[--ilu-oscuro:#3f3d56]",
  "[--ilu-carbon:#2f2e41]",
  "[--ilu-lavanda:#d6d6e3]",
  "[--ilu-gris:#e6e6e6]",
  "[--ilu-nube:#f2f2f2]",
  "[--ilu-medio:#cccccc]",
  "[--ilu-piel:#ed9da0]",
  "[--ilu-piel2:#ffb6b6]",
  "[--ilu-papel:#ffffff]",
].join(" ");

interface FlotanteProps {
  className: string;
  // Amplitud, duración y retraso distintos por pieza: si las tres suben y bajan
  // al mismo tiempo el collage se lee como un solo bloque temblando.
  amplitud: number;
  duracion: number;
  retraso: number;
  quieto: boolean;
  children: ReactNode;
}

function Flotante({
  className,
  amplitud,
  duracion,
  retraso,
  quieto,
  children,
}: FlotanteProps) {
  return (
    <motion.div
      className={className}
      animate={quieto ? undefined : { y: [0, -amplitud, 0] }}
      transition={{
        duration: duracion,
        delay: retraso,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

export function AuthIlustracionPanel() {
  const quieto = useReducedMotion() ?? false;

  return (
    <div
      aria-hidden="true"
      className={`order-1 flex items-center justify-center px-6 pb-2 pt-8 md:order-2 md:p-10 lg:p-14 ${TEMA_ILUSTRACION}`}
    >
      {/* Grilla y no posiciones absolutas: el collage tiene que aguantar
          cualquier alto de ventana sin que las piezas se monten entre sí. */}
      <div className="grid w-full max-w-3xl grid-cols-1 items-center gap-x-6 gap-y-8 md:grid-cols-5">
        {/* En móvil el collage no cabe sin comerse el formulario: queda solo la
            principal, acotada en alto para que los campos entren sin scroll. */}
        <Flotante
          className="hidden md:col-span-2 md:col-start-1 md:row-start-1 md:block"
          amplitud={12}
          duracion={5.5}
          retraso={0.8}
          quieto={quieto}
        >
          <IlustracionDataInput />
        </Flotante>

        <Flotante
          className="mx-auto w-full max-w-[17rem] md:col-span-3 md:col-start-3 md:row-span-2 md:row-start-1 md:mx-0 md:max-w-none"
          amplitud={20}
          duracion={7}
          retraso={0}
          quieto={quieto}
        >
          <IlustracionDataAtWork />
        </Flotante>

        <Flotante
          className="hidden md:col-span-2 md:col-start-1 md:row-start-2 md:block"
          amplitud={14}
          duracion={6.3}
          retraso={1.6}
          quieto={quieto}
        >
          <IlustracionPercentages />
        </Flotante>
      </div>
    </div>
  );
}
