"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { AreaSinReportes, TarjetaReporte } from "../components/TarjetaReporte";
import { ModalPeriodo } from "../components/ModalPeriodo";
import { SeccionAMedida } from "../components/armador/SeccionAMedida";
import { useAtajos, useListaReportes } from "../hooks/useReportes";
import { rutaDelVisor } from "../lib/eleccion";
import styles from "../reportes.module.css";
import type { Reporte } from "../types/reportes.types";

/**
 * Los reportes, en tarjetas.
 *
 * Arriba los que se pueden sacar; abajo, punteadas, las áreas que todavía no
 * tienen ninguno. Se muestran igual: quien busca un reporte de compras tiene
 * que enterarse de que no existe, no preguntarse si lo está buscando mal.
 */
export function ReportesView() {
  const router = useRouter();
  const { data: areas, isPending, isError, refetch } = useListaReportes();
  // Se pide ya, aunque nadie haya abierto el modal: así las fechas de los
  // atajos están listas cuando alguien lo abra.
  const { data: atajos } = useAtajos();
  const [elegido, setElegido] = useState<Reporte | null>(null);

  const conReportes = areas?.flatMap((a) => a.reportes.map((r) => ({ r, area: a }))) ?? [];
  const vacias = areas?.filter((a) => a.reportes.length === 0) ?? [];

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.4px]">Reportes</h1>
          <p className="m-0 text-sm text-muted-foreground">
            Elija el reporte y el período. Lo verá en pantalla tal como se imprime.
          </p>
        </div>
        {areas && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {conReportes.length} {conReportes.length === 1 ? "disponible" : "disponibles"}
          </span>
        )}
      </div>

      {isError ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6">
          <span className="text-base font-semibold">No se pudo traer la lista de reportes</span>
          <span className="text-sm text-muted-foreground">
            Revise la conexión e intente de nuevo. Si sigue igual, el servidor puede estar caído.
          </span>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-[1.05rem] border border-border bg-card">
              <div className={`${styles.sk} h-[268px]`} />
              <div className="flex flex-col gap-3 p-5">
                <span className={`${styles.sk} h-5 w-1/2 rounded`} />
                <span className={`${styles.sk} h-4 w-3/4 rounded`} />
                <span className={`${styles.sk} h-[42px] rounded-lg`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {conReportes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Su rol no incluye ninguno de los reportes que hay por ahora. Si necesita alguno,
              solicite acceso a quien administra la empresa.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {conReportes.map(({ r, area }) => (
                <TarjetaReporte
                  key={r.clave}
                  reporte={r}
                  etiquetaArea={area.etiqueta}
                  hoy={atajos?.hoy}
                  onElegir={() => setElegido(r)}
                />
              ))}
            </div>
          )}

          {vacias.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {vacias.map((a) => (
                <AreaSinReportes key={a.area} area={a.area} etiqueta={a.etiqueta} />
              ))}
            </div>
          )}
        </>
      )}

      <SeccionAMedida hoy={atajos?.hoy} />

      {elegido && (
        <ModalPeriodo
          abierto
          reporte={elegido}
          onCerrar={() => setElegido(null)}
          onVer={(eleccion) => router.push(rutaDelVisor(elegido.clave, eleccion))}
        />
      )}
    </div>
  );
}
