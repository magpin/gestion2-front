"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { configuracionCajaApi } from "../services/tesoreria.service";

/**
 * Un solo campo: la contrapartida contable de un faltante o sobrante de
 * arqueo. Se fija una sola vez por empresa, y solo con criterio contable
 * —CONTADOR o DIRECTOR, nunca CAJA sola— porque elegirla es una decisión
 * de mapeo de cuentas, no una operación de caja. Copia casi exacta de la
 * de Inventario: mismo problema (`cuenta_ajuste_id` allá,
 * `cuenta_diferencia_id` acá), misma solución.
 */
export function ConfiguracionSeccion() {
  const queryClient = useQueryClient();
  const puedeConfigurar = useTieneRol("CONTADOR", "DIRECTOR");

  const { data: configuracion, isLoading } = useQuery({
    queryKey: ["tesoreria", "configuracion"],
    queryFn: configuracionCajaApi.obtener,
  });

  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);

  const guardar = useMutation({
    mutationFn: (cuentaDiferenciaId: string) => configuracionCajaApi.fijarCuentaDiferencia(cuentaDiferenciaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tesoreria", "configuracion"] });
      aviso.exito("Configuración guardada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const configurado = configuracion?.cuenta_diferencia_id != null;

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
      <h2 className="mt-6 text-2xl font-semibold">Configuración de caja</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Define la cuenta contable que se va a usar automáticamente para ajustar un faltante o sobrante de arqueo.
      </p>

      <div className="mt-6">
        <Campo id="cuentaDiferencia" etiqueta="Cuenta contable para diferencia de arqueo" escala="grande">
          <SelectorCuenta valor={cuenta} onElegir={setCuenta} />
        </Campo>
      </div>

      {!configurado && (
        <div className="mt-5 rounded-2xl bg-warning/10 p-4 text-sm text-warning">
          Configura esta cuenta antes de cerrar un arqueo con diferencia — sin diferencia, el cierre igual funciona.
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
        <p className="mt-3 text-xs text-muted-foreground">Solo Contador o Director pueden cambiar esta cuenta.</p>
      )}
    </section>
  );
}
