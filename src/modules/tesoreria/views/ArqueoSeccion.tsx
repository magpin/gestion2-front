"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2 } from "lucide-react";

import { Aviso } from "@/components/shared/Aviso";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import {
  FormularioAbrirArqueo,
  FormularioCerrarArqueo,
  type DatosAbrirArqueo,
  type DatosCerrarArqueo,
} from "../components/FormularioArqueo";
import { SelectorCaja } from "../components/SelectorCaja";
import { arqueosApi, configuracionCajaApi } from "../services/tesoreria.service";
import type { CajaResumen } from "../types/tesoreria.types";

const ID_FORMULARIO = "formulario-arqueo";

/**
 * El cuadre diario de una caja. Requiere elegir una caja primero, mismo
 * criterio que `LibroCajaSeccion`. `ux_arqueo_abierto` en el backend ya
 * impide dos arqueos abiertos a la vez: acá solo se refleja mostrando
 * "Abrir" o "Cerrar" según haya uno abierto, nunca los dos botones juntos.
 */
export function ArqueoSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CAJA", "DIRECTOR");

  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [modal, setModal] = useState<"abrir" | "cerrar" | null>(null);

  const clave = ["cajas", "arqueos", caja?.id];
  const { data: arqueos, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => arqueosApi.listar(caja!.id),
    enabled: caja !== null,
  });

  const { data: configuracion } = useQuery({
    queryKey: ["tesoreria", "configuracion"],
    queryFn: configuracionCajaApi.obtener,
  });
  // Sin configuración cargada no se avisa nada: el aviso es para cuando de
  // verdad falta una cuenta, no para el instante en que carga.
  const configurado = configuracion === undefined || configuracion.completa;

  const abierto = arqueos?.datos.find((a) => a.estado === "ABIERTO") ?? null;
  // El último cerrado es el que contesta "¿quedé cuadrado?", que es la pregunta
  // con la que alguien entra a esta pantalla.
  const ultimoCerrado =
    arqueos?.datos.find((a) => a.estado === "CERRADO") ?? null;
  const diferenciaUltimo =
    ultimoCerrado?.diferencia == null ? null : Number(ultimoCerrado.diferencia);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: clave });

  const abrir = useMutation({
    mutationFn: (d: DatosAbrirArqueo) => arqueosApi.abrir(caja!.id, d),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Arqueo abierto");
      setModal(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const cerrar = useMutation({
    mutationFn: (d: DatosCerrarArqueo) => arqueosApi.cerrar(caja!.id, d),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Arqueo cerrado");
      setModal(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Caja</span>
          <SelectorCaja valor={caja} onElegir={setCaja} />
        </div>

        <Button
          type="button"
          disabled={!caja || !puedeOperar}
          onClick={() => setModal(abierto ? "cerrar" : "abrir")}
          className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
        >
          {abierto ? "Cerrar arqueo" : "Abrir arqueo"}
        </Button>
      </section>

      {/* El resultado del último cuadre, en grande y en la cara: cuadrado en
          verde, faltante en rojo, sobrante en ámbar. Un faltante es plata que
          no está y un sobrante es plata sin explicar — se parecen poco y no
          pueden verse igual. */}
      {diferenciaUltimo !== null && abierto === null && (
        <Aviso
          tono={
            diferenciaUltimo === 0
              ? "exito"
              : diferenciaUltimo < 0
                ? "error"
                : "alarma"
          }
          titulo={
            diferenciaUltimo === 0
              ? `Caja cuadrada el ${formatFecha(ultimoCerrado!.fecha)}`
              : diferenciaUltimo < 0
                ? `Faltante en el arqueo del ${formatFecha(ultimoCerrado!.fecha)}`
                : `Sobrante en el arqueo del ${formatFecha(ultimoCerrado!.fecha)}`
          }
          cifra={
            diferenciaUltimo === 0
              ? undefined
              : formatCOP(Math.abs(diferenciaUltimo))
          }
        >
          {diferenciaUltimo === 0 ? (
            <>
              Lo contado coincidió con lo que decía el sistema:{" "}
              <b className="font-mono">
                {formatCOP(Number(ultimoCerrado!.saldo_sistema))}
              </b>
              .
            </>
          ) : diferenciaUltimo < 0 ? (
            <>
              Se contaron{" "}
              <b className="font-mono">
                {formatCOP(Number(ultimoCerrado!.saldo_contado))}
              </b>{" "}
              y el sistema decía{" "}
              <b className="font-mono">
                {formatCOP(Number(ultimoCerrado!.saldo_sistema))}
              </b>
              . Falta plata: revisá si hay un cobro sin registrar, un egreso
              cargado de más o un error al contar. El arqueo ya quedó cerrado
              con su asiento de ajuste; corregirlo es abrir uno nuevo.
            </>
          ) : (
            <>
              Se contaron{" "}
              <b className="font-mono">
                {formatCOP(Number(ultimoCerrado!.saldo_contado))}
              </b>{" "}
              y el sistema decía{" "}
              <b className="font-mono">
                {formatCOP(Number(ultimoCerrado!.saldo_sistema))}
              </b>
              . Hay plata de más: casi siempre es un ingreso que no se registró.
            </>
          )}
        </Aviso>
      )}

      {abierto && !configurado && (
        <Aviso
          tono="alarma"
          titulo="Falta configurar una cuenta de arqueo"
          accion={
            <span className="text-sm font-semibold">
              Plan de cuentas → Cuentas automáticas
            </span>
          }
        >
          Si el arqueo cierra con una diferencia de ese tipo, no se va a poder
          asentar el ajuste. Un cierre que cuadra funciona igual.
        </Aviso>
      )}

      {abierto && (
        <Aviso
          tono="info"
          titulo={`Arqueo abierto desde el ${formatFecha(abierto.fecha)}`}
          cifra={formatCOP(Number(abierto.saldo_sistema))}
        >
          Es lo que el sistema dice que debería haber en la caja. Contá el
          efectivo y cerralo con lo que realmente encontraste.
        </Aviso>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Historial de arqueos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un arqueo cerrado queda congelado: se corrige con un arqueo nuevo, no editando el viejo.
          </p>
        </div>

        {!caja ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <ClipboardCheck className="size-8 text-muted-foreground" />
            <p className="font-semibold">Elegí una caja para ver sus arqueos</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : arqueos && arqueos.datos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Fecha", "Saldo sistema", "Saldo contado", "Diferencia", "Estado"].map((x) => (
                    <th key={x} scope="col" className="px-5 py-4">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {arqueos.datos.map((a) => {
                  const diferencia = a.diferencia === null ? null : Number(a.diferencia);
                  return (
                    <tr key={a.id}>
                      <td className="px-5 py-5 text-sm text-muted-foreground">{formatFecha(a.fecha)}</td>
                      <td className="px-5 py-5 font-mono">{formatCOP(Number(a.saldo_sistema))}</td>
                      <td className="px-5 py-5 font-mono">
                        {a.saldo_contado === null ? "—" : formatCOP(Number(a.saldo_contado))}
                        {/* El conteo se guarda para poder buscar dónde estuvo el error:
                            se muestra al lado del total, sin abrir otra pantalla. */}
                        {a.denominaciones.length > 0 && (
                          <details className="mt-1 font-sans text-xs text-muted-foreground">
                            <summary className="cursor-pointer select-none">Ver conteo</summary>
                            <ul className="mt-2 flex flex-col gap-0.5">
                              {a.denominaciones.map((d) => (
                                <li key={`${d.tipo}-${d.denominacion}`} className="flex justify-between gap-4 font-mono">
                                  <span>
                                    {d.cantidad} × {formatCOP(Number(d.denominacion))}
                                    {d.tipo === "MONEDA" ? " (moneda)" : ""}
                                  </span>
                                  <span>{formatCOP(Number(d.subtotal))}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                      <td
                        className={`px-5 py-5 font-mono font-semibold ${
                          diferencia === null || diferencia === 0
                            ? "text-muted-foreground"
                            : diferencia > 0
                              ? "text-success"
                              : "text-danger"
                        }`}
                      >
                        {diferencia === null ? "—" : formatCOP(diferencia)}
                      </td>
                      <td className="px-5 py-5">
                        <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                          <span className={`size-2 rounded-full ${a.estado === "ABIERTO" ? "bg-warning" : "bg-success"}`} />
                          {a.estado === "ABIERTO" ? "Abierto" : "Cerrado"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <ClipboardCheck className="size-8 text-muted-foreground" />
            <p className="font-semibold">Esta caja todavía no tiene arqueos</p>
            <p className="max-w-md text-sm text-muted-foreground">Abrí el primero con el botón de arriba.</p>
          </div>
        )}
      </section>

      <Dialog open={modal !== null} onOpenChange={(a) => !a && setModal(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>{modal === "abrir" ? "Abrir arqueo" : "Cerrar arqueo"}</DialogTitle>
              <DialogDescription>
                {modal === "abrir"
                  ? "Congela el saldo del sistema al momento de abrir."
                  : "Contá la caja y registrá lo que hay — la diferencia se calcula sola."}
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            {modal === "abrir" && (
              <FormularioAbrirArqueo id={ID_FORMULARIO} alGuardar={(d) => abrir.mutate(d)} />
            )}
            {modal === "cerrar" && abierto && caja && (
              <FormularioCerrarArqueo
                id={ID_FORMULARIO}
                arqueo={abierto}
                caja={caja}
                alGuardar={(d) => cerrar.mutate(d)}
              />
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO}
              className="h-12 rounded-xl px-6"
              disabled={abrir.isPending || cerrar.isPending}
            >
              {(abrir.isPending || cerrar.isPending) && <Loader2 className="size-4 animate-spin" />}
              {modal === "abrir" ? "Abrir" : "Cerrar arqueo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
