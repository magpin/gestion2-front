/**
 * El logo y el nombre. Tres trazos que decrecen —como las líneas de un
 * asiento— y el más corto en naranja: el detalle que la IA revisa.
 *
 * `invertido` es para las superficies oscuras (el pie y el panel del login):
 * el cuadro pasa a claro y los trazos a oscuros. El trazo naranja no se
 * invierte nunca; es el mismo en los dos.
 */

import stylesLanding from "../landing.module.css";

export const NOMBRE_SISTEMA = "ERP Gestión";

interface MarcaProps {
  /** 32px por omisión (nav y login); 24px en el pie. */
  tamano?: 24 | 32;
  invertido?: boolean;
  /** En el pie el nombre ya viene en la línea de copyright: ahí va solo el cuadro. */
  conNombre?: boolean;
}

export function Marca({ tamano = 32, invertido = false, conNombre = true }: MarcaProps) {
  const lado = tamano === 32 ? "size-8" : "size-6";
  const radio = tamano === 32 ? "rounded-[0.45rem]" : "rounded-[0.35rem]";
  const icono = tamano === 32 ? 18 : 14;
  const grosor = tamano === 32 ? 2 : 2.2;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${lado} ${radio} flex items-center justify-center ${
          invertido ? "bg-rail-foreground" : "bg-primary"
        }`}
      >
        <svg
          width={icono}
          height={icono}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path
            d="M5 8h14"
            className={invertido ? "stroke-rail" : "stroke-primary-foreground"}
          />
          <path
            d="M5 13h9"
            className={invertido ? "stroke-rail" : "stroke-primary-foreground"}
          />
          <path d="M17 17h2" className="stroke-brand" />
        </svg>
      </div>
      {conNombre && (
        <span className="text-[15px] font-semibold tracking-[-0.2px]">{NOMBRE_SISTEMA}</span>
      )}
    </div>
  );
}

/** El destello de la IA. Aparece en el badge del hero, en el panel y en el cierre. */
export function Destello({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2c.6 4.8 2.7 7.4 8 8.5v1c-5.3 1.1-7.4 3.7-8 8.5h-1c-.6-4.8-2.7-7.4-8-8.5v-1c5.3-1.1 7.4-3.7 8-8.5z" />
    </svg>
  );
}

/** La flecha de los botones. Avanza 3px al pasar el cursor (la clase la pone quien la usa). */
export function Flecha({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

/** El visto de las listas y las verificaciones. */
export function Visto({
  size = 18,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

/**
 * El titular de una sección, que se escribe al llegar.
 *
 * Dos capas: la de afuera recorta, la de adentro sube desde debajo del recorte
 * a medida que la sección entra en pantalla. Es el mismo gesto del titular del
 * hero —y el mismo keyframe—, solo que movido al scroll.
 *
 * El `className` —con el tamaño de letra— va en la **máscara**, no en el span
 * que se mueve. El padding que evita el recorte está en `em`, y `em` se
 * resuelve contra el tamaño de letra del propio elemento: puesto adentro, la
 * máscara seguiría midiendo 16px y le cortaría la cola a la cursiva de un
 * titular de 64.
 */
export function TituloSeccion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className="m-0">
      <span className={`${stylesLanding.escribeMascara} ${className ?? ""}`}>
        <span className={stylesLanding.rvEscribe}>{children}</span>
      </span>
    </h2>
  );
}

/**
 * El rótulo que abre cada sección: una rayita naranja y el número con su
 * nombre. Numerar acá sí dice algo — la página se lee en orden y cada sección
 * responde a la anterior.
 */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[1.2px] text-muted-foreground">
      <span className="h-0.5 w-3.5 bg-brand" />
      {children}
    </span>
  );
}
