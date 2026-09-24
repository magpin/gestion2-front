"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Settings2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { configuracionCajaApi } from "../services/tesoreria.service";
import type { ConceptoArqueo, ConceptoConfigurado } from "../types/tesoreria.types";

/** Qué pasa con la plata en cada caso, dicho para quien no lleva la contabilidad. */
const EXPLICACION: Record<ConceptoArqueo, string> = {
  SOBRANTE: "Plata de más al contar la caja: un ingreso que no se registró.",
  FALTANTE_COBRABLE:
    "Plata de menos que paga quien respondía por la caja: queda como cuenta por cobrar a esa persona.",
  FALTANTE_ASUMIDO: "Plata de menos que la empresa asume como gasto.",
};

/**
 * Contra qué cuenta se ajusta cada diferencia de arqueo.
 *
 * No hay nada que llenar para empezar: al abrir tesorería, el sistema crea
 * las cuentas que falten (429553, 136530, 531595) y las asigna —junto con la
 * caja de cada sede y la caja menor, si la empresa la maneja—
 * (`TesoreriaView`, con `configuracionCajaApi.preparar`). Solo pregunta cuando hay
 * algo que decidir: la empresa abrió auxiliares de una de esas cuentas y hay
 * que elegir cuál recibe el ajuste.
 *
 * Elegir es juicio contable: CONTADOR o DIRECTOR, nunca CAJA sola.
 */
export function ConfiguracionSeccion() {
  const queryClient = useQueryClient();
  const puedeConfigurar = useTieneRol("CONTADOR", "DIRECTOR");

  const { data: configuracion, isLoading } = useQuery({
    queryKey: ["tesoreria", "configuracion"],
    queryFn: configuracionCajaApi.obtener,
  });

  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tesoreria", "configuracion"] }),
      queryClient.invalidateQueries({ queryKey: ["cajas"] }),
    ]);

  const fijar = useMutation({
    mutationFn: ({ concepto, cuentaId }: { concepto: ConceptoArqueo; cuentaId: string }) =>
      configuracionCajaApi.fijar(concepto, cuentaId),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Cuenta guardada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const faltan = configuracion?.conceptos.filter((c) => c.cuenta === null) ?? [];

  return (
    <section className="max-w-3xl rounded-3xl border border-border bg-card p-7">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Settings2 />
      </span>
      <h2 className="mt-6 text-2xl font-semibold">Configuración de caja</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Cuando un arqueo no cuadra, el ajuste va a la cuenta de su concepto. Si una de estas cuentas
        tiene auxiliares, elegí cuál usar.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {configuracion?.conceptos.map((c) => (
          <Concepto
            key={c.concepto}
            concepto={c}
            puedeConfigurar={puedeConfigurar}
            guardando={fijar.isPending && fijar.variables?.concepto === c.concepto}
            alElegir={(cuentaId) => fijar.mutate({ concepto: c.concepto, cuentaId })}
          />
        ))}
      </ul>

      {faltan.length > 0 && (
        <div className="mt-5 rounded-2xl bg-warning/10 p-4 text-sm text-warning">
          {puedeConfigurar
            ? `Falta elegir la cuenta de: ${faltan.map((c) => c.etiqueta).join(", ")}. Mientras tanto, un arqueo con esa diferencia no puede cerrar.`
            : "Falta configurar alguna cuenta de arqueo. Pídeselo al Contador o al Director."}
        </div>
      )}
      {!puedeConfigurar && (
        <p className="mt-3 text-xs text-muted-foreground">Solo Contador o Director pueden cambiar estas cuentas.</p>
      )}
    </section>
  );
}

function Concepto({
  concepto: c,
  puedeConfigurar,
  guardando,
  alElegir,
}: {
  concepto: ConceptoConfigurado;
  puedeConfigurar: boolean;
  guardando: boolean;
  alElegir: (cuentaId: string) => void;
}) {
  // Con una sola opción no hay nada que elegir: la cuenta queda puesta sola.
  const hayQueElegir = c.opciones.length > 1;

  return (
    <li className="rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">{c.etiqueta}</p>
          <p className="mt-1 text-sm text-muted-foreground">{EXPLICACION[c.concepto]}</p>
        </div>
        {c.cuenta !== null && !hayQueElegir && (
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Configurada" />
        )}
      </div>

      <div className="mt-4">
        {hayQueElegir ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`cuenta-${c.concepto}`} className="text-xs font-semibold text-muted-foreground">
              La cuenta {c.codigoPorDefecto} tiene {c.opciones.length} auxiliares: ¿cuál recibe el ajuste?
            </label>
            <div className="flex items-center gap-3">
              <Select
                items={c.opciones.map((o) => ({ value: o.id, label: `${o.codigo} · ${o.nombre}` }))}
                value={c.cuenta?.id ?? ""}
                onValueChange={(v) => v && alElegir(v)}
                disabled={!puedeConfigurar || guardando}
              >
                <SelectTrigger id={`cuenta-${c.concepto}`} className="h-11 w-full rounded-xl px-4">
                  <SelectValue placeholder="Elegí un auxiliar" />
                </SelectTrigger>
                <SelectContent>
                  {c.opciones.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.codigo} · {o.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {guardando && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
            </div>
          </div>
        ) : c.cuenta !== null ? (
          <p className="font-mono text-sm">
            {c.cuenta.codigo} <span className="font-sans text-muted-foreground">· {c.cuenta.nombre}</span>
          </p>
        ) : (
          <p className="text-sm text-warning">
            La cuenta {c.codigoPorDefecto} no está en el plan de cuentas.
          </p>
        )}
      </div>
    </li>
  );
}
