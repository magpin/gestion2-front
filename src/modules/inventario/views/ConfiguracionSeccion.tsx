"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { configuracionApi } from "../services/inventario.service";

/**
 * Dos decisiones de empresa, cada una con su dueño.
 *
 * La contrapartida contable de los ajustes la elige quien tiene criterio
 * contable —CONTADOR o DIRECTOR, nunca INVENTARIO—: es mapeo de cuentas, no
 * operación de bodega. Vender sin existencia lo decide **solo el DIRECTOR**:
 * es asumir que el kardex pueda quedar en rojo y que el costo de esa venta se
 * valore con el último promedio conocido.
 */
export function ConfiguracionSeccion() {
  const queryClient = useQueryClient();
  const puedeConfigurar = useTieneRol("CONTADOR", "DIRECTOR");
  const esDirector = useTieneRol("DIRECTOR");

  const { data: configuracion, isLoading } = useQuery({
    queryKey: ["inventario", "configuracion"],
    queryFn: configuracionApi.obtener,
  });

  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);

  const guardar = useMutation({
    mutationFn: (cuentaAjusteId: string) =>
      configuracionApi.fijarCuentaAjuste(cuentaAjusteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["inventario", "configuracion"],
      });
      aviso.exito("Configuración guardada");
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const permitirDescubierto = useMutation({
    mutationFn: (permite: boolean) =>
      configuracionApi.fijarExistenciaNegativa(permite),
    onSuccess: async (guardada) => {
      await queryClient.invalidateQueries({
        queryKey: ["inventario", "configuracion"],
      });
      aviso.exito(
        guardada.permite_existencia_negativa
          ? "Se puede facturar sin existencia, confirmando cada vez"
          : "Facturar sin existencia queda bloqueado",
      );
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const configurado = configuracion?.cuenta_ajuste_id != null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <section className="max-w-3xl rounded-3xl border border-border bg-card p-7">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Settings2 />
      </span>
      <h2 className="mt-6 text-2xl font-semibold">
        Configuración de inventario
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Define la cuenta contable que se va a usar automáticamente para los
        ajustes de inventario.
      </p>

      <div className="mt-6">
        <Campo
          id="cuentaAjuste"
          etiqueta="Cuenta contable para ajustes de inventario"
          escala="grande"
        >
          <SelectorCuenta valor={cuenta} onElegir={setCuenta} />
        </Campo>
      </div>

      {!configurado && (
        <div className="mt-5 rounded-2xl bg-warning/10 p-4 text-sm text-warning">
          Configura esta cuenta antes de poder registrar ajustes de inventario.
        </div>
      )}

      <Button
        type="button"
        disabled={!puedeConfigurar || !cuenta || guardar.isPending}
        onClick={() => cuenta && guardar.mutate(cuenta.id)}
        className="mt-7 h-12 rounded-xl px-6"
      >
        {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
        Guardar configuración
      </Button>
      {!puedeConfigurar && (
        <p className="mt-3 text-xs text-muted-foreground">
          Solo Contador o Director pueden cambiar esta cuenta.
        </p>
      )}

      <hr className="my-8 border-border" />

      <h3 className="text-lg font-semibold">Vender sin existencia</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Con esto apagado, una factura que saque más de lo que hay se rechaza y
        no hay forma de seguir. Encendido, quien factura tiene que confirmarlo
        documento por documento —no pasa solo—, el inventario de ese producto
        queda en negativo y lo que falte se anota en la pestaña Faltantes con la
        factura que lo sacó. La venta se valora al último costo promedio
        conocido del producto; si nunca tuvo una entrada, se rechaza igual.
      </p>

      <label className="mt-5 flex w-fit items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-medium">
        <Checkbox
          checked={configuracion?.permite_existencia_negativa ?? false}
          disabled={!esDirector || permitirDescubierto.isPending}
          onCheckedChange={(marcado) =>
            permitirDescubierto.mutate(marcado === true)
          }
        />
        Permitir facturar sin existencia
      </label>
      {!esDirector && (
        <p className="mt-3 text-xs text-muted-foreground">
          Solo el Director puede cambiar esto.
        </p>
      )}
    </section>
  );
}
