"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Campo } from "@/modules/configuracion/components/Campo";
import { CentroDelDocumento } from "@/modules/plan-cuentas/components/CentroDelDocumento";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { tercerosApi } from "@/modules/terceros/services/terceros.service";

export interface DatosNotaBanco {
  contraCuentaId: string;
  concepto: string;
  terceroId?: string;
  /** Si la cuenta es de ingreso, costo o gasto: dónde. */
  centroCostoId?: string;
}

/**
 * La contrapartida de una nota débito o crédito que nace del extracto: la
 * diferencia de un cruce (`completar`) o lo que el banco hizo solo
 * (`registrar`). Las dos piden lo mismo —cuenta, concepto y, si la cuenta lo
 * exige, tercero—; lo que cambia es qué se va a registrar, y eso lo dice
 * `resumen` antes del clic.
 *
 * La cuenta no viene sugerida. Para un cargo del banco sería el gasto, pero
 * para un error nuestro sería sugerir el error: la elige una persona.
 *
 * Se monta abierto y se desmonta al cerrar, así cada vez arranca vacío.
 */
export function DialogoNotaBanco({
  titulo,
  descripcion,
  resumen,
  ayudaCuenta,
  guardando,
  onConfirmar,
  onCerrar,
}: {
  titulo: string;
  descripcion: string;
  resumen: React.ReactNode;
  ayudaCuenta: string;
  guardando: boolean;
  onConfirmar: (datos: DatosNotaBanco) => void;
  onCerrar: () => void;
}) {
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);
  const [concepto, setConcepto] = useState("");
  const [terceroId, setTerceroId] = useState("");
  // `null`: el que proponga el sistema (el del usuario o el de por defecto).
  const [centro, setCentro] = useState<string | null>(null);
  const deResultado = cuenta !== null && /^[4-7]/.test(cuenta.codigo);

  const exigeTercero = cuenta?.exige_tercero ?? false;
  const { data: terceros } = useQuery({
    queryKey: ["terceros", "para-asiento"],
    queryFn: () => tercerosApi.listar({}),
    enabled: exigeTercero,
    staleTime: 5 * 60_000,
  });

  /*
   * `registrar` y `completar` no reciben base gravable, y el trigger del
   * asiento rechaza una cuenta que la exige. Se dice acá, al elegirla, y no
   * después con el error de la base. El centro de costo sí lo reciben.
   */
  const noSirve = cuenta?.exige_base_gravable ? "base gravable" : null;

  const conceptoLimpio = concepto.trim();
  const completo =
    cuenta !== null &&
    noSirve === null &&
    conceptoLimpio.length >= 3 &&
    conceptoLimpio.length <= 300 &&
    (!exigeTercero || terceroId !== "");

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <div className="rounded-2xl bg-muted p-4 text-sm">{resumen}</div>

          <Campo id="contraCuenta" etiqueta="Cuenta contable" ayuda={ayudaCuenta} escala="grande">
            <SelectorCuenta valor={cuenta} onElegir={setCuenta} invalido={noSirve !== null} crear={{ madres: "cualquiera" }} />
          </Campo>

          {noSirve && (
            <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">
              Esta cuenta exige {noSirve}, y registrar desde el extracto todavía no
              lo pide. Elija otra auxiliar.
            </p>
          )}

          {exigeTercero && (
            <Campo id="tercero" etiqueta="Tercero" ayuda="Esta cuenta lo exige." escala="grande">
              <Select
                items={(terceros?.datos ?? []).map((t) => ({ value: t.id, label: t.nombre }))}
                value={terceroId}
                onValueChange={(v) => setTerceroId(v ?? "")}
              >
                <SelectTrigger id="tercero" className="h-11 w-full rounded-xl px-4">
                  <SelectValue placeholder="Elija el tercero" />
                </SelectTrigger>
                <SelectContent>
                  {(terceros?.datos ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          )}

          {deResultado && <CentroDelDocumento valor={centro} onCambiar={setCentro} className="max-w-sm" />}

          <Campo id="concepto" etiqueta="Concepto" ayuda="Lo que va a decir el movimiento en el libro." escala="grande">
            <Input
              id="concepto"
              maxLength={300}
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!completo || guardando}
            onClick={() =>
              cuenta &&
              onConfirmar({
                contraCuentaId: cuenta.id,
                concepto: conceptoLimpio,
                terceroId: exigeTercero ? terceroId : undefined,
                ...(deResultado && centro !== null && { centroCostoId: centro }),
              })
            }
            className="h-12 gap-2 rounded-xl px-6"
          >
            {guardando && <Loader2 className="size-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
