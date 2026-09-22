"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, Loader2, Plus, Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { BotonBuscar } from "../components/BotonBuscar";
import {
  BarraCupo,
  Encabezado,
  ErrorCarga,
  EstadoCuentaBadge,
  Mono,
  Pastillas,
  Th,
  Vacio,
} from "../components/piezas";
import { cuando, dolares, fecha, pesos, plural } from "../lib/formato";
import { useTasa } from "../lib/tasa";
import { plataformaService } from "../services/plataforma.service";
import {
  NOMBRE_PLAN,
  type Cuenta,
  type FiltroCuentas,
  type OrdenCuentas,
} from "../types/plataforma.types";

const FILTROS: { valor: FiltroCuentas; texto: string }[] = [
  { valor: "TODAS", texto: "Todas" },
  { valor: "ACTIVAS", texto: "Activas" },
  { valor: "MOROSAS", texto: "Morosas" },
  { valor: "SUSPENDIDAS", texto: "Suspendidas" },
  { valor: "CERCA_CUPO", texto: "Cerca del cupo" },
  { valor: "SIN_ACTIVIDAD", texto: "Sin actividad" },
];

const COLUMNAS: { orden: OrdenCuentas; texto: string; derecha?: boolean }[] = [
  { orden: "nombre", texto: "Cuenta" },
  { orden: "plan", texto: "Plan" },
  { orden: "estado", texto: "Estado" },
  { orden: "empresas", texto: "Empresas", derecha: true },
  { orden: "usuarios", texto: "Usuarios", derecha: true },
  { orden: "ia", texto: "IA del mes", derecha: true },
  { orden: "acceso", texto: "Último acceso" },
  { orden: "alta", texto: "Alta" },
];

const DIA_MS = 86_400_000;

/** Un acceso viejo se dice en días: «34 días sin entrar». */
function sinEntrarHace(c: Cuenta): number | null {
  const desde = c.ultimoAcceso ?? c.creadoEn;
  const dias = Math.floor((Date.now() - Date.parse(desde)) / DIA_MS);
  return dias >= 30 && c.estado !== "CANCELADO" ? dias : null;
}

