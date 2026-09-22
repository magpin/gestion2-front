"use client";

import { useSearchParams } from "next/navigation";

import { BotonBuscar } from "../components/BotonBuscar";
import { Encabezado } from "../components/piezas";
import { VistaConsumo } from "../components/VistaConsumo";

/** El consumo de la IA de toda la plataforma. `?cuenta=` llega desde Inicio. */
export function ConsumoView() {
  const cuenta = useSearchParams().get("cuenta");
  return (
    <>
      <Encabezado
        titulo="Consumo de IA"
        subtitulo="Del asistente solo se ven cifras: tokens, costos, tiempos y cantidades."
        acciones={<BotonBuscar />}
      />
      <VistaConsumo key={cuenta ?? "todas"} cuentaInicial={cuenta} />
    </>
  );
}
