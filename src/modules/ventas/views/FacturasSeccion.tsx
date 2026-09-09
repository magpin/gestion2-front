"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileMinus, Loader2, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mensajeDeError } from "@/core/api/api";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleVenta } from "../components/DetalleVenta";
import { FormularioDocumentoVenta } from "../components/FormularioDocumentoVenta";
import { FormularioNotaCredito } from "../components/FormularioNotaCredito";
import { useMapaClientes } from "../hooks/useMapasVenta";
import { facturasApi, notasCreditoApi } from "../services/ventas.service";
import type {
  VentaDocumentoDetalle,
  VentaDocumentoResumen,
} from "../types/ventas.types";

const CLAVE = ["facturas"];

/**
 * Facturas: al crearse asientan y descuentan kardex de un solo golpe. La
 * única corrección posible acá es anular (deja el documento y el asiento
 * marcados, no los borra) o emitir una nota crédito que reversa el asiento.
 */
export function FacturasSeccion() {
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("VENTAS", "DIRECTOR");
  const puedeAnular = useTieneRol("DIRECTOR", "CONTADOR");
  const clientes = useMapaClientes();

  const [pagina, setPagina] = useState(1);
  const [creando, setCreando] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<VentaDocumentoResumen | null>(
    null,
  );
  const [motivo, setMotivo] = useState("");
  const [notaCreditoDe, setNotaCreditoDe] =
    useState<VentaDocumentoResumen | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: [...CLAVE, pagina],
    queryFn: () => facturasApi.listar({ pagina }),
  });

  const { data: detalle } = useQuery({
    queryKey: [...CLAVE, "detalle", detalleId],
    queryFn: () => facturasApi.porId(detalleId!),
    enabled: detalleId !== null,
  });

  const crear = useMutation({
    mutationFn: facturasApi.crear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Factura creada");
      setCreando(false);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      facturasApi.anular(id, motivo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Factura anulada");
      setPorAnular(null);
      setMotivo("");
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const crearNotaCredito = useMutation({
    mutationFn: notasCreditoApi.crear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({ queryKey: ["notas-credito"] });
      aviso.exito("Nota crédito emitida");
      setNotaCreditoDe(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const facturas = resultado?.datos ?? [];

  return (
    <>
      {puedeCrear && (
        <div className="mb-6 flex justify-end">
          <Button
            className="h-12 rounded-xl px-6"
            onClick={() => setCreando(true)}
          >
            Nueva factura
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : facturas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-20 text-center">
          <p className="text-lg font-semibold">Todavía no hay facturas</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Al emitir una factura se asienta y se descuenta el kardex, todo
            junto.
          </p>
        </div>
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
                {facturas.map((f) => (
                  <tr key={f.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-5 font-mono text-sm font-bold">
                      {f.prefijo ?? ""}
                      {f.consecutivo}
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(f.fecha)}
                    </td>
                    <td className="px-5 py-5 text-sm font-medium">
                      {clientes.get(f.tercero_id) ?? f.tercero_id}
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
                      {formatCOP(Number(f.total))}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-2 text-[13px] font-semibold ${
                          f.estado === "ANULADA"
                            ? "text-danger"
                            : "text-success"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            f.estado === "ANULADA" ? "bg-danger" : "bg-success"
                          }`}
                        />
                        {f.estado === "ANULADA" ? "Anulada" : "Emitida"}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="h-11 rounded-xl px-5 text-muted-foreground"
                          onClick={() => setDetalleId(f.id)}
                        >
                          Ver
                        </Button>
                        {puedeCrear && f.estado === "EMITIDA" && (
                          <Button
                            variant="ghost"
                            className="h-11 rounded-xl px-5 text-muted-foreground"
                            onClick={() => setNotaCreditoDe(f)}
                          >
                            <FileMinus className="size-4" />
                            Nota crédito
                          </Button>
                        )}
                        {puedeAnular && f.estado === "EMITIDA" && (
                          <Button
                            variant="ghost"
                            className="h-11 rounded-xl px-5 text-muted-foreground hover:text-danger"
                            onClick={() => setPorAnular(f)}
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

      <FormularioDocumentoVenta
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onGuardar={(datos) => crear.mutate(datos)}
        guardando={crear.isPending}
        titulo="Nueva factura"
        descripcion="Numera contra la resolución DIAN vigente, asienta y descuenta el kardex al guardar."
        etiquetaBoton="Emitir factura"
      />

      <FormularioNotaCredito
        abierto={notaCreditoDe !== null}
        onCerrar={() => setNotaCreditoDe(null)}
        onGuardar={(datos) => crearNotaCredito.mutate(datos)}
        guardando={crearNotaCredito.isPending}
        facturaFija={notaCreditoDe ?? undefined}
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
              La factura y su asiento quedan marcados como anulados, sin
              borrarse. El kardex no se revierte solo con anular — si la
              mercancía vuelve a bodega, hace falta una nota crédito o un
              ajuste de inventario.
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
              Anular factura
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
