"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { avisarErrorVenta } from "../lib/errores";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleVenta } from "../components/DetalleVenta";
import { FormularioConvertirCotizacion } from "../components/FormularioConvertirCotizacion";
import { FormularioDocumentoVenta } from "../components/FormularioDocumentoVenta";
import { cotizacionesApi, facturasApi } from "../services/ventas.service";
import type {
  VentaDocumentoDetalle,
  VentaDocumentoResumen,
} from "../types/ventas.types";

const CLAVE = ["cotizaciones"];

/**
 * Cotizaciones: no asientan ni mueven inventario, así que no hay "anular"
 * acá — se hacen y se quedan como referencia. La única transición que
 * tienen es "Convertir a factura", que reusa sus líneas sin volver a
 * pedirlas (`FacturaService.convertirCotizacion` en el backend).
 */
export function CotizacionesSeccion() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("VENTAS", "DIRECTOR");

  const [pagina, setPagina] = useState(1);
  const [creando, setCreando] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [convirtiendo, setConvirtiendo] =
    useState<VentaDocumentoResumen | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: [...CLAVE, pagina],
    queryFn: () => cotizacionesApi.listar({ pagina }),
  });

  const { data: detalle } = useQuery({
    queryKey: [...CLAVE, "detalle", detalleId],
    queryFn: () => cotizacionesApi.porId(detalleId!),
    enabled: detalleId !== null,
  });

  const crear = useMutation({
    mutationFn: cotizacionesApi.crear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Cotización creada");
      setCreando(false);
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const convertir = useMutation({
    mutationFn: (datos: { cotizacionId: string; fecha: string }) =>
      facturasApi.convertirCotizacion(datos.cotizacionId, {
        fecha: datos.fecha,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({ queryKey: ["facturas"] });
      aviso.exito("Cotización convertida en factura");
      setConvirtiendo(null);
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const cotizaciones = resultado?.datos ?? [];

  return (
    <>
      {puedeCrear && (
        <div className="mb-6 flex justify-end">
          <Button
            className="h-12 rounded-xl px-6"
            onClick={() => setCreando(true)}
          >
            Nueva cotización
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : cotizaciones.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-20 text-center">
          <p className="text-lg font-semibold">Todavía no hay cotizaciones</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Acá van las propuestas de venta que aún no se facturan.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  {["Número", "Fecha", "Cliente", "Total", "Estado"].map(
                    (t) => (
                      <th key={t} scope="col" className="px-5 py-4">
                        {t}
                      </th>
                    ),
                  )}
                  <th scope="col" className="px-5 py-4 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cotizaciones.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-5 font-mono text-sm font-bold">
                      {c.prefijo ?? ""}
                      {c.consecutivo}
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(c.fecha)}
                    </td>
                    <td className="px-5 py-5 text-sm font-medium">
                      {c.tercero_nombre}
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
                      {formatCOP(Number(c.total))}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-2 text-[13px] font-semibold ${
                          c.estado === "CONVERTIDA"
                            ? "text-muted-foreground"
                            : "text-success"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            c.estado === "CONVERTIDA"
                              ? "bg-muted-foreground"
                              : "bg-success"
                          }`}
                        />
                        {c.estado === "CONVERTIDA" ? "Convertida" : "Vigente"}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="h-11 rounded-xl px-5 text-muted-foreground"
                          onClick={() => setDetalleId(c.id)}
                        >
                          Ver
                        </Button>
                        {puedeCrear && c.estado === "EMITIDA" && (
                          <Button
                            variant="ghost"
                            className="h-11 rounded-xl px-5 text-muted-foreground"
                            onClick={() => setConvirtiendo(c)}
                          >
                            <ArrowRightLeft className="size-4" />
                            Convertir a factura
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginador
            pagina={resultado?.pagina ?? 1}
            tamano={resultado?.tamano ?? 0}
            total={resultado?.total ?? 0}
            alCambiar={setPagina}
          />
        </section>
      )}

      <FormularioDocumentoVenta
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onGuardar={(datos) => crear.mutate(datos)}
        guardando={crear.isPending}
        titulo="Nueva cotización"
        descripcion="El precio de cada línea es el de lista vigente del producto."
        etiquetaBoton="Crear cotización"
      />

      <DetalleVenta
        documento={(detalle ?? null) as VentaDocumentoDetalle | null}
        onCerrar={() => setDetalleId(null)}
      />

      <FormularioConvertirCotizacion
        cotizacion={convirtiendo}
        onCerrar={() => setConvirtiendo(null)}
        onGuardar={(datos) =>
          convirtiendo &&
          convertir.mutate({ cotizacionId: convirtiendo.id, fecha: datos.fecha })
        }
        guardando={convertir.isPending}
      />
    </>
  );
}

function Paginador({
  pagina,
  tamano,
  total,
  alCambiar,
}: {
  pagina: number;
  tamano: number;
  total: number;
  alCambiar: (p: number) => void;
}) {
  const paginas = tamano > 0 ? Math.ceil(total / tamano) : 1;
  if (paginas <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
      <p className="text-sm text-muted-foreground">
        {(pagina - 1) * tamano + 1}–{Math.min(pagina * tamano, total)} de{" "}
        {total}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          disabled={pagina <= 1}
          onClick={() => alCambiar(pagina - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          {pagina} de {paginas}
        </span>
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          disabled={pagina >= paginas}
          onClick={() => alCambiar(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
