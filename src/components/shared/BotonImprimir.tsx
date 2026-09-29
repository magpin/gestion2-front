"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { descargarPdf } from "@/lib/descargar-pdf";

/** Baja el PDF de un documento (un recibo, un comprobante) para imprimirlo. */
export function BotonImprimir({ ruta, nombre }: { ruta: string; nombre: string }) {
  const [bajando, setBajando] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="size-9 rounded-lg p-0"
      aria-label={`Imprimir ${nombre}`}
      title={`Imprimir ${nombre}`}
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
      {bajando ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
    </Button>
  );
}
