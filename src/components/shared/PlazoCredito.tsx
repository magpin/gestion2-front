"use client";

import { SelectField } from "@/components/shared/SelectField";
import { formatCOP, formatFecha } from "@/lib/utils";
import {
  FRECUENCIAS,
  OPCIONES_CUOTAS,
  generarCuotas,
  type FrecuenciaCredito,
} from "@/lib/cuotas";

interface PlazoCreditoProps {
  frecuencia: FrecuenciaCredito;
  numeroCuotas: number;
  onFrecuencia: (valor: FrecuenciaCredito) => void;
  onNumeroCuotas: (valor: number) => void;
  // Sobre qué monto se calculan las cuotas. En una venta es el total; en una
  // reparación, el saldo que queda después de los anticipos.
  total: number;
}

// Los dos desplegables del plazo, con el resumen calculándose en vivo.
//
// El resumen no es adorno: es lo que evita pactar un plazo sin ver qué significa
// en pesos y en fechas. "6 cuotas" no dice nada; "6 cuotas de $708.333, la última
// el 15 de enero" sí.
export function PlazoCredito({
  frecuencia,
  numeroCuotas,
  onFrecuencia,
  onNumeroCuotas,
  total,
}: PlazoCreditoProps) {
  const cuotas = generarCuotas(total, frecuencia, numeroCuotas);
  const primera = cuotas[0];
  const ultima = cuotas[cuotas.length - 1];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Frecuencia</label>
          <SelectField
            value={frecuencia}
            onChange={(valor) => onFrecuencia(valor as FrecuenciaCredito)}
            options={FRECUENCIAS.map((f) => ({ value: f.id, label: f.label }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Número de cuotas
          </label>
          <SelectField
            value={String(numeroCuotas)}
            onChange={(valor) => onNumeroCuotas(Number(valor))}
            options={OPCIONES_CUOTAS.map((n) => ({
              value: String(n),
              label: String(n),
            }))}
          />
        </div>
      </div>

      {primera && ultima ? (
        <p className="text-sm text-foreground">
          {cuotas.length === 1 ? (
            <>
              1 cuota de <span className="font-medium">{formatCOP(primera.monto)}</span> el{" "}
              {formatFecha(primera.fechaVencimiento.toISOString())}
            </>
          ) : (
            <>
              {cuotas.length} cuotas de{" "}
              <span className="font-medium">{formatCOP(primera.monto)}</span> · primera el{" "}
              {formatFecha(primera.fechaVencimiento.toISOString())} · última el{" "}
              {formatFecha(ultima.fechaVencimiento.toISOString())}
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Agregue líneas para ver el plan de pagos.
        </p>
      )}

      {/* La última cuota absorbe el redondeo para que la suma dé exacto. Si no se
          dice, parece un error de cálculo cuando el usuario suma a mano. */}
      {ultima && cuotas.length > 1 && ultima.monto !== primera?.monto && (
        <p className="text-xs text-muted-foreground">
          La última es de {formatCOP(ultima.monto)}: absorbe los centavos del redondeo
          para que las cuotas sumen exactamente el total.
        </p>
      )}
    </div>
  );
}
