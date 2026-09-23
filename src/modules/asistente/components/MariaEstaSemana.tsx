"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Maria } from "./Maria";
import { useSemanaDeMaria } from "../hooks/usePendientes";

/**
 * «María esta semana», en el tablero. Lámina `Aplicada` de `maria-identidad/`:
 * cara de 24 px en reposo y tres cifras.
 *
 * «Asientos aprobados» y no «asentados»: todo lo que está ahí lo aprobó una
 * persona. Lo que espera lleva el punto naranja —el acento señala— y lleva al
 * chat, que es donde se decide.
 */
export function MariaEstaSemana() {
  const semana = useSemanaDeMaria();
  const cifra = (n: number | undefined) => (n === undefined ? "…" : String(n));

  return (
    <section
      aria-labelledby="maria-semana"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3"
    >
      <h2 id="maria-semana" className="flex items-center gap-2 text-sm font-semibold">
        <Maria estado="reposo" tamano={24} />
        María esta semana
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <Cifra etiqueta="Documentos leídos" valor={cifra(semana?.leidos)} />
        <Cifra etiqueta="Asientos aprobados" valor={cifra(semana?.aprobados)} />
        <Link
          href="/dashboard/asistente"
          className="-m-1.5 flex items-center rounded-md p-1.5 transition-colors hover:bg-accent"
        >
          <Cifra
            etiqueta="Esperan tu revisión"
            valor={cifra(semana?.esperan)}
            punto={(semana?.esperan ?? 0) > 0}
          />
          <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </section>
  );
}

function Cifra({ etiqueta, valor, punto }: { etiqueta: string; valor: string; punto?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-xs text-muted-foreground">{etiqueta}</span>
      <span className="flex items-center gap-1.5 font-mono text-xl font-semibold tabular-nums">
        {valor}
        {punto && <span aria-hidden className="size-1.5 rounded-full bg-brand" />}
      </span>
    </div>
  );
}
