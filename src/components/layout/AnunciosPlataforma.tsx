"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Wrench, X } from "lucide-react";

import { api } from "@/core/api/api";
import { cn } from "@/lib/utils";

interface Anuncio {
  id: string;
  titulo: string;
  cuerpo: string;
  tono: "INFORMATIVO" | "MANTENIMIENTO";
}

const LLAVE = "anuncios-cerrados";

const cerradosAntes = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(LLAVE) ?? "[]") as string[];
  } catch {
    return [];
  }
};

/**
 * Los avisos que publica la administración del producto —un mantenimiento, una
 * novedad— como una franja arriba del área de trabajo. Se cierran por esta
 * pestaña; al volver a entrar se ven otra vez mientras estén vigentes.
 *
 * Si falla la consulta no se dice nada: un aviso que no llega no es un error
 * para quien está trabajando.
 */
export function AnunciosPlataforma() {
  const [cerrados, setCerrados] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : cerradosAntes(),
  );
  const { data } = useQuery({
    queryKey: ["anuncios-vigentes"],
    queryFn: () => api.get<Anuncio[]>("/anuncios/vigentes").then((r) => r.data),
    staleTime: 5 * 60_000,
    retry: false,
    meta: { silencioso: true },
  });

  const visibles = (data ?? []).filter((a) => !cerrados.includes(a.id));
  if (visibles.length === 0) return null;

  const cerrar = (id: string) => {
    const nuevos = [...cerrados, id];
    setCerrados(nuevos);
    try {
      sessionStorage.setItem(LLAVE, JSON.stringify(nuevos));
    } catch {
      // Sin sessionStorage se cierra solo en esta vista.
    }
  };

  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-10 lg:px-14">
      {visibles.map((a) => {
        const Icono = a.tono === "MANTENIMIENTO" ? Wrench : Info;
        return (
          <div
            key={a.id}
            role="status"
            className={cn(
              "mx-auto flex w-full max-w-7xl items-start gap-3 rounded-xl border p-3 text-sm",
              a.tono === "MANTENIMIENTO" ? "border-warning bg-warning/10" : "border-info bg-info/10",
            )}
          >
            <Icono
              className={cn("mt-0.5 size-4 shrink-0", a.tono === "MANTENIMIENTO" ? "text-warning" : "text-info")}
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{a.titulo}</span>
              <span className="text-muted-foreground">{a.cuerpo}</span>
            </div>
            <button
              type="button"
              onClick={() => cerrar(a.id)}
              aria-label="Cerrar el aviso"
              className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-foreground/5"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
