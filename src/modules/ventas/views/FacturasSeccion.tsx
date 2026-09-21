"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, FileMinus, FilePlus, Loader2, Trash2, Undo2 } from "lucide-react";

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
import {
  AccionesDropdown,
  type DropdownAccion,
} from "@/components/shared/AccionesDropdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mensajeDeError } from "@/core/api/api";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import {
  avisarErrorVenta,
  esFaltaDeExistencia,
  esPrecioBajoCosto,
} from "../lib/errores";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleVenta } from "../components/DetalleVenta";
import { FormularioCobro } from "../components/FormularioCobro";
import { FormularioDocumentoVenta } from "../components/FormularioDocumentoVenta";
import { FormularioNotaCredito } from "../components/FormularioNotaCredito";
import { FormularioNotaDebito } from "../components/FormularioNotaDebito";
import {
  facturasApi,
  notasCreditoApi,
  notasDebitoApi,
} from "../services/ventas.service";
import type {
  CobrarInput,
  VentaDocumentoDetalle,
  VentaDocumentoResumen,
} from "../types/ventas.types";

const CLAVE = ["facturas"];

/**
 * Facturas: al crearse asientan y descuentan kardex de un solo golpe. La
 * única corrección posible acá es anular (deja el documento y el asiento
 * marcados, no los borra) o emitir una nota crédito que reversa el asiento.
 */
