"use client";

import { useState } from "react";
import { PestanasModulo, type PestanaModulo } from "@/components/shared/PestanasModulo";
import { ArqueosView } from "./ArqueosView";
import { CajaView } from "./CajaView";
import { MovimientosView } from "./MovimientosView";

type Vista = "cobros" | "movimientos" | "arqueos";

const VISTAS: PestanaModulo<Vista>[] = [
  { id: "cobros", label: "Cobros y pagos" },
  { id: "movimientos", label: "Movimientos del cajón" },
  { id: "arqueos", label: "Arqueos" },
];

/**
 * El área de caja, mirada de tres formas.
 *
 * Cambiar de vista es cambiar de tabla —otras columnas, otro total—, así que va
 * como pestaña y no como chip: el chip comparte forma con los filtros, y una
 * fila de pastillas donde unas cambian la lista entera y otras solo la acotan
 * obliga a probar para saber cuál es cuál.
 *
 * Las pestañas encabezan el bloque de la tabla, sobre los filtros, como en el
 * panel de proceso de Ventas: gobiernan esa tabla, no la página.
 *
 * Cobros y movimientos NO son la misma lista: un cobro por transferencia sale
 * en la primera y no en la segunda, porque esa plata nunca pasó por el cajón.
 */
export function CajaModuloView() {
  const [vista, setVista] = useState<Vista>("cobros");

  const pestanas = (
    <PestanasModulo
      etiqueta="Qué se está viendo"
      opciones={VISTAS}
      valor={vista}
      onChange={setVista}
      // Van dentro del bloque de la tabla, que ya cierra con su propia línea.
      // La del componente quedaría a media altura.
      linea={false}
    />
  );

  if (vista === "cobros") return <CajaView pestanas={pestanas} />;
  if (vista === "movimientos") return <MovimientosView pestanas={pestanas} />;
  return <ArqueosView pestanas={pestanas} />;
}
