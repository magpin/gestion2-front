"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { reportesService } from "@/modules/reportes/services/reportes.service";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Los períodos con que un proveedor pide su certificado: el año (renta) o el
 * bimestre (IVA). El año en curso va hasta hoy.
 */
export function periodosCertificado(hoy: Date): Array<{
  clave: string;
  etiqueta: string;
  desde: string;
  hasta: string;
}> {
  const anio = hoy.getFullYear();
  // El último bimestre cerrado: ene-feb, mar-abr… El que va corriendo no.
  const inicioActual = Math.floor(hoy.getMonth() / 2) * 2;
  const inicio = new Date(anio, inicioActual - 2, 1);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 2, 0);
  const mes = (d: Date) => d.toLocaleDateString("es-CO", { month: "short" });
  return [
    {
      clave: "ANIO_PASADO",
      etiqueta: `Año ${anio - 1}`,
      desde: `${anio - 1}-01-01`,
      hasta: `${anio - 1}-12-31`,
    },
    {
      clave: "ESTE_ANIO",
      etiqueta: `Año ${anio}, hasta hoy`,
      desde: `${anio}-01-01`,
      hasta: iso(hoy),
    },
    {
      clave: "BIMESTRE",
      etiqueta: `Bimestre ${mes(inicio)}–${mes(fin)} ${fin.getFullYear()}`,
      desde: iso(inicio),
      hasta: iso(fin),
    },
  ];
}

/**
 * El certificado de retención de este tercero (plan motor de retenciones,
 * Fase 8, §8.5): lo que se le retuvo en el período, con la misma hoja que el
 * reporte de todos. Es como lo pide un proveedor.
 */
export function CertificadoTercero({ terceroId }: { terceroId: string }) {
  const periodos = periodosCertificado(new Date());
  const [clave, setClave] = useState(periodos[0].clave);
  const [bajando, setBajando] = useState(false);
  const periodo = periodos.find((p) => p.clave === clave) ?? periodos[0];

  const bajar = async () => {
    setBajando(true);
    try {
      await reportesService.descargar(
        "CERTIFICADOS_RETENCION",
        { tipo: "RANGO", desde: periodo.desde, hasta: periodo.hasta },
        "PDF",
        { terceroId },
      );
    } catch (e) {
      aviso.falla(e);
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
      <span className="text-sm">Certificado de retención</span>
      <div className="flex items-center gap-2">
        <select
          aria-label="Período del certificado"
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        >
          {periodos.map((p) => (
            <option key={p.clave} value={p.clave}>
              {p.etiqueta}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={bajando}
          onClick={() => void bajar()}
        >
          {bajando ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          PDF
        </Button>
      </div>
    </div>
  );
}
