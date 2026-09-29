"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileMinus, FilePlus, Loader2, Trash2 } from "lucide-react";

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
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleCompra } from "../components/DetalleCompra";
import { FormularioNotaCreditoCompra } from "../components/FormularioNotaCreditoCompra";
import { FormularioNotaDebitoCompra } from "../components/FormularioNotaDebitoCompra";
import { comprasApi, notasCompraApi } from "../services/compras.service";
import { Paginador } from "./Paginador";
import type {
  CompraDocumentoDetalle,
  CompraDocumentoResumen,
} from "../types/compras.types";

type TipoNota = "NOTA_CREDITO" | "NOTA_DEBITO";

/**
 * Las dos pestañas de notas del proveedor, con un solo componente: se
 * diferencian en el signo, el verbo y qué formulario abren, y en nada más.
 * Tenerlas separadas en pantalla es lo que mantiene la lista de compras
 * respondiendo "cuánto le debo a este proveedor" sin mezclarle correcciones.
 */
export function NotasCompraSeccion({
  tipo,
  creando,
  onCerrarCreacion,
}: {
  tipo: TipoNota;
  /** Lo maneja la vista: el botón de crear vive en la cabecera. */
  creando: boolean;
  onCerrarCreacion: () => void;
}) {
  const esCredito = tipo === "NOTA_CREDITO";
  const CLAVE = [esCredito ? "notas-compra-credito" : "notas-compra-debito"];

  const queryClient = useQueryClient();
  const puedeAnular = useTieneRol("DIRECTOR", "CONTADOR");

  const [pagina, setPagina] = useState(1);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<CompraDocumentoResumen | null>(
    null,
  );
  const [motivo, setMotivo] = useState("");

  const puedeCrear = useTieneRol("COMPRAS", "DIRECTOR");

  const {
    data: resultado,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...CLAVE, pagina],
    queryFn: () =>
      esCredito
        ? notasCompraApi.listarCredito({ pagina })
        : notasCompraApi.listarDebito({ pagina }),
    meta: SILENCIOSO,
  });

  // El detalle sale por `/compras/:id`: las notas viven en la misma tabla y
  // esa ruta no filtra por tipo.
  const { data: detalle } = useQuery({
    queryKey: ["compras", "detalle", detalleId],
    queryFn: () => comprasApi.porId(detalleId!),
    enabled: detalleId !== null,
  });

  const invalidar = async () => {
    await queryClient.invalidateQueries({ queryKey: CLAVE });
    // La factura corregida cambia de saldo: su lista y su detalle quedan viejos.
    await queryClient.invalidateQueries({ queryKey: ["compras"] });
  };

  // Dos mutaciones y no una con el `mutationFn` elegido a dedo: las notas se
  // crean con cuerpos distintos —una lleva las líneas de la compra que
  // devuelve, la otra las que el proveedor agrega— y colapsarlas obligaría a
  // mentirle al tipo.
  const opciones = (que: string) => ({
    onSuccess: async () => {
      await invalidar();
      aviso.exito(`${que} registrada`);
      onCerrarCreacion();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const crearCredito = useMutation({
    mutationFn: notasCompraApi.crearCredito,
    ...opciones("Nota crédito"),
  });

  const crearDebito = useMutation({
    mutationFn: notasCompraApi.crearDebito,
    ...opciones("Nota débito"),
  });

  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      notasCompraApi.anular(id, motivo),
    onSuccess: async () => {
      await invalidar();
      aviso.exito("Nota anulada");
      setPorAnular(null);
      setMotivo("");
    },
    onError: (e: unknown) => aviso.falla(e),
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
          titulo={`No se pudieron leer las notas ${esCredito ? "crédito" : "débito"}`}
          onReintentar={refetch}
        />
      ) : notas.length === 0 ? (
        <EmptyState
          icon={esCredito ? FileMinus : FilePlus}
          titulo={`Todavía no hay notas ${esCredito ? "crédito" : "débito"}`}
          descripcion={`${
            esCredito
              ? "Cuando el proveedor te acredita una devolución, un descuento posterior o un menor valor, la nota va acá y baja lo que le debés."
              : "Cuando el proveedor te cobra de más sobre una compra ya registrada —un flete, un interés, un mayor valor—, la nota va acá y sube lo que le debés."
          }${
            puedeCrear
              ? ` Registrala con «Nueva nota ${esCredito ? "crédito" : "débito"}», arriba, o desde la compra en la pestaña Facturas.`
              : ""
          }`}
        />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  {["N.° nota", "Fecha", "Proveedor", "Valor", "Estado"].map(
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
                      {n.numero_factura_proveedor}
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
                    {/* El signo es la diferencia que hay que ver de un
                        vistazo: la crédito baja lo que se le debe, la débito
                        lo sube. */}
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
                      {esCredito ? "−" : "+"}
                      {formatCOP(Number(n.neto_a_pagar))}
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

      {esCredito ? (
        <FormularioNotaCreditoCompra
          abierto={creando}
          onCerrar={() => onCerrarCreacion()}
          onGuardar={(datos) => crearCredito.mutate(datos)}
          guardando={crearCredito.isPending}
        />
      ) : (
        <FormularioNotaDebitoCompra
          abierto={creando}
          onCerrar={() => onCerrarCreacion()}
          onGuardar={(datos) => crearDebito.mutate(datos)}
          guardando={crearDebito.isPending}
        />
      )}

      <DetalleCompra
        documento={(detalle ?? null) as CompraDocumentoDetalle | null}
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
              Anular {porAnular?.numero_factura_proveedor}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              La nota y su asiento quedan marcados como anulados, sin borrarse.
              El saldo de la compra vuelve a lo que era.
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
              Anular nota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
