"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { DatePicker } from "@/components/shared/DatePicker";
import { formatCOP, formatFecha } from "@/lib/utils";
import { crearColumnasMovimientos } from "../components/movimientosColumns";
import { hoyLocal } from "../lib/ciclo-caja";
import { useGetMovimientos, useGetSaldoCaja } from "../hooks/useCaja";

interface MovimientosViewProps {
  /** Las pestañas del área. Van bajo el título, no dentro de la barra. */
  pestanas?: ReactNode;
}

/**
 * Lo que entró y salió del cajón, día por día.
 *
 * **Solo efectivo.** Un cobro por transferencia no deja fila acá: la plata nunca
 * estuvo en el cajón. Es la regla que hace confiable al arqueo — sin ella el
 * saldo del sistema pediría todos los días un efectivo que nadie recibió.
 *
 * No hay forma de agregar un movimiento a mano, y no es un olvido: no existe
 * `POST /caja/movimientos`. Las filas las produce un abono o un arqueo. Poder
 * escribirlas permitiría inventar efectivo sin documento que lo respalde, que es
 * justo lo que el arqueo existe para detectar.
 */
export function MovimientosView({ pestanas }: MovimientosViewProps) {
  const [dia, setDia] = useState(hoyLocal());

  const { data: saldo = 0 } = useGetSaldoCaja(dia);
  const { data, isLoading, isError, refetch } = useGetMovimientos({
    desde: dia,
    hasta: dia,
    limite: 100,
  });

  const movimientos = useMemo(() => data?.datos ?? [], [data]);
  const columnas = useMemo(() => crearColumnasMovimientos(), []);

  /* El neto del día. El saldo de arriba es acumulado hasta la fecha; este es
     solo lo que se movió hoy, que no es lo mismo. */
  const neto = useMemo(
    () =>
      movimientos.reduce(
        (total, movimiento) =>
          movimiento.sentido === "ENTRADA" ? total + movimiento.importe : total - movimiento.importe,
        0,
      ),
    [movimientos],
  );

  const esHoy = dia === hoyLocal();

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Caja"
        acciones={
          <div className="w-52">
            <DatePicker value={dia} onChange={setDia} />
          </div>
        }
      />

      <DataTable
        pestanas={pestanas}
        columns={columnas}
        data={movimientos}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        mensajeVacio={
          esHoy
            ? "Todavía no ha pasado efectivo por el cajón hoy. Los cobros por transferencia no aparecen acá: esa plata no pasó por la caja."
            : `No hubo movimientos de efectivo el ${formatFecha(dia)}.`
        }
        /* Sin filtros: el día ya se elige arriba y acá no hay nada más que
           acotar. Queda solo el acumulado, que es el contexto de la tabla. */
        barra={
          <p className="text-sm text-muted-foreground">
            Efectivo acumulado al {formatFecha(dia)}{" "}
            <strong className="font-mono text-base text-foreground">
              {formatCOP(saldo)}
            </strong>
          </p>
        }
        pie={
          <tr>
            <td colSpan={3} className="text-muted-foreground">
              Neto del día · {movimientos.length}{" "}
              {movimientos.length === 1 ? "movimiento" : "movimientos"}
            </td>
            <td />
            <td className="text-right font-mono tabular-nums text-foreground">
              {formatCOP(neto)}
            </td>
          </tr>
        }
      />
    </div>
  );
}
