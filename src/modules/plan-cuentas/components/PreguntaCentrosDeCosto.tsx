"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { planCuentasApi } from "../services/plan-cuentas.service";
import { CentrosDeCosto } from "./CentrosDeCosto";
import { CLAVE_CENTROS, CLAVE_MANEJO_CENTROS } from "./SelectorCentroCosto";

/**
 * La pregunta del asistente: si la empresa quiere ver sus resultados por sede,
 * área o proyecto. Con un «sí» se abren los centros de costo para crearlos y
 * encenderlos; ya encendidos, se muestran directo.
 */
export function PreguntaCentrosDeCosto() {
  const [quiere, setQuiere] = useState<boolean | null>(null);
  const { data: maneja = false } = useQuery({
    queryKey: CLAVE_MANEJO_CENTROS,
    queryFn: planCuentasApi.manejoCentros,
  });
  const { data: centros = [] } = useQuery({
    queryKey: CLAVE_CENTROS,
    queryFn: planCuentasApi.centros,
  });

  if (maneja || centros.length > 0 || quiere === true) return <CentrosDeCosto />;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">¿Quiere ver resultados por sede, área o proyecto?</h2>
      <p className="text-xs text-muted-foreground">
        Con centros de costo, el estado de resultados sale por cada uno: cuánto vendió,
        cuánto costó y cuánto gastó. Es opcional, no cambia ningún impuesto y se puede
        encender después desde el plan de cuentas.
      </p>
      {quiere === false ? (
        <p className="text-sm text-muted-foreground">
          Entendido: sin centros de costo.{" "}
          <button type="button" className="underline" onClick={() => setQuiere(null)}>
            Cambiar
          </button>
        </p>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setQuiere(true)}>
            Sí, crear centros
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setQuiere(false)}>
            No por ahora
          </Button>
        </div>
      )}
    </section>
  );
}
