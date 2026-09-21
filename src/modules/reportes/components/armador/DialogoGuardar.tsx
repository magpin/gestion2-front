"use client";

import { useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";

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

import { rangoLargo } from "../../lib/fechas";
import type { Definicion } from "../../types/armador.types";

/**
 * Guardar: un nombre, y **la decisión que hace que el reporte sirva dentro de
 * seis meses**.
 *
 * Si las fechas se eligieron con un atajo, el reporte se guarda relativo —«el
 * mes pasado» sigue siendo el mes pasado en noviembre—; si se escribieron a
 * mano, fijo. El diálogo lo dice en palabras y deja cambiar un atajo por las
 * fechas que da hoy. Al revés no: unas fechas a mano no dicen qué atajo serían.
 */
export function DialogoGuardar({
  def,
  rango,
  nombreInicial,
  existente,
  guardando,
  error,
  onGuardar,
  onCerrar,
}: {
  def: Definicion;
  /** Las fechas que resolvió la última corrida. */
  rango: { desde: string; hasta: string; etiqueta: string } | null;
  nombreInicial: string;
  /** Si se está editando uno guardado: se puede guardar encima o como nuevo. */
  existente: boolean;
  guardando: boolean;
  error: string | null;
  onGuardar: (nombre: string, def: Definicion, comoNuevo: boolean) => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const relativa = "atajo" in def.fechas;
  const [fijar, setFijar] = useState(false);

  const final = (): Definicion =>
    relativa && fijar && rango ? { ...def, fechas: { desde: rango.desde, hasta: rango.hasta } } : def;
  const listo = nombre.trim().length > 0 && nombre.trim().length <= 120;

  const opcion = (activa: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 ${
      activa ? "border-[1.5px] border-foreground" : "border border-border hover:bg-muted/60"
    }`;

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-[19px]">Guardar el reporte</DialogTitle>
            <DialogDescription className="mt-0 text-[13px]">
              Se guarda la pregunta, no las filas: cada vez que lo abras corre sobre los datos de ese día.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Nombre</span>
            <input
              autoFocus
              value={nombre}
              maxLength={120}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="La cartera como la reviso yo"
              className="h-11 rounded-[0.6rem] border border-border bg-background px-3 text-sm outline-none focus:border-[#f25623] focus:shadow-[0_0_0_3px_rgba(242,86,35,0.2)]"
            />
          </label>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-xs font-medium">Las fechas</legend>
            {relativa ? (
              <>
                <label className={opcion(!fijar)}>
                  <input type="radio" name="fechas" checked={!fijar} onChange={() => setFijar(false)} className="mt-1 accent-foreground" />
                  <span className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <RefreshCw className="size-3.5" aria-hidden /> Se actualiza sola
                    </span>
                    <span className="text-xs leading-normal text-[#4d4d4d] dark:text-[#b8b8b8]">
                      Siempre {rango?.etiqueta ?? "el mismo atajo"}: la próxima vez mostrará las fechas del día en que lo abras.
                    </span>
                  </span>
                </label>
                <label className={opcion(fijar)}>
                  <input type="radio" name="fechas" checked={fijar} onChange={() => setFijar(true)} disabled={!rango} className="mt-1 accent-foreground" />
                  <span className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <MapPin className="size-3.5" aria-hidden /> Fija
                    </span>
                    <span className="text-xs leading-normal text-[#4d4d4d] dark:text-[#b8b8b8]">
                      {rango
                        ? `Siempre ${rangoLargo(rango.desde, rango.hasta)}, aunque lo abras dentro de un año.`
                        : "Corre el reporte una vez para saber qué fechas quedarían."}
                    </span>
                  </span>
                </label>
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="text-xs leading-normal text-[#4d4d4d] dark:text-[#b8b8b8]">
                  <strong className="font-semibold text-foreground">Fija.</strong> Las fechas están escritas a mano:{" "}
                  {"desde" in def.fechas ? rangoLargo(def.fechas.desde, def.fechas.hasta) : ""}, siempre. Si quieres que se
                  mueva con el calendario, elige un atajo antes de guardar.
                </span>
              </div>
            )}
          </fieldset>

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
          {existente && (
            <Button variant="outline" disabled={!listo || guardando} onClick={() => onGuardar(nombre.trim(), final(), true)}>
              Guardar como uno nuevo
            </Button>
          )}
          <Button disabled={!listo || guardando} onClick={() => onGuardar(nombre.trim(), final(), false)}>
            {guardando ? "Guardando…" : existente ? "Guardar cambios" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
