"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { descargarPdf } from "@/lib/descargar-pdf";

/**
 * Baja el PDF de un documento (un recibo, un comprobante) para imprimirlo.
 * Con `etiqueta` es un botón con texto («Ver») en vez del ícono.
 */
export function BotonImprimir({ ruta, nombre, etiqueta }: { ruta: string; nombre: string; etiqueta?: string }) {
  const [bajando, setBajando] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className={etiqueta ? "h-9 rounded-lg px-4" : "size-9 rounded-lg p-0"}
      aria-label={etiqueta ? `${etiqueta} ${nombre}` : `Imprimir ${nombre}`}
      title={etiqueta ? undefined : `Imprimir ${nombre}`}
      disabled={bajando}
      onClick={async () => {
        setBajando(true);
        try {
          await descargarPdf(ruta, `${nombre}.pdf`);
        } catch (e) {
          aviso.falla(e);
        } finally {
          setBajando(false);
        }
      }}
    >
      {bajando ? <Loader2 className="size-4 animate-spin" /> : etiqueta ? null : <Printer className="size-4" />}
      {etiqueta}
    </Button>
  );
}
