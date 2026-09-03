"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ciiuApi } from "../services/catalogos.service";

/**
 * El catálogo CIIU Rev. 4 A.C., para consultar.
 *
 * Se navega de arriba hacia abajo —sección › división › grupo › clase— porque
 * quien no conoce el código no puede buscarlo por nombre: "vendo repuestos"
 * no aparece escrito en ninguna parte del catálogo del DANE.
 *
 * La clase de cuatro dígitos es la que va en el RUT y la que referencia la
 * actividad económica de la empresa.
 */
export function CiiuView() {
  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState<string | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const consulta = busqueda.trim();
  const buscando = consulta.length >= 2;

  const { data: secciones = [] } = useQuery({
    queryKey: ["ciiu", "secciones"],
    queryFn: ciiuApi.secciones,
    staleTime: 60 * 60_000,
  });

  const { data: divisiones = [] } = useQuery({
    queryKey: ["ciiu", "divisiones", seccion],
    queryFn: () => ciiuApi.divisiones(seccion!),
    enabled: Boolean(seccion) && !buscando,
    staleTime: 60 * 60_000,
  });

  const { data: clases = [], isFetching } = useQuery({
    queryKey: ["ciiu", "clases", consulta, division],
    queryFn: () =>
      ciiuApi.buscar(buscando ? { q: consulta } : { division: division! }),
    enabled: buscando || Boolean(division),
    staleTime: 10 * 60_000,
  });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Actividades económicas (CIIU)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisión 4 adaptada para Colombia. Resolución DIAN 000114 de 2020.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Código o actividad: 4741, computadores…"
          className="pl-9"
          aria-label="Buscar actividad económica"
        />
      </div>

      {buscando ? (
        <ListaClases clases={clases} cargando={isFetching} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <Columna titulo="Sección">
            {secciones.map((s) => (
              <Fila
                key={s.codigo}
                activo={s.codigo === seccion}
                onClick={() => {
                  setSeccion(s.codigo);
                  setDivision(null);
                }}
              >
                <span className="w-5 shrink-0 font-mono text-xs">{s.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{s.nombre}</span>
              </Fila>
            ))}
          </Columna>

          <Columna titulo="División" vacio={!seccion ? "Elegí una sección" : undefined}>
            {divisiones.map((d) => (
              <Fila
                key={d.codigo}
                activo={d.codigo === division}
                onClick={() => setDivision(d.codigo)}
              >
                <span className="w-6 shrink-0 font-mono text-xs">{d.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{d.nombre}</span>
              </Fila>
            ))}
          </Columna>

          <Columna titulo="Clase" vacio={!division ? "Elegí una división" : undefined}>
            {clases.map((c) => (
              <Fila key={c.codigo}>
                <span className="w-9 shrink-0 font-mono text-xs">{c.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
              </Fila>
            ))}
          </Columna>
        </div>
      )}
    </div>
  );
}

function Columna({
  titulo,
  vacio,
  children,
}: {
  titulo: string;
  vacio?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <h2 className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
        {titulo}
      </h2>
      {vacio ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">{children}</ul>
      )}
    </section>
  );
}

function Fila({
  activo,
  onClick,
  children,
}: {
  activo?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const clases = `flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
    activo ? "bg-accent font-medium" : ""
  }`;

  if (!onClick) return <li className={clases}>{children}</li>;

  return (
    <li>
      <button type="button" onClick={onClick} className={`${clases} transition-colors hover:bg-accent`}>
        {children}
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

function ListaClases({
  clases,
  cargando,
}: {
  clases: Array<{ codigo: string; nombre: string; origen: string; seccion_nombre: string | null }>;
  cargando: boolean;
}) {
  if (cargando) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {clases.map((c) => (
        <li key={c.codigo} className="flex items-baseline gap-3 px-3 py-2 text-sm">
          <span className="w-10 shrink-0 font-mono text-xs">{c.codigo}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{c.nombre}</span>
            {c.seccion_nombre && (
              <span className="block truncate text-[11px] text-muted-foreground">
                {c.seccion_nombre}
              </span>
            )}
          </span>
          {/* Las cinco de origen DIAN no son actividades: son para personas
              naturales sin ninguna (asalariado, pensionado, rentista). */}
          {c.origen === "DIAN" && (
            <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
              sin actividad
            </span>
          )}
        </li>
      ))}
      {clases.length === 0 && (
        <li className="px-3 py-8 text-center text-sm text-muted-foreground">Sin resultados</li>
      )}
    </ul>
  );
}
