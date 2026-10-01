"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, FileText, Loader2, Pencil, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccionesDropdown } from "@/components/shared/AccionesDropdown";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVendeSinExistencia } from "@/core/hooks/useVendeSinExistencia";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import {
  avisarErrorVenta,
  manejarErrorEmision,
} from "../lib/errores";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleVenta } from "../components/DetalleVenta";
import { FormularioConvertirCotizacion } from "../components/FormularioConvertirCotizacion";
import { FormularioDocumentoVenta } from "../components/FormularioDocumentoVenta";
import { productosApi } from "@/modules/inventario/services/inventario.service";
import { tercerosApi } from "@/modules/terceros/services/terceros.service";
import { resumirTercero } from "@/modules/terceros/types/terceros.types";
import { cotizacionesApi, facturasApi } from "../services/ventas.service";
import type {
  ConvertirCotizacionInput,
  CrearCotizacionInput,
  VentaDocumentoDetalle,
  VentaDocumentoResumen,
} from "../types/ventas.types";

const CLAVE = ["cotizaciones"];

/**
 * Cotizaciones: no asientan ni mueven inventario, así que se corrigen y se
 * descartan —cosa que una factura no puede—. Tres transiciones: corregir
 * (reemplaza cliente, fecha y líneas, conservando el número), descartar
 * (queda ANULADA con su motivo; nada se borra) y convertir a factura, que
 * reusa sus líneas sin volver a pedirlas.
 */
