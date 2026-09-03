"use client";

import { type ReactNode } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { Check, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchPickerProps<TItem> {
  query: string;
  onQueryChange: (valor: string) => void;
  items: TItem[];
  isLoading?: boolean;
  getKey: (item: TItem) => string;
  renderItem: (item: TItem) => ReactNode;
  onSelect: (item: TItem) => void;
  placeholder?: string;
  // Etiqueta del elemento ya seleccionado (se muestra cuando no se está editando).
  etiquetaSeleccion?: string | null;
  onLimpiar?: () => void;
  invalido?: boolean;
  // Si true, conserva el texto tecleado cuando el input pierde foco (blur/submit) en vez de
  // resetearlo. Necesario para campos de "producto libre": el Combobox por defecto borra lo
  // escrito al hacer focus-out si no corresponde a un item seleccionado.
  conservarTextoLibre?: boolean;
}

// Picker de búsqueda: input + dropdown de resultados, con navegación por teclado
// (flechas/Enter/Escape) y roles ARIA combobox/listbox. El padre controla query y lista.
//
// Reason: el dropdown se renderiza en un portal (Base UI Combobox) para escapar del
// `overflow-hidden` y del stacking context (backdrop-blur) de las Card que lo
// contienen; si no, queda recortado y por detrás de las tarjetas hermanas. `filter={null}`
// desactiva el filtrado en cliente porque la búsqueda ya es server-side (el padre filtra).
export function SearchPicker<TItem>({
  query,
  onQueryChange,
  items,
  isLoading = false,
  getKey,
  renderItem,
  onSelect,
  placeholder = "Buscar…",
  etiquetaSeleccion,
  onLimpiar,
  invalido = false,
  conservarTextoLibre = false,
}: SearchPickerProps<TItem>) {
  if (etiquetaSeleccion) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-2",
          invalido && "border-destructive",
        )}
      >
        <span className="truncate text-sm text-foreground">
          {etiquetaSeleccion}
        </span>
        {onLimpiar && (
          <button
            type="button"
            onClick={onLimpiar}
            aria-label="Cambiar selección"
            className="shrink-0 rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  return (
    <ComboboxPrimitive.Root
      items={items}
      filter={null}
      inputValue={query}
      onInputValueChange={(valor, detalles) => {
        // Reason: en modo texto libre, ignorar los resets que el Combobox dispara al cerrar sin
        // selección para no borrar lo que el usuario escribió. Base UI 1.5 emite "input-clear"
        // al cerrar el popup sin elegir item (AriaCombobox handleUnmount) además de
        // "focus-out"/"none". El typing real llega como "input-change" y sí se propaga.
        const motivo = (detalles as { reason?: string } | undefined)?.reason;
        if (
          conservarTextoLibre &&
          (motivo === "focus-out" || motivo === "none" || motivo === "input-clear")
        ) {
          return;
        }
        onQueryChange(valor);
      }}
      onValueChange={(item) => {
        if (item) {
          onSelect(item as TItem);
        }
      }}
      itemToStringValue={(item) => getKey(item as TItem)}
    >
      <div className="relative">
        <Search
          size={15}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/70"
        />
        <ComboboxPrimitive.Input
          render={
            <Input
              placeholder={placeholder}
              className={cn("pl-9", invalido && "border-destructive")}
            />
          }
        />
        {isLoading && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 animate-spin text-muted-foreground/70"
          />
        )}
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          // Reason: mantener SIEMPRE el lado inferior (nunca voltear hacia
          // arriba al elegir cerca del fondo del modal); si no cabe, solo se
          // desplaza para encajar dentro del viewport.
          collisionAvoidance={{ side: "shift", align: "shift" }}
          className="isolate z-[60] w-[var(--anchor-width)]"
        >
          <ComboboxPrimitive.Popup className="max-h-[min(16rem,var(--available-height))] w-full origin-[var(--transform-origin)] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-hidden transition-[opacity,transform] duration-150 ease-out data-[ending-style]:-translate-y-1 data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0">
            <ComboboxPrimitive.Empty className="px-3 py-2 text-sm text-muted-foreground/70">
              {isLoading ? "Buscando…" : "Sin resultados"}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: TItem) => (
                <ComboboxPrimitive.Item
                  key={getKey(item)}
                  value={item}
                  className="group/item flex w-full cursor-default items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground outline-hidden transition-colors data-highlighted:bg-muted"
                >
                  <Check
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-primary opacity-0 group-data-highlighted/item:opacity-100"
                  />
                  <span className="min-w-0 flex-1">{renderItem(item)}</span>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
