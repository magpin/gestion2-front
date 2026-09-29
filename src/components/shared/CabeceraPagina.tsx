import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * La cabecera de una página de documento nuevo (pantallas 09, 10, 13 y 52):
 * la ruta en naranja —«EGRESOS / COMPRAS / NUEVA»—, el título con su punto y
 * el subtítulo. Los tramos con `href` llevan a su lista. `cuando` va después
 * de la ruta («EGRESOS / PAGOS · MIÉRCOLES 14 OCT») y `derecha`, el botón.
 */
export function CabeceraPagina({
  ruta,
  titulo,
  subtitulo,
  cuando,
  derecha,
}: {
  ruta: Array<{ etiqueta: string; href?: string }>;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  cuando?: string;
  derecha?: ReactNode;
}) {
  const cabecera = (
    <div>
      <nav
        aria-label="Ruta"
        className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text"
      >
        <span className="size-2 rounded-full bg-brand" />
        {ruta.map((t, i) => (
          <Fragment key={t.etiqueta}>
            {i > 0 && <span aria-hidden>/</span>}
            {t.href ? (
              <Link href={t.href} className="hover:underline">
                {t.etiqueta}
              </Link>
            ) : (
              <span>{t.etiqueta}</span>
            )}
          </Fragment>
        ))}
        {cuando && <span className="font-semibold normal-case tracking-normal text-muted-foreground">· {cuando}</span>}
      </nav>
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">
        {titulo}
        <span className="text-brand">.</span>
      </h1>
      {subtitulo && <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>}
    </div>
  );
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      {cabecera}
      {derecha}
    </header>
  );
}
