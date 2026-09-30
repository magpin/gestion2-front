"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { madrePermitida } from "../lib/madres";
import { planCuentasApi } from "../services/plan-cuentas.service";
import type { CuentaEmpresa } from "../types/plan-cuentas.types";

/** Lo que se invalida al crear una cuenta: el plan y las configuraciones que la muestran. */
export const CLAVES_AL_CREAR_CUENTA = [["plan-cuentas"], ["tesoreria", "configuracion"], ["inventario", "configuracion"]];

/**
 * «+ Crear cuenta auxiliar» desde el formulario que la necesita: propone la
 * madre, muestra el código que va a salir —lo calcula el servidor— y pide solo
 * el nombre. Al guardar, la cuenta queda elegida (`alGuardar`).
 *
 * `madres`: una sola, y queda fija; varias (prefijos: «6135», «61»), y se
 * elige entre las del plan que caen bajo ellas; `"cualquiera"`, todo el plan.
 * El formulario se monta solo con el diálogo abierto.
 */
export function DialogoCuentaAuxiliar({
  abierto,
  onCerrar,
  madres,
  nombreSugerido,
  alGuardar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  madres: readonly string[] | "cualquiera";
  nombreSugerido?: string;
  alGuardar: (cuenta: CuentaEmpresa) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        {abierto && (
          <Formulario madres={madres} nombreSugerido={nombreSugerido} onCerrar={onCerrar} alGuardar={alGuardar} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Una madre fija: un código de cuenta (4 dígitos o más), no un prefijo de clase. */
const esCuenta = (codigo: string) => codigo.length >= 4;

function Formulario({
  madres,
  nombreSugerido,
  onCerrar,
  alGuardar,
}: {
  madres: readonly string[] | "cualquiera";
  nombreSugerido?: string;
  onCerrar: () => void;
  alGuardar: (cuenta: CuentaEmpresa) => void;
}) {
  const queryClient = useQueryClient();
  const roles = useAuthStore((s) => s.roles);
  const fija = madres !== "cualquiera" && madres.length === 1 && esCuenta(madres[0]) ? madres[0] : null;
  const [madre, setMadre] = useState<string | null>(fija);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState(nombreSugerido ?? "");

  // Las madres posibles: cuentas del plan (de 4 dígitos o más) bajo alguno de
  // los prefijos, que este rol pueda usar.
  const { data: candidatas = [], isFetching: buscando } = useQuery({
    queryKey: ["plan-cuentas", "madres", busqueda],
    queryFn: () => planCuentasApi.listar({ q: busqueda.trim() || undefined }),
    enabled: fija === null,
    staleTime: 60_000,
  });
  const opciones = candidatas
    .filter((c) => esCuenta(c.codigo))
    .filter((c) => madres === "cualquiera" || madres.some((m) => c.codigo.startsWith(m)))
    .filter((c) => madrePermitida(roles, c.codigo))
    .slice(0, 50);

  const { data: deLaMadre } = useQuery({
    queryKey: ["plan-cuentas", "fila", fija],
    queryFn: () => planCuentasApi.listar({ q: fija!, incluirInactivas: "true" }),
    enabled: fija !== null,
  });
  const nombreMadre = deLaMadre?.find((c) => c.codigo === fija)?.nombre;

  const { data: codigo, isFetching: calculando } = useQuery({
    queryKey: ["plan-cuentas", "siguiente", madre],
    queryFn: () => planCuentasApi.siguiente(madre!),
    enabled: madre !== null,
  });

  const crear = useMutation({
    mutationFn: () => planCuentasApi.crearAuxiliar({ madre: madre!, nombre: nombre.trim() }),
    onSuccess: async (cuenta) => {
      await Promise.all(CLAVES_AL_CREAR_CUENTA.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      aviso.exito(`Cuenta ${cuenta.codigo} creada`);
      alGuardar(cuenta);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const problema =
    madre === null ? "Elegí bajo qué cuenta va." : nombre.trim().length < 2 ? "Poné el nombre de la cuenta." : null;

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Crear cuenta auxiliar</DialogTitle>
          <DialogDescription>El código lo pone el sistema: el siguiente libre bajo la cuenta madre.</DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
        {fija !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Va bajo</span>
            <div className="flex h-[52px] flex-col justify-center rounded-[9.6px] bg-muted px-3.5">
              <span className="text-sm font-semibold">
                <span className="font-mono">{fija}</span>
                {nombreMadre && <span className="ml-2">{nombreMadre}</span>}
              </span>
            </div>
          </div>
        ) : (
          <Campo id="madre-busqueda" etiqueta="Va bajo">
            <div className="flex flex-col gap-2">
              <Input
                id="madre-busqueda"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Código o nombre de la cuenta madre"
                className="h-11 rounded-xl px-4"
              />
              <div role="radiogroup" aria-label="Cuenta madre" className="max-h-56 overflow-y-auto rounded-xl border border-border p-1">
                {buscando && (
                  <div className="flex justify-center py-4 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                )}
                {!buscando && opciones.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Ninguna cuenta coincide.</p>
                )}
                {!buscando &&
                  opciones.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={madre === c.codigo}
                      onClick={() => setMadre(c.codigo)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent",
                        madre === c.codigo && "bg-accent",
                      )}
                    >
                      <Check className={cn("size-4 shrink-0", madre === c.codigo ? "opacity-100" : "opacity-0")} />
                      <span className="font-mono text-xs text-muted-foreground">{c.codigo}</span>
                      <span className="truncate">{c.nombre}</span>
                    </button>
                  ))}
              </div>
            </div>
          </Campo>
        )}

        <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Código</span>
            <div className="flex h-11 items-center rounded-xl bg-muted px-4 font-mono text-sm" aria-label="Código de la cuenta nueva">
              {madre === null ? "—" : calculando ? <Loader2 className="size-4 animate-spin" /> : (codigo ?? "—")}
            </div>
          </div>
          <Campo id="nombre-auxiliar" etiqueta="Nombre">
            <Input
              id="nombre-auxiliar"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={120}
              placeholder="Ej: Bancolombia ahorros ···1234"
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">{problema ?? "Lista para crear."}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-11 rounded-xl px-5" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl px-5"
            disabled={problema !== null || crear.isPending}
            onClick={() => crear.mutate()}
          >
            {crear.isPending && <Loader2 className="size-4 animate-spin" />}
            Crear cuenta
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
