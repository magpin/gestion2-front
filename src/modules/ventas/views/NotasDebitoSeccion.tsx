"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus, Loader2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { avisarErrorVenta } from "../lib/errores";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleVenta } from "../components/DetalleVenta";
import { FormularioNotaDebito } from "../components/FormularioNotaDebito";
import { notasDebitoApi } from "../services/ventas.service";
import type {
  VentaDocumentoDetalle,
  VentaDocumentoResumen,
} from "../types/ventas.types";

const CLAVE = ["notas-debito"];

/**
 * Notas débito: le cobran más al cliente sobre una factura ya emitida. Misma
 * forma que la pestaña de notas crédito —y a propósito: son documentos
 * hermanos y quien usa una encuentra la otra donde espera—, con una
 * diferencia que se ve en la lista: acá el total *suma* a lo que el cliente
 * debe.
 */
export function NotasDebitoSeccion({
  creando,
  onCerrarCreacion,
}: {
  /** Lo maneja la vista: el botón de crear vive en la cabecera, arriba de las pestañas. */
  creando: boolean;
  onCerrarCreacion: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeAnular = useTieneRol("DIRECTOR", "CONTADOR");

  const [pagina, setPagina] = useState(1);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<VentaDocumentoResumen | null>(
    null,
  );
  const [motivo, setMotivo] = useState("");

  const puedeCrear = useTieneRol("VENTAS", "DIRECTOR");

  const {
    data: resultado,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...CLAVE, pagina],
    queryFn: () => notasDebitoApi.listar({ pagina }),
    meta: SILENCIOSO,
  });

  const { data: detalle } = useQuery({
    queryKey: [...CLAVE, "detalle", detalleId],
    queryFn: () => notasDebitoApi.porId(detalleId!),
    enabled: detalleId !== null,
  });

  const crear = useMutation({
    mutationFn: notasDebitoApi.crear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({ queryKey: ["facturas"] });
      aviso.exito("Nota débito emitida");
      onCerrarCreacion();
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      notasDebitoApi.anular(id, motivo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Nota débito anulada");
      setPorAnular(null);
      setMotivo("");
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const notas = resultado?.datos ?? [];

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : isError && resultado === undefined ? (
        <ErrorCarga
          error={error}
          titulo="No se pudieron leer las notas débito"
          onReintentar={refetch}
        />
      ) : notas.length === 0 ? (
        <EmptyState
          icon={FilePlus}
          titulo="Todavía no hay notas débito"
          descripcion={`Una nota débito le cobra de más al cliente sobre una factura ya emitida: un flete, un interés de mora, un mayor valor.${puedeCrear ? " Emítala con «Nueva nota débito», arriba, o desde la factura en la pestaña Facturas." : ""}`}
        />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
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
                {/* La fila entera abre el detalle: es lo que se hace todo el
                    día y buscar el botón cada vez sobra. El botón "Ver" se
                    queda igual — es el que alcanza el teclado, y sin él la
                    fila sería un destino al que no se llega tabulando. */}
                {notas.map((n) => (
                  <tr
                    key={n.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setDetalleId(n.id)}
                  >
                    <td className="px-5 py-5 font-mono text-sm font-bold">
                      {n.prefijo ?? ""}
                      {n.consecutivo}
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(n.fecha)}
                    </td>
                    <td className="px-5 py-5 text-sm font-medium">
                      {n.tercero_nombre}
                      <span className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
                        {n.tercero_identificacion}
                      </span>
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
                      +{formatCOP(Number(n.total))}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-2 text-[13px] font-semibold ${
                          n.estado === "ANULADA"
                            ? "text-danger"
                            : "text-success"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            n.estado === "ANULADA" ? "bg-danger" : "bg-success"
                          }`}
                        />
                        {n.estado === "ANULADA" ? "Anulada" : "Emitida"}
                      </span>
                    </td>
                    <td
                      className="px-5 py-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="h-11 rounded-xl px-5 text-muted-foreground"
                          onClick={() => setDetalleId(n.id)}
                        >
                          Ver
                        </Button>
                        {puedeAnular && n.estado === "EMITIDA" && (
                          <Button
                            variant="ghost"
                            className="h-11 rounded-xl px-5 text-muted-foreground hover:text-danger"
                            onClick={() => setPorAnular(n)}
                          >
                            <Trash2 className="size-4" />
                            Anular
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

      <FormularioNotaDebito
        abierto={creando}
        onCerrar={() => onCerrarCreacion()}
        onGuardar={(datos) => crear.mutate(datos)}
        guardando={crear.isPending}
      />

      <DetalleVenta
        documento={(detalle ?? null) as VentaDocumentoDetalle | null}
        onCerrar={() => setDetalleId(null)}
      />

      <AlertDialog
        open={porAnular !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setPorAnular(null);
            setMotivo("");
          }
        }}
      >
        <AlertDialogContent className="gap-6 p-6 sm:max-w-lg!">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-danger/10 text-danger">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-lg">
              Anular {porAnular?.prefijo ?? ""}
              {porAnular?.consecutivo}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              La nota débito y su asiento quedan marcados como anulados, sin
              borrarse.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="block text-sm font-medium">
            Motivo de la anulación
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué se anula"
              className="mt-2 min-h-24 rounded-xl px-4 py-3"
            />
          </label>

          <AlertDialogFooter className="-mx-6 -mb-6 p-6">
            <AlertDialogCancel className="h-11 rounded-xl px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-danger px-6 text-white hover:bg-danger/90"
              disabled={anular.isPending || motivo.trim().length < 3}
              onClick={() =>
                porAnular &&
                anular.mutate({ id: porAnular.id, motivo: motivo.trim() })
              }
            >
              {anular.isPending && <Loader2 className="size-4 animate-spin" />}
              Anular nota débito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
