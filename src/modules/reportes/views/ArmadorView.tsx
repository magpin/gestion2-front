"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AxiosError } from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
  Lock,
  Play,
  Save,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { mensajeDelServidor } from "@/lib/errores";

import {
  PanelAgrupar,
  PanelColumnas,
  PanelFechas,
  PanelFiltros,
  PanelOrden,
  Seccion,
} from "../components/armador/Paneles";
import { DialogoGuardar } from "../components/armador/DialogoGuardar";
import { TablaResultado } from "../components/armador/TablaResultado";
import { useCambiosGuardados, useGuardado, useMuestra, useOrigenes } from "../hooks/useArmador";
import { ICONO_AREA } from "../lib/areas";
import { definicionInicial, limpia, resumenEnPalabras } from "../lib/definicion";
import { rangoLargo } from "../lib/fechas";
import styles from "../reportes.module.css";
import { armadorService } from "../services/armador.service";
import type {
  ClaveOrigen,
  Definicion,
  Guardado,
  OrigenArmador,
  Resultado,
} from "../types/armador.types";

/**
 * El armador: se parte de un origen o de un reporte guardado, se ajusta, se
 * corre y se guarda.
 *
 * La dirección dice de qué se parte —`?origen=VENTAS` o `?guardado=…`—, y
 * `&correr=1` abre directo el resultado, que es lo que quiere quien aprieta
 * «Correr» en la lista.
 */
export function ArmadorView() {
  const q = useSearchParams();
  const idGuardado = q.get("guardado");
  const claveOrigen = q.get("origen") as ClaveOrigen | null;
  const correrYa = q.get("correr") === "1";

  const origenes = useOrigenes();
  const guardado = useGuardado(idGuardado);

  if (origenes.isPending || (idGuardado && guardado.isPending)) {
    return (
      <Marco>
        <div className="m-auto flex items-center gap-3 text-sm text-muted-foreground">
          <Anillo /> Preparando el armador…
        </div>
      </Marco>
    );
  }
  if (origenes.isError || (idGuardado && guardado.isError)) {
    return (
      <Marco>
        <Aviso
          icono={<AlertTriangle className="size-5" aria-hidden />}
          titulo={idGuardado ? "Ese reporte guardado no existe o ya se borró" : "No se pudo abrir el armador"}
          texto={
            mensajeDelServidor(guardado.error ?? origenes.error) ??
            "Revisa la conexión y vuelve a intentar."
          }
          acciones={<VolverAReportes />}
        />
      </Marco>
    );
  }

  const clave = guardado.data?.origen ?? claveOrigen;
  const origen = origenes.data?.find((o) => o.clave === clave);
  if (!origen) {
    // El origen existe pero no está en la lista del rol: no lo puede correr.
    return (
      <Marco>
        <SinPermiso origen={clave} />
      </Marco>
    );
  }

  return (
    <Armador
      key={idGuardado ?? origen.clave}
      origen={origen}
      guardado={guardado.data ?? null}
      correrYa={correrYa}
    />
  );
}

type Corrida =
  | { tipo: "nada" }
  | { tipo: "corriendo" }
  | { tipo: "lista"; resultado: Resultado }
  | { tipo: "error"; status: number | undefined; mensaje: string };

