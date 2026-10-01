"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Lock, Pencil, Play, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mensajeDelServidor } from "@/lib/errores";

import { useCambiosGuardados, useGuardados, useOrigenes } from "../../hooks/useArmador";
import { ICONO_AREA } from "../../lib/areas";
import { ultimaVez } from "../../lib/fechas";
import styles from "../../reportes.module.css";
import type { Guardado } from "../../types/armador.types";

const ETIQUETA_ORIGEN: Record<Guardado["origen"], string> = {
  VENTAS: "Ventas",
  COMPRAS: "Compras",
  CARTERA: "Cartera",
  INVENTARIO: "Inventario",
  TESORERIA: "Tesorería",
  CONTABILIDAD: "Contabilidad",
};

/**
 * Los reportes a medida: de qué se puede partir, y lo que la empresa ya
 * guardó.
 *
 * **Nunca se empieza de cero.** Cada punto de partida es un reporte que ya
 * tiene columnas y sentido; el armador sirve para ajustarlo, no para
 * inventarlo.
 */
export function SeccionAMedida({ hoy }: { hoy: string | undefined }) {
  const origenes = useOrigenes();
  const guardados = useGuardados();
  const { guardar, actualizar, archivar } = useCambiosGuardados();
  const [renombrando, setRenombrando] = useState<Guardado | null>(null);
  const [borrando, setBorrando] = useState<Guardado | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (origenes.data?.length === 0) return null;

  const duplicar = async (g: Guardado) => {
    setError(null);
    const nombres = new Set((guardados.data ?? []).map((x) => x.nombre.toLowerCase()));
    let nombre = `Copia de ${g.nombre}`.slice(0, 120);
    for (let n = 2; nombres.has(nombre.toLowerCase()); n++) {
      nombre = `Copia de ${g.nombre} (${n})`.slice(0, 120);
    }
    try {
      await guardar.mutateAsync({ nombre, definicion: g.definicion });
    } catch (e) {
      setError(mensajeDelServidor(e) ?? "No se pudo duplicar.");
    }
  };

  return (
    <section className="flex flex-col gap-4 pt-4" aria-labelledby="a-medida">
      <div className="flex flex-col gap-1.5">
        <h2 id="a-medida" className="m-0 text-lg font-semibold tracking-[-0.2px]">
          A medida
        </h2>
        <p className="m-0 text-sm text-muted-foreground">
          Parta de un reporte que ya existe, ajuste columnas, filtros y agrupación, y guárdelo con su nombre.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {origenes.isPending
          ? [0, 1, 2].map((i) => <div key={i} className={`${styles.sk} h-[76px] rounded-[1.05rem]`} />)
          : origenes.data?.map((o) => {
              const Icono = ICONO_AREA[o.clave];
              return (
                <Link
                  key={o.clave}
                  href={`/dashboard/reportes/armar?origen=${o.clave}`}
                  className="group flex items-center gap-3.5 rounded-[1.05rem] border border-border bg-card p-4 transition-colors hover:border-[#b8b8b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f25623] dark:hover:border-[#4d4d4d]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icono className="size-[18px]" aria-hidden />
                  </span>
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="text-sm font-semibold">Partir de {o.etiqueta.toLowerCase()}</span>
                    <span className="truncate text-xs text-muted-foreground">«{o.pregunta}»</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              );
            })}
      </div>

      <div className="overflow-hidden rounded-[1.05rem] border border-border bg-card">
        <div className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
          <h3 className="m-0 text-sm font-semibold">Guardados por la empresa</h3>
          <span className="font-mono text-xs text-muted-foreground">{guardados.data?.length ?? 0}</span>
        </div>
        {error && (
          <p role="alert" className="m-0 border-b border-border px-5 py-2 text-[13px] text-[#c0421a] dark:text-[#f25623]">
            {error}
          </p>
        )}
        {guardados.isPending ? (
          <div className="flex flex-col gap-2 p-5">
            <span className={`${styles.sk} h-5 w-2/3 rounded`} />
            <span className={`${styles.sk} h-5 w-1/2 rounded`} />
          </div>
        ) : guardados.isError ? (
          <p className="m-0 px-5 py-6 text-sm text-muted-foreground">No se pudo traer la lista de guardados.</p>
        ) : guardados.data?.length === 0 ? (
          <p className="m-0 px-5 py-6 text-sm text-muted-foreground">
            Todavía nadie ha guardado uno. Parta de uno de arriba, ajústelo y guárdelo: queda aquí para toda la empresa.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-5 py-2 font-medium">Nombre</th>
                  <th scope="col" className="px-3 py-2 font-medium">Origen</th>
                  <th scope="col" className="px-3 py-2 font-medium">Lo guardó</th>
                  <th scope="col" className="px-3 py-2 font-medium">Última vez</th>
                  <th scope="col" className="px-5 py-2 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {guardados.data?.map((g) => {
                  const Icono = ICONO_AREA[g.origen];
                  const puede = g.puedeCorrer !== false;
                  return (
                    <tr key={g.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-5 py-2.5 font-medium">
                        {puede ? (
                          <Link href={`/dashboard/reportes/armar?guardado=${g.id}`} className="hover:underline">
                            {g.nombre}
                          </Link>
                        ) : (
                          g.nombre
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Icono className="size-3.5" aria-hidden /> {ETIQUETA_ORIGEN[g.origen]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{g.creadoPor}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                        {g.ultimaVez && hoy ? ultimaVez(g.ultimaVez, hoy) : "Nunca"}
                      </td>
                      <td className="px-5 py-1.5">
                        {puede ? (
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/dashboard/reportes/armar?guardado=${g.id}&correr=1`}
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              <Play aria-hidden /> Correr
                            </Link>
                            <Button variant="ghost" size="icon-sm" aria-label={`Duplicar ${g.nombre}`} onClick={() => duplicar(g)}>
                              <Copy />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label={`Renombrar ${g.nombre}`} onClick={() => setRenombrando(g)}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label={`Borrar ${g.nombre}`} onClick={() => setBorrando(g)}>
                              <Trash2 />
                            </Button>
                          </div>
                        ) : (
                          <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                            <Lock className="size-3.5" aria-hidden /> No es para su rol
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renombrando && (
        <Renombrar
          guardado={renombrando}
          onCerrar={() => setRenombrando(null)}
          onGuardar={async (nombre) => {
            await actualizar.mutateAsync({ id: renombrando.id, nombre });
            setRenombrando(null);
          }}
        />
      )}

      <AlertDialog open={borrando !== null} onOpenChange={(a) => !a && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar «{borrando?.nombre}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Deja de aparecer en la lista para toda la empresa. No se pierde ningún dato: el reporte solo guardaba la
              pregunta, y queda archivado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (borrando) await archivar.mutateAsync(borrando.id);
                setBorrando(null);
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Renombrar({
  guardado,
  onCerrar,
  onGuardar,
}: {
  guardado: Guardado;
  onCerrar: () => void;
  onGuardar: (nombre: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(guardado.nombre);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const listo = nombre.trim().length > 0 && nombre.trim() !== guardado.nombre;

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[19px]">Renombrar</DialogTitle>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody className="flex flex-col gap-2">
          <input
            autoFocus
            aria-label="Nombre"
            value={nombre}
            maxLength={120}
            onChange={(e) => setNombre(e.target.value)}
            className="h-11 rounded-[0.6rem] border border-border bg-background px-3 text-sm outline-none focus:border-[#f25623] focus:shadow-[0_0_0_3px_rgba(242,86,35,0.2)]"
          />
          {error && (
            <p role="alert" className="m-0 text-[13px] text-[#c0421a] dark:text-[#f25623]">
              {error}
            </p>
          )}
        </DialogBody>
        <DialogFooter className="gap-2 bg-transparent">
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!listo || guardando}
            onClick={async () => {
              setGuardando(true);
              setError(null);
              try {
                await onGuardar(nombre.trim());
              } catch (e) {
                setError(mensajeDelServidor(e) ?? "No se pudo renombrar.");
              } finally {
                setGuardando(false);
              }
            }}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
