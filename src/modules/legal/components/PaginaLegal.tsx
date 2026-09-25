import Link from "next/link";
import type { ReactNode } from "react";

import { Marca, NOMBRE_SISTEMA } from "@/modules/landing/components/Marca";

/**
 * El marco de las páginas legales: marca, título, fecha de vigencia y el texto.
 *
 * Son páginas públicas (fuera del `matcher` de `proxy.ts`) y Server Components
 * sin JavaScript. Los datos del responsable que todavía no están confirmados
 * van marcados con `<PorCompletar>`, y mientras quede alguno la página dice
 * arriba que es un borrador.
 */
export function PaginaLegal({
  titulo,
  vigencia,
  borrador = true,
  children,
}: {
  titulo: string;
  vigencia: string;
  borrador?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border px-6 sm:h-20 lg:px-12 xl:px-36">
        <Link href="/" className="no-underline" aria-label={`${NOMBRE_SISTEMA}, inicio`}>
          <Marca />
        </Link>
        <Link href="/" className="text-sm text-muted-foreground no-underline hover:text-foreground">
          Volver al inicio
        </Link>
      </header>

      <article className="mx-auto flex max-w-[760px] flex-col gap-8 px-6 py-12 sm:py-16">
        {borrador && (
          <p className="m-0 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            <strong>Borrador pendiente de revisión legal.</strong> Los datos marcados{" "}
            <PorCompletar>así</PorCompletar> todavía no están confirmados.
          </p>
        )}
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-serif text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.05] tracking-[-1px]">
            {titulo}
          </h1>
          <p className="m-0 text-sm text-muted-foreground">Vigente desde el {vigencia}.</p>
        </div>
        <div className="flex flex-col gap-8 text-[15px] leading-[1.7] [&_h2]:m-0 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-0.3px] [&_li]:mt-1.5 [&_ol]:m-0 [&_ol]:pl-5 [&_p]:m-0 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_section]:flex [&_section]:flex-col [&_section]:gap-3 [&_strong]:text-foreground [&_ul]:m-0 [&_ul]:pl-5">
          {children}
        </div>
      </article>

      <footer className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-8 text-[13px] text-muted-foreground sm:flex-row lg:px-36">
        <span>
          © {new Date().getFullYear()} {NOMBRE_SISTEMA} · Hecho en Colombia
        </span>
        <nav aria-label="Legal" className="flex gap-6">
          <Link href="/terminos" className="text-muted-foreground no-underline hover:text-foreground">
            Términos
          </Link>
          <Link
            href="/tratamiento-de-datos"
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Tratamiento de datos
          </Link>
          <Link href="/contacto" className="text-muted-foreground no-underline hover:text-foreground">
            Contacto
          </Link>
        </nav>
      </footer>
    </main>
  );
}

/** Un dato todavía sin confirmar: se ve a simple vista para que nadie lo publique así. */
export function PorCompletar({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-warning/20 px-1 text-foreground">[{children}]</mark>
  );
}

/** El correo de soporte que ya usa el login. */
export const CORREO_SOPORTE = "soporte@erpgestion.co";
