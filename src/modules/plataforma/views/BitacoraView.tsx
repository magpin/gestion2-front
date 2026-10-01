"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BotonBuscar } from "../components/BotonBuscar";
import { Encabezado, ErrorCarga, Mono, Th, Vacio } from "../components/piezas";
import { describir } from "../lib/bitacora";
import { fecha, hora, plural } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";
import { NOMBRE_ACCION } from "../types/plataforma.types";

const campo =
  "h-9 rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Todo lo que un administrador cambió, en toda la plataforma: quién, qué, a
 * qué cuenta y cuándo. No se edita ni se borra, y la pantalla no lo ofrece.
 */
export function BitacoraView() {
  const [filtro, setFiltro] = useState({
    admin: "",
    accion: "",
    desde: "",
    hasta: "",
  });
  const [pagina, setPagina] = useState(1);

  const consulta = useQuery({
    queryKey: ["plataforma", "bitacora", "global", filtro, pagina],
    queryFn: () => plataformaService.bitacora({ ...filtro, pagina }),
    placeholderData: keepPreviousData,
  });

  const cambiar = (c: Partial<typeof filtro>) => {
    setFiltro({ ...filtro, ...c });
    setPagina(1);
  };
  const d = consulta.data;

  return (
    <>
      <Encabezado
        titulo="Bitácora"
        subtitulo={
          d ? `${plural(d.total, "cambio")}. No se edita ni se borra.` : " "
        }
        acciones={<BotonBuscar />}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Administrador
          <select
            className={campo}
            value={filtro.admin}
            onChange={(e) => cambiar({ admin: e.target.value })}
          >
            <option value="">Todos</option>
            {d?.admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Acción
          <select
            className={campo}
            value={filtro.accion}
            onChange={(e) => cambiar({ accion: e.target.value })}
          >
            <option value="">Todas</option>
            {Object.entries(NOMBRE_ACCION).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Desde
          <Input
            type="date"
            className="h-9 w-40 text-[13px]"
            value={filtro.desde}
            onChange={(e) => cambiar({ desde: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Hasta
          <Input
            type="date"
            className="h-9 w-40 text-[13px]"
            value={filtro.hasta}
            onChange={(e) => cambiar({ hasta: e.target.value })}
          />
        </label>
      </div>

      {consulta.isError ? (
        <ErrorCarga
          que="la bitácora"
          alReintentar={() => void consulta.refetch()}
        />
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-border bg-card",
            consulta.isFetching && d && "opacity-70",
          )}
        >
          {!d ? (
            <div className="flex justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : d.filas.length === 0 ? (
            <Vacio titulo="Ningún cambio con esos filtros." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr>
                      <Th className="pl-5">Cuándo</Th>
                      <Th>Qué</Th>
                      <Th>Cuenta</Th>
                      <Th>Quién</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.filas.map((e) => (
                      <tr key={e.id} className="group/fila">
                        <td className="whitespace-nowrap border-b border-border py-2.5 pl-5 pr-3 text-[13px] group-last/fila:border-b-0">
                          <Mono>
                            {fecha(e.ocurridoEn)} {hora(e.ocurridoEn)}
                          </Mono>
                        </td>
                        <td className="border-b border-border px-3 py-2.5 text-[13px] group-last/fila:border-b-0">
                          {describir(e)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5 text-[13px] group-last/fila:border-b-0">
                          {e.cuentaId ? (
                            <Link
                              href={`/plataforma/cuentas/${e.cuentaId}`}
                              className="hover:underline"
                            >
                              {e.cuenta}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">
                              Plataforma
                            </span>
                          )}
                        </td>
                        <td className="border-b border-border px-3 py-2.5 text-[13px] text-muted-foreground group-last/fila:border-b-0">
                          {e.admin}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
                <span>
                  Mostrando {(d.pagina - 1) * d.porPagina + 1} a{" "}
                  {Math.min(d.pagina * d.porPagina, d.total)} de {d.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina <= 1}
                    onClick={() => setPagina(pagina - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina * d.porPagina >= d.total}
                    onClick={() => setPagina(pagina + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
