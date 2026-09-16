"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  FileMinus,
  FilePlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

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
import { DetalleCompra } from "../components/DetalleCompra";
import { FormularioCompra } from "../components/FormularioCompra";
import { FormularioNotaCreditoCompra } from "../components/FormularioNotaCreditoCompra";
import { FormularioNotaDebitoCompra } from "../components/FormularioNotaDebitoCompra";
import { FormularioPago } from "../components/FormularioPago";
import { comprasApi, notasCompraApi } from "../services/compras.service";
import { Paginador } from "./Paginador";
import type {
  CompraDocumentoDetalle,
  CompraDocumentoResumen,
  PagarInput,
} from "../types/compras.types";

const CLAVE = ["compras"];

/**
 * La lista de facturas de compra: registrar, ver, pagar y anular.
 *
 * Era `ComprasView` entera —"un solo tipo de documento, así que esta pantalla
 * no necesita pestañas", decía—. Dejó de ser cierto en el paso 10: la nota
 * crédito y la nota débito del proveedor también son documentos de compra y
 * viven en la misma tabla. Se separan en pestañas para que esta lista siga
 * respondiendo "cuánto le debo a este proveedor" sin correcciones mezcladas.
 */
export function FacturasCompraSeccion() {
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("COMPRAS", "DIRECTOR");
  const puedeAnular = useTieneRol("DIRECTOR", "CONTADOR");
  const puedePagar = useTieneRol("CAJA", "DIRECTOR");

  const [pagina, setPagina] = useState(1);
  const [creando, setCreando] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<CompraDocumentoResumen | null>(
    null,
  );
  const [motivo, setMotivo] = useState("");
  const [pagandoDe, setPagandoDe] = useState<CompraDocumentoResumen | null>(
    null,
  );
  const [notaCreditoDe, setNotaCreditoDe] =
    useState<CompraDocumentoResumen | null>(null);
  const [notaDebitoDe, setNotaDebitoDe] =
    useState<CompraDocumentoResumen | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: [...CLAVE, pagina],
    queryFn: () => comprasApi.listar({ pagina }),
  });

  const { data: detalle } = useQuery({
    queryKey: [...CLAVE, "detalle", detalleId],
    queryFn: () => comprasApi.porId(detalleId!),
    enabled: detalleId !== null,
  });

  const crear = useMutation({
    mutationFn: comprasApi.crear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Compra registrada");
      setCreando(false);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      comprasApi.anular(id, motivo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Compra anulada");
      setPorAnular(null);
      setMotivo("");
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const pagar = useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: PagarInput }) =>
      comprasApi.pagar(id, datos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Pago registrado");
      setPagandoDe(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const crearNotaCredito = useMutation({
    mutationFn: notasCompraApi.crearCredito,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({
        queryKey: ["notas-compra-credito"],
      });
      aviso.exito("Nota crédito registrada");
      setNotaCreditoDe(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const crearNotaDebito = useMutation({
    mutationFn: notasCompraApi.crearDebito,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({
        queryKey: ["notas-compra-debito"],
      });
      aviso.exito("Nota débito registrada");
      setNotaDebitoDe(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const compras = resultado?.datos ?? [];

  return (
    <>
      <div className="mb-6 flex justify-end">
        {puedeCrear && (
          <Button
            onClick={() => setCreando(true)}
            className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
              <Plus className="size-4" />
            </span>
            Nueva compra
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : compras.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-20 text-center">
          <p className="text-lg font-semibold">Todavía no hay compras</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Acá van las facturas de los proveedores, con el costo que
            alimenta el kardex.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  {[
                    "N.° factura",
                    "Fecha",
                    "Proveedor",
                    "Neto a pagar",
                    "Estado",
                  ].map((t) => (
                    <th key={t} scope="col" className="px-5 py-4">
                      {t}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-4 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compras.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-5 font-mono text-sm font-bold">
                      {c.numero_factura_proveedor}
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(c.fecha)}
                    </td>
                    <td className="px-5 py-5 text-sm font-medium">
                      {c.tercero_nombre}
                      <span className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
                        {c.tercero_identificacion}
                      </span>
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
                      {formatCOP(Number(c.neto_a_pagar))}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-2 text-[13px] font-semibold ${
                          c.estado === "ANULADA"
                            ? "text-danger"
                            : "text-success"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            c.estado === "ANULADA" ? "bg-danger" : "bg-success"
                          }`}
                        />
                        {c.estado === "ANULADA" ? "Anulada" : "Emitida"}
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
                        {/* Contra `pendiente`: ver el mismo cambio en
                            `FacturasSeccion`, del lado de ventas. */}
                        {puedePagar &&
                          c.estado === "EMITIDA" &&
                          Number(c.pendiente) > 0 && (
                            <Button
                              variant="ghost"
                              className="h-11 rounded-xl px-5 text-muted-foreground"
                              onClick={() => setPagandoDe(c)}
                            >
                              <Banknote className="size-4" />
                              Pagar
                            </Button>
                          )}
                        {puedeCrear && c.estado === "EMITIDA" && (
                          <>
                            <Button
                              variant="ghost"
                              className="h-11 rounded-xl px-5 text-muted-foreground"
                              onClick={() => setNotaCreditoDe(c)}
                            >
                              <FileMinus className="size-4" />
                              Nota crédito
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-11 rounded-xl px-5 text-muted-foreground"
                              onClick={() => setNotaDebitoDe(c)}
                            >
                              <FilePlus className="size-4" />
                              Nota débito
                            </Button>
                          </>
                        )}
                        {puedeAnular && c.estado === "EMITIDA" && (
                          <Button
                            variant="ghost"
                            className="h-11 rounded-xl px-5 text-muted-foreground hover:text-danger"
                            onClick={() => setPorAnular(c)}
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

      <FormularioCompra
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onGuardar={(datos) => crear.mutate(datos)}
        guardando={crear.isPending}
      />

      <DetalleCompra
        documento={(detalle ?? null) as CompraDocumentoDetalle | null}
        onCerrar={() => setDetalleId(null)}
      />

      <FormularioNotaCreditoCompra
        abierto={notaCreditoDe !== null}
        onCerrar={() => setNotaCreditoDe(null)}
        onGuardar={(datos) => crearNotaCredito.mutate(datos)}
        guardando={crearNotaCredito.isPending}
        compraFija={notaCreditoDe ?? undefined}
      />

      <FormularioNotaDebitoCompra
        abierto={notaDebitoDe !== null}
        onCerrar={() => setNotaDebitoDe(null)}
        onGuardar={(datos) => crearNotaDebito.mutate(datos)}
        guardando={crearNotaDebito.isPending}
        compraFija={notaDebitoDe ?? undefined}
      />

      <FormularioPago
        compra={pagandoDe}
        onCerrar={() => setPagandoDe(null)}
        onGuardar={(datos) =>
          pagandoDe && pagar.mutate({ id: pagandoDe.id, datos })
        }
        guardando={pagar.isPending}
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
              Anular {porAnular?.numero_factura_proveedor}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              La compra y su asiento quedan marcados como anulados, sin
              borrarse. El kardex no se revierte solo con anular — si la
              mercancía se devuelve al proveedor, hace falta un ajuste de
              inventario aparte.
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
              Anular compra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
