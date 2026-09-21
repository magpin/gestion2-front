"use client";

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
import { formatCOP, formatFecha } from "@/lib/utils";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { nombreCuenta } from "../lib/useCuentasContables";
import type { LineaExtractoResumen, PropuestasExtracto } from "../types/bancos.types";

type PorRegla = PropuestasExtracto["porRegla"][number];

/**
 * El segundo clic de «Registrar las 23 líneas de 4×1000». La regla reconoce;
 * una persona confirma viendo qué líneas, contra qué cuenta y con qué concepto.
 * Si una línea no es lo que la regla cree, se cancela y se cruza a mano.
 */
export function DialogoRegistrarRegla({
  regla,
  lineas,
  cuenta,
  guardando,
  onConfirmar,
  onCerrar,
}: {
  regla: PorRegla;
  lineas: LineaExtractoResumen[];
  cuenta: CuentaEmpresa | undefined;
  guardando: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  const n = regla.lineaIds.length;
  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>
              Registrar {n} línea{n === 1 ? "" : "s"} de {regla.nombre}
            </DialogTitle>
            <DialogDescription>
              Una nota por línea, con la fecha y el valor que dice el banco, y cada una
              cruzada con su línea. El soporte es el extracto.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <dl className="grid gap-3 rounded-2xl bg-muted p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="font-mono font-semibold">{formatCOP(Number(regla.total))}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contra la cuenta</dt>
              <dd className="font-medium">{cuenta ? nombreCuenta(cuenta) : "Cargando…"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Concepto</dt>
              <dd className="font-medium">{regla.concepto}</dd>
            </div>
          </dl>

          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-2xl border border-border">
            {lineas.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{formatFecha(l.fecha)}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{l.descripcion}</span>
                </span>
                <span className="shrink-0 font-mono">{formatCOP(Number(l.valor))}</span>
              </li>
            ))}
          </ul>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            // Sin la cuenta a la vista no se confirma: es lo que este segundo clic tiene que mostrar.
            disabled={guardando || !cuenta}
            onClick={onConfirmar}
            className="h-12 gap-2 rounded-xl px-6"
          >
            {guardando && <Loader2 className="size-4 animate-spin" />}
            Registrar {n}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