export function FacturasSeccion({
  creando,
  onCerrarCreacion,
}: {
  /** Lo maneja la vista: el botón de crear vive en la cabecera, arriba de las pestañas. */
  creando: boolean;
  onCerrarCreacion: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("VENTAS", "DIRECTOR");
  const puedeAnular = useTieneRol("DIRECTOR", "CONTADOR");
  const puedeCobrar = useTieneRol("CAJA", "DIRECTOR");

  const [pagina, setPagina] = useState(1);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<VentaDocumentoResumen | null>(
    null,
  );
  const [motivo, setMotivo] = useState("");
  const [notaCreditoDe, setNotaCreditoDe] =
    useState<VentaDocumentoResumen | null>(null);
  const [notaDebitoDe, setNotaDebitoDe] =
    useState<VentaDocumentoResumen | null>(null);
  const [cobrandoDe, setCobrandoDe] = useState<VentaDocumentoResumen | null>(
    null,
  );
  const [devolviendoDe, setDevolviendoDe] =
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
      onCerrarCreacion();
    },
    /**
     * Falta de existencia no es un "no": es un "¿seguro?". El cliente está
     * esperando y la mercancía puede haber llegado sin registrarse, así que
     * se pregunta y, si confirma, se reintenta con `confirmaSinExistencia`.
     * El backend sigue teniendo la última palabra: si la empresa no habilitó
     * el descubierto, o el producto nunca tuvo una entrada, ese segundo
     * intento también se rechaza —y ahí el mensaje explica qué falta—.
     */
    onError: async (e: unknown, datos) => {
      // Vender con pérdida: mismo patrón que la falta de existencia —se
      // pregunta y se reintenta—, pero el backend solo lo acepta de un
      // DIRECTOR y deja anotado en la línea quién lo autorizó.
      if (esPrecioBajoCosto(e) && datos.confirmaPrecioBajoCosto !== true) {
        const seguir = await aviso.confirmar(
          mensajeDeError(e),
          "Emitirla igual deja la venta con pérdida y anota en la línea quién lo autorizó. Solo un DIRECTOR puede hacerlo.",
          "Emitir con pérdida",
        );
        if (seguir) {
          crear.mutate({ ...datos, confirmaPrecioBajoCosto: true });
        }
        return;
      }
      if (!esFaltaDeExistencia(e) || datos.confirmaSinExistencia === true) {
        avisarErrorVenta(e, router.push);
        return;
      }
      const seguir = await aviso.confirmar(
        mensajeDeError(e),
        "Si emitís la factura igual, el inventario de ese producto queda en negativo y lo que falte queda anotado en la lista de compras pendientes, con la factura que lo sacó.",
        "Emitir igual",
      );
      if (seguir) {
        crear.mutate({ ...datos, confirmaSinExistencia: true });
      }
    },
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
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const crearNotaCredito = useMutation({
    mutationFn: notasCreditoApi.crear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({ queryKey: ["notas-credito"] });
      aviso.exito("Nota crédito emitida");
      setNotaCreditoDe(null);
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const crearNotaDebito = useMutation({
    mutationFn: notasDebitoApi.crear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({ queryKey: ["notas-debito"] });
      aviso.exito("Nota débito emitida");
      setNotaDebitoDe(null);
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const cobrar = useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: CobrarInput }) =>
      facturasApi.cobrar(id, datos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Cobro registrado");
      setCobrandoDe(null);
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const devolverCobro = useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: CobrarInput }) =>
      facturasApi.devolverCobro(id, datos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Devolución registrada");
      setDevolviendoDe(null);
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  /**
   * Lo que se puede hacer con una factura, según su estado y quién mira.
   * Va al menú de tres puntos y no a la fila: eran cinco botones de texto y
   * la columna se comía la mitad de la tabla. `Ver` se queda afuera porque es
   * lo que se hace todo el día.
   */
  const accionesDe = (f: VentaDocumentoResumen): DropdownAccion[] => {
    if (f.estado !== "EMITIDA") return [];
    const acciones: DropdownAccion[] = [];

    // Contra `pendiente` y no contra el total: una factura con una nota
    // crédito encima puede no deber nada aunque su total siga en pie.
    if (puedeCobrar && Number(f.pendiente) > 0) {
      acciones.push({
        label: "Cobrar",
        icon: Banknote,
        onSelect: () => setCobrandoDe(f),
      });
    }
    // Solo si algo se cobró: no se devuelve plata que no entró. Con saldo a
    // favor —cobrada entera y con nota crédito después— es la salida natural.
    if (puedeCobrar && Number(f.monto_pagado) > 0) {
      acciones.push({
        label: Number(f.saldo_a_favor) > 0 ? "Devolver saldo a favor" : "Devolver cobro",
        icon: Undo2,
        onSelect: () => setDevolviendoDe(f),
      });
    }
    if (puedeCrear) {
      acciones.push(
        {
          label: "Nota crédito",
          icon: FileMinus,
          onSelect: () => setNotaCreditoDe(f),
        },
        {
          label: "Nota débito",
          icon: FilePlus,
          onSelect: () => setNotaDebitoDe(f),
        },
      );
    }
    if (puedeAnular) {
      acciones.push({
        label: "Anular",
        icon: Trash2,
        variant: "destructive",
        separadorAntes: true,
        onSelect: () => setPorAnular(f),
      });
    }
    return acciones;
  };

  const facturas = resultado?.datos ?? [];

  return (
    <>
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
                {/* La fila entera abre el detalle: es lo que se hace todo el
                    día y buscar el botón cada vez sobra. El botón "Ver" se
                    queda igual — es el que alcanza el teclado, y sin él la
                    fila sería un destino al que no se llega tabulando. */}
                {facturas.map((f) => (
                  <tr
                    key={f.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setDetalleId(f.id)}
                  >
                    <td className="px-5 py-5 font-mono text-sm font-bold">
                      {f.prefijo ?? ""}
                      {f.consecutivo}
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(f.fecha)}
                    </td>
                    <td className="px-5 py-5 text-sm font-medium">
                      {f.tercero_nombre}
                      <span className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
                        {f.tercero_identificacion}
                      </span>
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
                    <td
                      className="px-5 py-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="h-11 rounded-xl px-5 text-muted-foreground"
                          onClick={() => setDetalleId(f.id)}
                        >
                          Ver
                        </Button>
                        {accionesDe(f).length > 0 && (
                          <AccionesDropdown acciones={accionesDe(f)} />
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
        onCerrar={() => onCerrarCreacion()}
        onGuardar={(datos, formaPago) =>
          crear.mutate({ ...datos, ...(formaPago ?? { formaPago: "CREDITO" }) })
        }
        guardando={crear.isPending}
        titulo="Nueva factura"
        descripcion="Numera contra la resolución DIAN vigente, asienta y descuenta el kardex al guardar."
        etiquetaBoton="Emitir factura"
        fechaDeHoy
        conFormaPago
      />

      <FormularioNotaCredito
        abierto={notaCreditoDe !== null}
        onCerrar={() => setNotaCreditoDe(null)}
        onGuardar={(datos) => crearNotaCredito.mutate(datos)}
        guardando={crearNotaCredito.isPending}
        facturaFija={notaCreditoDe ?? undefined}
      />

      <FormularioNotaDebito
        abierto={notaDebitoDe !== null}
        onCerrar={() => setNotaDebitoDe(null)}
        onGuardar={(datos) => crearNotaDebito.mutate(datos)}
        guardando={crearNotaDebito.isPending}
        facturaFija={notaDebitoDe ?? undefined}
      />

      <FormularioCobro
        factura={cobrandoDe}
        onCerrar={() => setCobrandoDe(null)}
        onGuardar={(datos) =>
          cobrandoDe && cobrar.mutate({ id: cobrandoDe.id, datos })
        }
        guardando={cobrar.isPending}
      />

      <FormularioCobro
        modo="DEVOLVER"
        factura={devolviendoDe}
        onCerrar={() => setDevolviendoDe(null)}
        onGuardar={(datos) =>
          devolviendoDe && devolverCobro.mutate({ id: devolviendoDe.id, datos })
        }
        guardando={devolverCobro.isPending}
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
              mercancía vuelve a bodega, hace falta una nota crédito o un ajuste
              de inventario.
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
