"use client";

import { useState } from "react";
import { PestanasModulo, type PestanaModulo } from "@/components/shared/PestanasModulo";
import { CotizacionesView } from "@/modules/dashboard/cotizaciones/views/CotizacionesView";
import { VentasView } from "./VentasView";

type Tab = "ventas" | "cotizaciones";

const TABS: PestanaModulo<Tab>[] = [
  { id: "ventas", label: "Ventas" },
  { id: "cotizaciones", label: "Cotizaciones" },
];

/**
 * El proceso Venta, con la cotización como su antesala.
 *
 * Van juntas porque son el mismo flujo comercial —cotizar es el paso A0 y
 * vender el A3— y porque el menú tiene una sola entrada por proceso misional.
 * Cada una conserva su ruta propia para el detalle y el enlace directo.
 *
 * Las pestañas se le pasan a la pantalla activa para que las pinte DEBAJO de su
 * título: primero dónde estás parado, después a dónde puedes moverte.
 *
 * Subrayadas y no en pastilla, como en Caja: cambiar de pestaña cambia la tabla
 * entera. La pastilla ya es la forma del chip de filtro y tenerlas iguales
 * obligaba a probar para saber cuál hacía qué.
 */
export function VentasModuloView() {
  const [tab, setTab] = useState<Tab>("ventas");

  const pestanas = (
    <PestanasModulo
      etiqueta="Qué se está viendo"
      opciones={TABS}
      valor={tab}
      onChange={setTab}
      // Van dentro del encabezado del panel de proceso, que ya cierra con su
      // propia línea. La del componente quedaría a media altura.
      linea={false}
    />
  );

  return tab === "ventas" ? (
    <VentasView pestanas={pestanas} />
  ) : (
    <CotizacionesView pestanas={pestanas} />
  );
}