function Armador({
  origen,
  guardado,
  correrYa,
}: {
  origen: OrigenArmador;
  guardado: Guardado | null;
  correrYa: boolean;
}) {
  const router = useRouter();
  const [def, setDef] = useState<Definicion>(() => guardado?.definicion ?? definicionInicial(origen));
  const [modo, setModo] = useState<"ARMAR" | "RESULTADO">(correrYa ? "RESULTADO" : "ARMAR");
  const [corrida, setCorrida] = useState<Corrida>(
    correrYa ? { tipo: "corriendo" } : { tipo: "nada" },
  );
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState(false);
  const [bajando, setBajando] = useState(false);
  const cancelador = useRef<AbortController | null>(null);
  const { guardar, actualizar } = useCambiosGuardados();

  const cambiar = (cambio: (d: Definicion) => Definicion) => setDef((d) => cambio(d));
  const enviable = limpia(def);
  const muestra = useMuestra(modo === "ARMAR" ? enviable : null);

  /** La parte que espera: solo toca el estado cuando llega la respuesta. */
  const lanzar = async (d: Definicion, control: AbortController) => {
    try {
      const resultado = await armadorService.correr(d, guardado?.id, control.signal);
      setCorrida({ tipo: "lista", resultado });
    } catch (e) {
      if (control.signal.aborted) return;
      const status = (e as AxiosError).response?.status;
      setCorrida({
        tipo: "error",
        status,
        mensaje: mensajeDelServidor(e) ?? "No se pudo correr el reporte. Vuelve a intentar.",
      });
    }
  };

  const correr = (d: Definicion = enviable) => {
    cancelador.current?.abort();
    const control = new AbortController();
    cancelador.current = control;
    setModo("RESULTADO");
    setCorrida({ tipo: "corriendo" });
    void lanzar(d, control);
  };

  // «Correr» desde la lista abre directo el resultado: el estado ya arrancó en
  // «corriendo», acá solo se hace el pedido. Una vez, al montar.
  useEffect(() => {
    if (!correrYa) return;
    const control = new AbortController();
    cancelador.current = control;
    // Encadenado y no con `lanzar`: el estado se toca solo en los callbacks,
    // cuando llega la respuesta, nunca durante el efecto.
    armadorService
      .correr(limpia(def), guardado?.id, control.signal)
      .then((resultado) => setCorrida({ tipo: "lista", resultado }))
      .catch((e: unknown) => {
        if (control.signal.aborted) return;
        setCorrida({
          tipo: "error",
          status: (e as AxiosError).response?.status,
          mensaje: mensajeDelServidor(e) ?? "No se pudo correr el reporte. Vuelve a intentar.",
        });
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelar = () => {
    cancelador.current?.abort();
    setCorrida({ tipo: "nada" });
    setModo("ARMAR");
  };

  const excel = async () => {
    setBajando(true);
    try {
      await armadorService.excel(enviable, guardado?.nombre, guardado?.id);
    } finally {
      setBajando(false);
    }
  };

  const alGuardar = async (nombre: string, d: Definicion, comoNuevo: boolean) => {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      if (guardado && !comoNuevo) {
        await actualizar.mutateAsync({ id: guardado.id, nombre, definicion: limpia(d) });
        setDef(d);
        setDialogo(false);
      } else {
        const { id } = await guardar.mutateAsync({ nombre, definicion: limpia(d) });
        setDialogo(false);
        router.replace(`/dashboard/reportes/armar?guardado=${id}`);
      }
    } catch (e) {
      setErrorGuardar(mensajeDelServidor(e) ?? "No se pudo guardar. Vuelve a intentar.");
    } finally {
      setGuardando(false);
    }
  };

  const Icono = ICONO_AREA[origen.clave];
  const rangoConocido =
    corrida.tipo === "lista" ? corrida.resultado.rango : (muestra.data?.rango ?? null);

  return (
    <Marco>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-border bg-card px-4 py-4 md:px-7">
        <div className="flex min-w-0 items-center gap-3.5">
          <VolverAReportes icono />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-base font-semibold">
              {guardado?.nombre ?? `Reporte de ${origen.etiqueta.toLowerCase()}`}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-[#4d4d4d] dark:text-[#b8b8b8]">
              <Icono className="size-[13px] shrink-0" aria-hidden />
              <span className="truncate">
                {origen.etiqueta} · «{origen.pregunta}»
                {guardado ? ` · guardado por ${guardado.creadoPor}` : ""}
              </span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {modo === "RESULTADO" ? (
            <Button variant="outline" onClick={() => setModo("ARMAR")} disabled={corrida.tipo === "corriendo"}>
              <SlidersHorizontal aria-hidden /> Volver a ajustar
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={excel}
            disabled={bajando || corrida.tipo === "corriendo"}
          >
            <FileSpreadsheet aria-hidden /> {bajando ? "Armando…" : "Excel"}
          </Button>
          <Button
            variant={modo === "ARMAR" ? "outline" : "default"}
            onClick={() => setDialogo(true)}
            disabled={corrida.tipo === "corriendo"}
          >
            <Save aria-hidden /> Guardar
          </Button>
          {modo === "ARMAR" && (
            <Button onClick={() => correr()}>
              <Play aria-hidden /> Correr el reporte
            </Button>
          )}
        </div>
      </header>

      {modo === "ARMAR" ? (
        <div className="flex min-h-0 grow flex-col lg:flex-row">
          <aside className="shrink-0 overflow-auto border-b border-border bg-card lg:w-[360px] lg:border-r lg:border-b-0">
            <Seccion numero={1} titulo="Fechas" ayuda="Todo reporte tiene su rango.">
              <PanelFechas def={def} cambiar={cambiar} />
            </Seccion>
            <Seccion numero={2} titulo="Columnas" ayuda="En el orden en que van a salir. Las de plata son las únicas que suman.">
              <PanelColumnas def={def} origen={origen} cambiar={cambiar} />
            </Seccion>
            <Seccion numero={3} titulo="Filtros" ayuda="Se muestran las filas que cumplen todos los filtros a la vez.">
              <PanelFiltros def={def} origen={origen} cambiar={cambiar} />
            </Seccion>
            <Seccion numero={4} titulo="Agrupar" ayuda="Hasta dos niveles. Cada grupo lleva su subtotal.">
              <PanelAgrupar def={def} origen={origen} cambiar={cambiar} />
            </Seccion>
            <Seccion numero={5} titulo="Orden">
              <PanelOrden def={def} origen={origen} cambiar={cambiar} />
            </Seccion>
          </aside>

          <section className="flex min-h-[320px] min-w-0 grow flex-col" aria-label="Vista previa">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
              <span className="text-[13px] font-medium">
                Vista previa
                <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                  {muestra.data
                    ? `muestra: ${Math.min(muestra.data.filas.length, muestra.data.limite)} de ${muestra.data.totalFilas.toLocaleString("es-CO")} filas`
                    : ""}
                </span>
              </span>
              {muestra.isFetching && (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Anillo chico /> Actualizando
                </span>
              )}
            </div>
            {muestra.isError ? (
              <div className="m-auto max-w-sm p-6 text-center text-sm text-muted-foreground">
                {mensajeDelServidor(muestra.error) ?? "No se pudo traer la muestra."}
              </div>
            ) : muestra.data && muestra.data.filas.length === 0 ? (
              <div className="m-auto max-w-sm p-6 text-center text-sm text-muted-foreground">
                Con estos filtros no hay filas {rangoConocido ? resumenFechas(rangoConocido) : ""}.
                Afloja un filtro o amplía las fechas.
              </div>
            ) : muestra.data ? (
              <div className={`flex min-h-0 grow flex-col ${muestra.isFetching ? "opacity-60" : ""}`}>
                <TablaResultado resultado={muestra.data} agrupar={enviable.agrupar} />
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-5" aria-busy>
                {[90, 80, 95, 70, 88].map((w) => (
                  <span key={w} className={`${styles.sk} h-4 rounded`} style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <ResultadoCompleto
          corrida={corrida}
          def={enviable}
          origen={origen}
          onCancelar={cancelar}
          onReintentar={() => correr()}
          onAjustar={() => setModo("ARMAR")}
          onCambiar={(d) => {
            setDef(d);
            correr(limpia(d));
          }}
        />
      )}

      {dialogo && (
        <DialogoGuardar
          def={enviable}
          rango={rangoConocido}
          nombreInicial={guardado?.nombre ?? ""}
          existente={guardado !== null}
          guardando={guardando}
          error={errorGuardar}
          onGuardar={alGuardar}
          onCerrar={() => {
            setDialogo(false);
            setErrorGuardar(null);
          }}
        />
      )}
    </Marco>
  );
}

const resumenFechas = (r: { desde: string; hasta: string }) => rangoLargo(r.desde, r.hasta);

/* ── El resultado ────────────────────────────────────────────────────────── */

function ResultadoCompleto({
  corrida,
  def,
  origen,
  onCancelar,
  onReintentar,
  onAjustar,
  onCambiar,
}: {
  corrida: Corrida;
  def: Definicion;
  origen: OrigenArmador;
  onCancelar: () => void;
  onReintentar: () => void;
  onAjustar: () => void;
  onCambiar: (d: Definicion) => void;
}) {
  if (corrida.tipo === "corriendo" || corrida.tipo === "nada") {
    return (
      <div className="flex grow items-start justify-center bg-muted/40 pt-10">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3.5 rounded-full border border-border bg-card py-3 pr-2 pl-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <Anillo />
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-medium">Corriendo el reporte sobre los datos de este momento</span>
            <span className="relative block h-[3px] w-[260px] max-w-full overflow-hidden rounded-full bg-muted">
              <span className={styles.indeterminada} />
            </span>
          </span>
          <Button variant="ghost" size="sm" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (corrida.tipo === "error") {
    if (corrida.status === 403) return <SinPermiso origen={origen.clave} mensaje={corrida.mensaje} />;
    return (
      <Aviso
        icono={<AlertTriangle className="size-5" aria-hidden />}
        titulo="No se pudo correr el reporte"
        texto={corrida.mensaje}
        acciones={
          <>
            <Button variant="outline" onClick={onAjustar}>
              <SlidersHorizontal aria-hidden /> Volver a ajustar
            </Button>
            <Button onClick={onReintentar}>Reintentar</Button>
          </>
        }
      />
    );
  }

  const r = corrida.resultado;
  const resumen = resumenEnPalabras(def, origen, r.rango);

  if (r.filas.length === 0) {
    // Corrió bien y no hay filas: no es un error, y se dice qué aflojar.
    return (
      <Aviso
        icono={<SlidersHorizontal className="size-5" aria-hidden />}
        titulo="Corrió bien, y no hay filas"
        texto={`${resumen}. Afloja un filtro o amplía las fechas.`}
        acciones={
          <div className="flex flex-col items-center gap-3">
            {def.filtros.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {def.filtros.map((f, i) => {
                  const c = origen.columnas.find((x) => x.clave === f.columna);
                  return (
                    <Button
                      key={f.columna}
                      variant="outline"
                      size="sm"
                      onClick={() => onCambiar({ ...def, filtros: def.filtros.filter((_, j) => j !== i) })}
                    >
                      <X aria-hidden /> Quitar «{c?.etiqueta ?? f.columna}»
                    </Button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {!("atajo" in def.fechas && def.fechas.atajo === "ESTE_ANIO") && (
                <Button variant="outline" onClick={() => onCambiar({ ...def, fechas: { atajo: "ESTE_ANIO" } })}>
                  Ver todo este año
                </Button>
              )}
              <Button onClick={onAjustar}>
                <SlidersHorizontal aria-hidden /> Volver a ajustar
              </Button>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="flex shrink-0 flex-col gap-1 border-b border-border px-5 py-3 md:px-7">
        <p className="m-0 text-sm font-medium">{resumen}</p>
        <p className="m-0 font-mono text-[11px] text-muted-foreground">
          {r.totalFilas.toLocaleString("es-CO")} {r.totalFilas === 1 ? "fila" : "filas"} · fechas: {r.rango.etiqueta}
        </p>
      </div>
      {r.truncado && (
        <div
          role="status"
          className="flex shrink-0 items-start gap-3 border-b border-[rgba(178,106,0,0.4)] bg-[#f7ecdc] px-5 py-2.5 text-[13px] text-[#171717] md:px-7 dark:bg-[#2d2415] dark:text-[#ededed]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#b26a00]" aria-hidden />
          <span>
            Son <strong className="font-mono">{r.totalFilas.toLocaleString("es-CO")}</strong> filas y aquí se ven las
            primeras {r.limite.toLocaleString("es-CO")}. Los subtotales y el total sí cuentan todas. Para verlas
            todas, baja el Excel o acota las fechas.
          </span>
        </div>
      )}
      <TablaResultado resultado={r} agrupar={def.agrupar} />
    </div>
  );
}

/* ── Piezas ──────────────────────────────────────────────────────────────── */

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -my-7 flex h-[calc(100dvh-3.5rem)] min-h-[520px] flex-col bg-background md:-mx-10 lg:-mx-14">
      {children}
    </div>
  );
}

function Anillo({ chico }: { chico?: boolean }) {
  return (
    <span className={`relative block ${chico ? "size-3.5" : "size-[22px]"}`} aria-hidden>
      <span className={styles.anillo} />
      <span className="absolute inset-0 rounded-full bg-card" />
    </span>
  );
}

function VolverAReportes({ icono }: { icono?: boolean }) {
  return icono ? (
    <Link
      href="/dashboard/reportes"
      aria-label="Volver a reportes"
      className={buttonVariants({ variant: "ghost", size: "icon" })}
    >
      <ArrowLeft className="size-[17px]" aria-hidden />
    </Link>
  ) : (
    <Link href="/dashboard/reportes" className={buttonVariants({ variant: "outline" })}>
      <ArrowLeft aria-hidden /> Volver a reportes
    </Link>
  );
}

const NOMBRE_ORIGEN: Record<ClaveOrigen, string> = {
  VENTAS: "ventas",
  COMPRAS: "compras",
  CARTERA: "cartera",
  INVENTARIO: "inventario",
  TESORERIA: "tesorería",
  CONTABILIDAD: "contabilidad",
};

/** No es un error del reporte: es de un área que el rol no ve. */
function SinPermiso({ origen, mensaje }: { origen: ClaveOrigen | null; mensaje?: string }) {
  return (
    <Aviso
      icono={<Lock className="size-5" aria-hidden />}
      titulo={
        origen ? `Este reporte es de ${NOMBRE_ORIGEN[origen]} y tu rol no la incluye` : "Ese reporte no existe"
      }
      texto={
        mensaje ??
        "El reporte está bien; lo que falta es el permiso. Si necesitas verlo, pídele acceso a quien administra la empresa."
      }
      acciones={<VolverAReportes />}
    />
  );
}

function Aviso({
  icono,
  titulo,
  texto,
  acciones,
}: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
  acciones: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 grow bg-muted/40 px-4">
      <div
        role="status"
        className="m-auto flex w-full max-w-[560px] flex-col items-center gap-3.5 rounded-[1.05rem] border border-border bg-card p-9 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">{icono}</span>
        <span className="text-lg font-semibold">{titulo}</span>
        <span className="text-sm leading-[1.55] text-[#4d4d4d] dark:text-[#b8b8b8]">{texto}</span>
        <div className="flex flex-wrap justify-center gap-2 pt-1">{acciones}</div>
      </div>
    </div>
  );
}
