"use client";

import { Search } from "lucide-react";

import { useAbrirBuscador } from "./CromoPlataforma";

/** El acceso a Ctrl K en la cabecera de cada pantalla. En celular va en la barra. */
export function BotonBuscar() {
  const abrir = useAbrirBuscador();
  return (
    <button
      type="button"
      onClick={abrir}
      className="hidden h-10 w-[340px] items-center gap-2.5 rounded-lg border border-border bg-card px-3 text-left text-sm text-muted-foreground hover:bg-muted lg:flex xl:w-[380px]"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">Buscar cuenta, empresa, NIT o correo</span>
      <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd>
    </button>
  );
}
