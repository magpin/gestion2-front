"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useManejaCajaMenor } from "@/core/hooks/useManejaCajaMenor";
import { aviso } from "@/lib/avisos";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { cuentasBancariasApi } from "../services/bancos.service";
import { cajasApi } from "../services/tesoreria.service";
import { FormularioCaja, type DatosCaja } from "./FormularioCaja";
import {
  FormularioCuentaBancaria,
  type DatosCuentaBancaria,
} from "./FormularioCuentaBancaria";

const ID_FORMULARIO_CAJA = "formulario-nueva-caja";
const ID_FORMULARIO_CUENTA_BANCARIA = "formulario-nueva-cuenta-bancaria";

/** Alta de una caja: una por sede, o el fondo fijo de caja menor. */
export function DialogoNuevaCaja({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const manejaCajaMenor = useManejaCajaMenor();
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);

  const cerrar = () => {
    setCuenta(null);
    onCerrar();
  };

  const crear = useMutation({
    mutationFn: (d: DatosCaja) =>
      cajasApi.crear({
        nombre: d.nombre,
        tipo: d.tipo,
        sedeId: d.tipo === "PRINCIPAL" ? d.sedeId : undefined,
        cuentaId: d.cuentaId,
        responsableTerceroId: d.responsableTerceroId || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cajas"] });
      aviso.exito("Caja registrada");
      cerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && cerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Nueva caja</DialogTitle>
            <DialogDescription>
              {manejaCajaMenor
                ? "Una por sede (arqueo por punto de venta), o el fondo fijo de caja menor."
                : "Una por sede: el arqueo se hace por punto de venta."}
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody>
          <FormularioCaja
            id={ID_FORMULARIO_CAJA}
            cuenta={cuenta}
            onCuenta={setCuenta}
            alGuardar={(d) => crear.mutate(d)}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_FORMULARIO_CAJA}
            className="h-12 rounded-xl px-6"
            disabled={crear.isPending}
          >
            {crear.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Alta de una cuenta bancaria, con su auxiliar propio en el plan de cuentas. */
export function DialogoNuevaCuentaBancaria({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);

  const cerrar = () => {
    setCuenta(null);
    onCerrar();
  };

  const crear = useMutation({
    mutationFn: (d: DatosCuentaBancaria) => cuentasBancariasApi.crear(d),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
      aviso.exito("Cuenta bancaria registrada");
      cerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && cerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Nueva cuenta bancaria</DialogTitle>
            <DialogDescription>Un auxiliar propio del plan de cuentas, uno por cuenta bancaria.</DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody>
          <FormularioCuentaBancaria
            id={ID_FORMULARIO_CUENTA_BANCARIA}
            cuenta={cuenta}
            onCuenta={setCuenta}
            alGuardar={(d) => crear.mutate(d)}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_FORMULARIO_CUENTA_BANCARIA}
            className="h-12 rounded-xl px-6"
            disabled={crear.isPending}
          >
            {crear.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar cuenta bancaria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