export function CotizacionesSeccion({
  creando,
  onCerrarCreacion,
}: {
  /** Lo maneja la vista: el botón de crear vive en la cabecera, arriba de las pestañas. */
  creando: boolean;
  onCerrarCreacion: () => void;
}) {
  const router = useRouter();
  const vendeSinExistencia = useVendeSinExistencia();
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("VENTAS", "DIRECTOR");

  const [pagina, setPagina] = useState(1);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [convirtiendo, setConvirtiendo] =
    useState<VentaDocumentoResumen | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [porDescartar, setPorDescartar] =
    useState<VentaDocumentoResumen | null>(null);
  const [motivo, setMotivo] = useState("");

  const {
    data: resultado,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...CLAVE, pagina],
    queryFn: () => cotizacionesApi.listar({ pagina }),
    meta: SILENCIOSO,
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
      onCerrarCreacion();
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  // Para corregir hace falta la cotización completa y, con ella, el cliente y
  // los productos como objetos: el documento guarda ids y los selectores
  // trabajan con la ficha.
  const { data: aCorregir } = useQuery({
    queryKey: [...CLAVE, "detalle", editandoId],
    queryFn: () => cotizacionesApi.porId(editandoId!),
    enabled: editandoId !== null,
  });

  const { data: clienteACorregir } = useQuery({
    queryKey: ["terceros", "ficha", aCorregir?.tercero_id],
    queryFn: () => tercerosApi.porId(aCorregir!.tercero_id),
    enabled: aCorregir !== undefined,
  });

  const { data: productosACorregir } = useQuery({
    queryKey: ["productos", "de-cotizacion", aCorregir?.id],
    // Una cotización es solo de productos: la línea de concepto es de la factura.
    queryFn: () =>
      Promise.all(
        (aCorregir?.lineas ?? []).map((l) => productosApi.porId(l.producto_id!)),
      ),
    enabled: aCorregir !== undefined,
  });

  const inicialCorregir =
    aCorregir && clienteACorregir && productosACorregir
      ? {
          tercero: resumirTercero(clienteACorregir),
          fecha: aCorregir.fecha.slice(0, 10),
          centro: aCorregir.centro_costo_id ?? null,
          lineas: aCorregir.lineas.map((l, i) => ({
            clave: i,
            producto: productosACorregir[i],
            cantidad: String(Number(l.cantidad)),
            // El precio pactado se conserva: si es el de lista, la línea lo
            // dice; si no, muestra cuál era el de lista y deja volver a él.
            precioUnitario: String(Number(l.precio_unitario)),
          })),
        }
      : undefined;

  const corregir = useMutation({
    mutationFn: (datos: CrearCotizacionInput) =>
      cotizacionesApi.editar(editandoId!, datos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Cotización corregida");
      setEditandoId(null);
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const descartar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      cotizacionesApi.descartar(id, motivo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Cotización descartada");
      setPorDescartar(null);
      setMotivo("");
    },
    onError: (e: unknown) => avisarErrorVenta(e, router.push),
  });

  const convertir = useMutation({
    mutationFn: ({
      cotizacionId,
      ...datos
    }: ConvertirCotizacionInput & { cotizacionId: string }) =>
      facturasApi.convertirCotizacion(cotizacionId, datos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      await queryClient.invalidateQueries({ queryKey: ["facturas"] });
      aviso.exito("Cotización convertida en factura");
      setConvirtiendo(null);
    },
    // El modal ya avisa qué no alcanza antes de emitir; esto es la red, porque
    // la existencia puede cambiar entre la consulta y la emisión. El precio
    // cotizado puede estar bajo costo, o el costo haber subido desde entonces.
    onError: (e: unknown, datos) =>
      manejarErrorEmision(e, datos, (d) => convertir.mutate(d), router.push, vendeSinExistencia),
  });

  const cotizaciones = resultado?.datos ?? [];

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : isError && resultado === undefined ? (
        <ErrorCarga
          error={error}
          titulo="No se pudieron leer las cotizaciones"
          onReintentar={refetch}
        />
      ) : cotizaciones.length === 0 ? (
        <EmptyState
          icon={FileText}
          titulo="Todavía no hay cotizaciones"
          descripcion={`Cuando le cotiza a un cliente, la propuesta queda aquí hasta que la convierte en factura.${puedeCrear ? " Cree la primera con «Nueva cotización», arriba." : ""}`}
        />
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
                {/* La fila entera abre el detalle: es lo que se hace todo el
                    día y buscar el botón cada vez sobra. El botón "Ver" se
                    queda igual — es el que alcanza el teclado, y sin él la
                    fila sería un destino al que no se llega tabulando. */}
                {cotizaciones.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setDetalleId(c.id)}
                  >
                    <td className="px-5 py-5 font-mono text-sm font-bold">
                      {c.prefijo ?? ""}
                      {c.consecutivo}
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
                      {formatCOP(Number(c.total))}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-2 text-[13px] font-semibold ${
                          c.estado === "EMITIDA"
                            ? "text-success"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            c.estado === "EMITIDA"
                              ? "bg-success"
                              : "bg-muted-foreground"
                          }`}
                        />
                        {c.estado === "EMITIDA"
                          ? "Vigente"
                          : c.estado === "CONVERTIDA"
                            ? "Convertida"
                            : "Descartada"}
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
                          onClick={() => setDetalleId(c.id)}
                        >
                          Ver
                        </Button>
                        {puedeCrear && c.estado === "EMITIDA" && (
                          <AccionesDropdown
                            acciones={[
                              {
                                label: "Convertir a factura",
                                icon: ArrowRightLeft,
                                onSelect: () => setConvirtiendo(c),
                              },
                              {
                                label: "Corregir",
                                icon: Pencil,
                                onSelect: () => setEditandoId(c.id),
                              },
                              {
                                label: "Descartar",
                                icon: Trash2,
                                variant: "destructive",
                                separadorAntes: true,
                                onSelect: () => setPorDescartar(c),
                              },
                            ]}
                          />
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
        onGuardar={(datos) => crear.mutate(datos)}
        guardando={crear.isPending}
        titulo="Nueva cotización"
        descripcion="El precio arranca en el de lista y se puede cambiar: la factura sale al precio cotizado."
        etiquetaBoton="Crear cotización"
      />

      {/* Corregir es el mismo formulario, precargado: remontarlo por
          cotización evita que queden los valores de la anterior. */}
      {inicialCorregir && (
        <FormularioDocumentoVenta
          key={editandoId ?? "sin-corregir"}
          abierto={editandoId !== null}
          onCerrar={() => setEditandoId(null)}
          onGuardar={(datos) => corregir.mutate(datos)}
          guardando={corregir.isPending}
          titulo="Corregir cotización"
          descripcion="Se reemplaza lo que había: el número no cambia, así el cliente sigue viendo el mismo."
          etiquetaBoton="Guardar cambios"
          inicial={inicialCorregir}
        />
      )}

      <DetalleVenta
        documento={(detalle ?? null) as VentaDocumentoDetalle | null}
        onCerrar={() => setDetalleId(null)}
      />

      <AlertDialog
        open={porDescartar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setPorDescartar(null);
            setMotivo("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Descartar la cotización {porDescartar?.prefijo}
              {porDescartar?.consecutivo}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              No se borra: queda en la lista como descartada, con el motivo. El
              número ya está gastado y no se reutiliza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo — el cliente no la tomó, se rehízo, se cotizó por error…"
            className="min-h-24 rounded-xl"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-xl px-6"
              disabled={motivo.trim().length < 3 || descartar.isPending}
              onClick={() =>
                porDescartar &&
                descartar.mutate({
                  id: porDescartar.id,
                  motivo: motivo.trim(),
                })
              }
            >
              {descartar.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormularioConvertirCotizacion
        cotizacion={convirtiendo}
        onCerrar={() => setConvirtiendo(null)}
        onGuardar={(datos) =>
          convirtiendo &&
          convertir.mutate({ ...datos, cotizacionId: convirtiendo.id })
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
