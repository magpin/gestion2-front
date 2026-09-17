"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { productosApi } from "../services/inventario.service";
import type { ProductoResumen } from "../types/inventario.types";

/** Lo que el bucket acepta, y lo que el diálogo de archivos ofrece. */
const ACEPTA = "image/jpeg,image/png,image/webp";

/** Tres megas. Más que eso es una foto que nadie miró antes de subirla. */
const MAXIMO_BYTES = 3 * 1024 * 1024;

/**
 * La imagen del producto: subirla, reemplazarla o quitarla.
 *
 * Solo aparece con el producto ya creado: la imagen se guarda contra su id, y
 * al dar de alta todavía no hay ninguno. Quien crea un producto lo abre
 * después y le pone la foto — un paso más, a cambio de no inventar un id
 * provisional que después haya que reconciliar.
 */
export function ImagenProducto({ producto }: { producto: ProductoResumen }) {
  const queryClient = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);

  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: ["productos"] });

  const subir = useMutation({
    mutationFn: (archivo: File) => productosApi.subirImagen(producto.id, archivo),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Imagen guardada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const quitar = useMutation({
    mutationFn: () => productosApi.quitarImagen(producto.id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Imagen quitada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const elegir = (archivo: File | undefined) => {
    if (archivo === undefined) return;
    // Se verifica acá y no después de subir: rebotarla cuando ya viajó por la
    // red es hacerle perder el tiempo a alguien por algo que se sabía antes.
    if (archivo.size > MAXIMO_BYTES) {
      aviso.error(
        `Esa imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 3 MB.`,
      );
      return;
    }
    subir.mutate(archivo);
  };

  const trabajando = subir.isPending || quitar.isPending;

  return (
    <div className="flex items-center gap-4">
      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-muted">
        {trabajando ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : producto.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="size-full object-cover"
          />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={entrada}
          type="file"
          accept={ACEPTA}
          className="hidden"
          onChange={(e) => {
            elegir(e.target.files?.[0]);
            // Se limpia para que elegir el mismo archivo dos veces seguidas
            // vuelva a disparar el `change`.
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={trabajando}
          onClick={() => entrada.current?.click()}
          className="h-10 rounded-xl px-4 text-sm"
        >
          {producto.imagen_clave === null ? "Subir imagen" : "Reemplazar"}
        </Button>
        {producto.imagen_clave !== null && (
          <Button
            type="button"
            variant="ghost"
            disabled={trabajando}
            onClick={() => quitar.mutate()}
            className="h-10 rounded-xl px-4 text-sm text-muted-foreground hover:text-danger"
          >
            <Trash2 className="size-4" />
            Quitar
          </Button>
        )}
        <p className="text-xs text-muted-foreground">JPG, PNG o WebP · 3 MB</p>
      </div>
    </div>
  );
}