export function CuentasView() {
  const router = useRouter();
  const ruta = usePathname();
  const url = useSearchParams();
  const [tasa] = useTasa();

  const filtro = (url.get("filtro") as FiltroCuentas | null) ?? "TODAS";
  const orden = (url.get("orden") as OrdenCuentas | null) ?? "alta";
  const dir = url.get("dir") === "asc" ? "asc" : "desc";
  const pagina = Number(url.get("pagina")) || 1;
  const q = url.get("q") ?? "";

  const [texto, setTexto] = useState(q);
  const [exportando, setExportando] = useState(false);

  /** El estado de la tabla vive en la URL: se comparte y sobrevive al volver. */
  const cambiar = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(url.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    if (!("pagina" in cambios)) p.delete("pagina");
    router.replace(`${ruta}?${p.toString()}`, { scroll: false });
  };

  // La búsqueda se aplica 250 ms después de la última tecla.
  useEffect(() => {
    if (texto === q) return;
    const t = setTimeout(() => cambiar({ q: texto.trim() || null }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const consulta = useQuery({
    queryKey: ["plataforma", "cuentas", { q, filtro, orden, dir, pagina }],
    queryFn: () => plataformaService.cuentas({ q, filtro, orden, dir, pagina }),
    placeholderData: keepPreviousData,
  });

  const ordenarPor = (o: OrdenCuentas) =>
    cambiar(
      o === orden
        ? { orden: o, dir: dir === "asc" ? "desc" : "asc" }
        : { orden: o, dir: o === "nombre" || o === "plan" ? "asc" : "desc" },
    );

  const exportar = async () => {
    setExportando(true);
    try {
      await plataformaService.exportarCuentas({ q, filtro, orden, dir });
    } catch (e) {
      aviso.falla(e, "cargar");
    } finally {
      setExportando(false);
    }
  };

  const d = consulta.data;
  const conteos = d?.conteos;

  return (
    <>
      <Encabezado
        titulo="Cuentas"
        subtitulo={
          conteos
            ? `${plural(conteos.TODAS, "cuenta")}, ${plural(conteos.ACTIVAS, "activa")}`
            : " "
        }
        acciones={
          <>
            <BotonBuscar />
            <Link href="/plataforma/cuentas/nueva" className={buttonVariants()}>
              <Plus /> Nueva cuenta
            </Link>
          </>
        }
      />

      <Pastillas
        etiqueta="Filtro de cuentas"
        valor={filtro}
        alCambiar={(v) => cambiar({ filtro: v === "TODAS" ? null : v })}
        opciones={FILTROS.map((f) => ({ ...f, cuenta: conteos?.[f.valor] }))}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nombre de la cuenta"
            className="pl-9"
            aria-label="Buscar cuenta por nombre"
          />
        </div>
        <Button variant="outline" className="ml-auto" onClick={exportar} disabled={exportando}>
          {exportando ? <Loader2 className="animate-spin" /> : <Download />}
          Exportar a Excel
        </Button>
      </div>

      {consulta.isError ? (
        <ErrorCarga que="las cuentas" alReintentar={() => void consulta.refetch()} />
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-border bg-card transition-opacity",
            consulta.isFetching && d && "opacity-70",
          )}
        >
          {!d ? (
            <div className="flex justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : d.filas.length === 0 ? (
            conteos?.TODAS === 0 && !q ? (
              <Vacio
                titulo="Todavía no hay cuentas."
                texto="Cada cliente que paga es una cuenta. Al crearla se genera la contraseña de su administrador."
                accion={
                  <Link href="/plataforma/cuentas/nueva" className={buttonVariants()}>
                    Crear la primera cuenta
                  </Link>
                }
              />
            ) : (
              <Vacio titulo={q ? `Ninguna cuenta coincide con «${q}».` : "Ninguna cuenta en este filtro."} />
            )
          ) : (
            <>
              {/* Escritorio: la tabla. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      {COLUMNAS.map((c) => (
                        <Th key={c.orden} derecha={c.derecha} className="first:pl-5">
                          <button
                            type="button"
                            onClick={() => ordenarPor(c.orden)}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            aria-label={`Ordenar por ${c.texto.toLowerCase()}`}
                          >
                            {c.texto}
                            {orden === c.orden &&
                              (dir === "asc" ? (
                                <ArrowUp className="size-3" />
                              ) : (
                                <ArrowDown className="size-3" />
                              ))}
                          </button>
                        </Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.filas.map((c) => {
                      const dias = sinEntrarHace(c);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => router.push(`/plataforma/cuentas/${c.id}`)}
                          className="group/fila cursor-pointer hover:bg-muted/60"
                        >
                          <td className="border-b border-border py-2.5 pl-5 pr-3 text-[13px] group-last/fila:border-b-0">
                            <Link
                              href={`/plataforma/cuentas/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium hover:underline"
                            >
                              {c.nombre}
                            </Link>
                          </td>
                          <Celda>{NOMBRE_PLAN[c.plan]}</Celda>
                          <Celda>
                            <EstadoCuentaBadge estado={c.estado} />
                          </Celda>
                          <Celda derecha>
                            <Mono>
                              {c.empresas} / {c.maxEmpresas}
                            </Mono>
                          </Celda>
                          <Celda derecha>
                            <Mono>
                              {c.usuarios} / {c.maxUsuarios}
                            </Mono>
                          </Celda>
                          <Celda derecha>
                            <Mono title={dolares(c.iaMesUsd)}>{pesos(c.iaMesUsd * tasa)}</Mono>
                          </Celda>
                          <Celda>
                            <span className="block">{cuando(c.ultimoAcceso)}</span>
                            {dias !== null && (
                              <span className="block text-xs text-warning">
                                {dias} días sin entrar
                              </span>
                            )}
                          </Celda>
                          <Celda>
                            <Mono>{fecha(c.creadoEn)}</Mono>
                          </Celda>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Celular: una tarjeta por cuenta. */}
              <ul className="m-0 list-none divide-y divide-border p-0 md:hidden">
                {d.filas.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/plataforma/cuentas/${c.id}`}
                      className="flex flex-col gap-2.5 px-4 py-3.5 hover:bg-muted/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{c.nombre}</span>
                        <EstadoCuentaBadge estado={c.estado} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <BarraCupo usados={c.empresas} max={c.maxEmpresas} etiqueta="Empresas" />
                        <BarraCupo usados={c.usuarios} max={c.maxUsuarios} etiqueta="Usuarios" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {NOMBRE_PLAN[c.plan]} · {cuando(c.ultimoAcceso)}
                        </span>
                        <Mono>IA {pesos(c.iaMesUsd * tasa)}</Mono>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
                <span>
                  Mostrando {(d.pagina - 1) * d.porPagina + 1} a{" "}
                  {Math.min(d.pagina * d.porPagina, d.total)} de {d.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={d.pagina <= 1}
                    onClick={() => cambiar({ pagina: String(d.pagina - 1) })}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={d.pagina * d.porPagina >= d.total}
                    onClick={() => cambiar({ pagina: String(d.pagina + 1) })}
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

function Celda({ children, derecha }: { children: React.ReactNode; derecha?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-border px-3 py-2.5 align-middle text-[13px] group-last/fila:border-b-0",
        derecha && "text-right",
      )}
    >
      {children}
    </td>
  );
}
