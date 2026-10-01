"use client";

import { useState } from "react";
import { ArrowRight, ChartColumn, MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAtajos } from "../hooks/useReportes";
import {
  deIsoATexto,
  deTextoAIso,
  fechaCorta,
  fechaLarga,
  nombreMes,
  rangoCorto,
  rangoLargo,
} from "../lib/fechas";
import { queMuestra } from "../lib/eleccion";
import type {
  Atajos,
  AtajoCorte,
  AtajoRango,
  Eleccion,
  Reporte,
} from "../types/reportes.types";
import styles from "../reportes.module.css";
import { CalendarioMes } from "./CalendarioMes";

const NOMBRE_RANGO: Record<AtajoRango, string> = {
  ESTE_MES: "Este mes",
  MES_PASADO: "El mes pasado",
  PERIODO: "Período contable en curso",
  ESTE_ANIO: "Este año",
};
const ORDEN_RANGO: AtajoRango[] = ["ESTE_MES", "MES_PASADO", "PERIODO", "ESTE_ANIO"];

const NOMBRE_CORTE: Record<AtajoCorte, string> = {
  HOY: "Hoy",
  CIERRE_MES_PASADO: "Cierre del mes pasado",
  CIERRE_PERIODO_ANTERIOR: "Cierre del período anterior",
};
const ORDEN_CORTE: AtajoCorte[] = ["HOY", "CIERRE_MES_PASADO", "CIERRE_PERIODO_ANTERIOR"];

/** Lo que está marcado: un atajo, o «a mano». */
type Marca = AtajoRango | AtajoCorte | "A_MANO";

/**
 * «¿De qué fechas?» o «¿A qué fecha de corte?», según lo que pida el reporte.
 *
 * **Cada opción muestra las fechas reales que va a usar**, resueltas por el
 * servidor, y si se actualiza sola o queda fija. Es la diferencia que decide
 * si el reporte sirve dentro de seis meses, y se dice antes de correrlo, no
 * después.
 */
export function ModalPeriodo({
  reporte,
  inicial,
  abierto,
  onCerrar,
  onVer,
}: {
  reporte: Pick<Reporte, "clave" | "etiqueta" | "parametro">;
  inicial?: Eleccion;
  abierto: boolean;
  onCerrar: () => void;
  onVer: (eleccion: Eleccion) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="sm:max-w-[580px]">
        {abierto && (
          <Contenido reporte={reporte} inicial={inicial} onCerrar={onCerrar} onVer={onVer} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  reporte,
  inicial,
  onCerrar,
  onVer,
}: {
  reporte: Pick<Reporte, "clave" | "etiqueta" | "parametro">;
  inicial?: Eleccion;
  onCerrar: () => void;
  onVer: (eleccion: Eleccion) => void;
}) {
  const esRango = reporte.parametro === "RANGO";
  const { data: atajos, isError, refetch } = useAtajos();

  const [marca, setMarca] = useState<Marca>(() => {
    if (!inicial) return esRango ? "ESTE_MES" : "HOY";
    if (inicial.tipo === "ATAJO_RANGO" || inicial.tipo === "ATAJO_CORTE") return inicial.atajo;
    return "A_MANO";
  });
  const [desdeTxt, setDesdeTxt] = useState(
    inicial?.tipo === "RANGO" ? deIsoATexto(inicial.desde) : "",
  );
  const [hastaTxt, setHastaTxt] = useState(
    inicial?.tipo === "RANGO" ? deIsoATexto(inicial.hasta) : "",
  );
  const [corteTxt, setCorteTxt] = useState(
    inicial?.tipo === "CORTE" ? deIsoATexto(inicial.corte) : "",
  );

  const desde = deTextoAIso(desdeTxt);
  const hasta = deTextoAIso(hastaTxt);
  const corte = deTextoAIso(corteTxt);

  // Qué se va a correr, o por qué todavía no.
  let eleccion: Eleccion | null = null;
  let problema: string | null = null;
  if (marca !== "A_MANO") {
    eleccion = esRango
      ? { tipo: "ATAJO_RANGO", atajo: marca as AtajoRango }
      : { tipo: "ATAJO_CORTE", atajo: marca as AtajoCorte };
  } else if (esRango) {
    if (desdeTxt && !desde) problema = "La fecha «desde» no existe. Escríbala como dd/mm/aaaa.";
    else if (hastaTxt && !hasta) problema = "La fecha «hasta» no existe. Escríbala como dd/mm/aaaa.";
    else if (desde && hasta && desde > hasta) problema = "«Desde» tiene que ser antes que «hasta».";
    else if (desde && hasta) eleccion = { tipo: "RANGO", desde, hasta };
  } else if (corteTxt && !corte) {
    problema = "Esa fecha no existe. Escríbala como dd/mm/aaaa.";
  } else if (corte && atajos && corte > atajos.hoy) {
    problema = "El corte no puede ser una fecha que todavía no llega.";
  } else if (corte) {
    eleccion = { tipo: "CORTE", corte };
  }

  return (
    <>
      <DialogHeader>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-[19px]">
            {esRango ? "¿De qué fechas?" : "¿A qué fecha de corte?"}
          </DialogTitle>
          <DialogDescription className="mt-0 text-[13px]">
            {reporte.etiqueta} · {esRango ? "pide un rango" : "una foto a una fecha"}
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5 px-7 py-[22px] sm:px-7">
        {isError ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-border p-4 text-sm">
            <span>No se pudieron traer las fechas de los atajos.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : !atajos ? (
          <div className="flex flex-col gap-2" aria-busy>
            {Array.from({ length: esRango ? 5 : 4 }, (_, i) => (
              <span key={i} className={`${styles.sk} h-[62px] rounded-xl`} />
            ))}
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label={esRango ? "Período" : "Fecha de corte"}
            className="flex flex-col gap-2"
          >
            {esRango
              ? ORDEN_RANGO.map((a) => {
                  const o = atajos.rango.find((r) => r.atajo === a);
                  if (!o) return null;
                  const estado =
                    a !== "PERIODO"
                      ? ""
                      : o.estado === "ABIERTO"
                        ? " · abierto"
                        : o.estado === "CERRADO"
                          ? " · cerrado"
                          : " · sin período creado";
                  return (
                    <Opcion
                      key={a}
                      nombre={NOMBRE_RANGO[a]}
                      detalle={`${rangoCorto(o.desde, o.hasta)}${estado}`}
                      marcada={marca === a}
                      onMarcar={() => setMarca(a)}
                      relativa
                    />
                  );
                })
              : ORDEN_CORTE.map((a) => {
                  const o = atajos.corte.find((c) => c.atajo === a);
                  if (!o) return null;
                  // Sin ningún período cerrado, el servidor cae al cierre del
                  // mes pasado y lo dice en la etiqueta. Se muestra, no se
                  // disimula.
                  const detalle =
                    a !== "CIERRE_PERIODO_ANTERIOR"
                      ? fechaCorta(o.corte)
                      : o.etiqueta === "el cierre del período anterior"
                        ? `${fechaCorta(o.corte)} · cerrado`
                        : `${fechaCorta(o.corte)} · todavía no se cierra ningún período`;
                  return (
                    <Opcion
                      key={a}
                      nombre={NOMBRE_CORTE[a]}
                      detalle={detalle}
                      marcada={marca === a}
                      onMarcar={() => setMarca(a)}
                      relativa
                    />
                  );
                })}

            <Opcion
              nombre={esRango ? "Otras fechas" : "Otra fecha"}
              detalle={
                esRango
                  ? desde && hasta && desde <= hasta
                    ? rangoCorto(desde, hasta)
                    : "Las elige usted"
                  : corte
                    ? fechaCorta(corte)
                    : "La elige usted"
              }
              marcada={marca === "A_MANO"}
              onMarcar={() => setMarca("A_MANO")}
            >
              {marca === "A_MANO" &&
                (esRango ? (
                  <div className="flex gap-2.5 pl-[30px]">
                    <CampoFecha etiqueta="Desde" valor={desdeTxt} onCambiar={setDesdeTxt} autoFocus />
                    <CampoFecha etiqueta="Hasta" valor={hastaTxt} onCambiar={setHastaTxt} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pt-3 pl-[30px] sm:grid-cols-[1fr_220px]">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="fecha-corte" className="text-xs font-medium">
                        Fecha de corte
                      </label>
                      <input
                        id="fecha-corte"
                        autoFocus
                        inputMode="numeric"
                        placeholder="dd/mm/aaaa"
                        value={corteTxt}
                        onChange={(e) => setCorteTxt(e.target.value)}
                        className={CLASE_CAMPO + " h-11 text-sm"}
                      />
                      <span className="text-xs leading-normal text-[#4d4d4d] dark:text-[#b8b8b8]">
                        Escrita a mano: el reporte siempre mostrará la cartera a esta fecha,
                        aunque lo abra dentro de un año.
                      </span>
                    </div>
                    <CalendarioMes
                      key={corte?.slice(0, 7) ?? "hoy"}
                      valor={corte}
                      maximo={atajos.hoy}
                      onElegir={(iso) => setCorteTxt(deIsoATexto(iso))}
                    />
                  </div>
                ))}
            </Opcion>
          </div>
        )}

        {problema && (
          <p role="alert" className="m-0 text-[13px] text-[#c0421a] dark:text-[#f25623]">
            {problema}
          </p>
        )}

        {atajos && eleccion && <VasAVer eleccion={eleccion} atajos={atajos} sujeto={queMuestra(reporte.clave).titulo} />}
      </DialogBody>

      <DialogFooter className="gap-2 bg-transparent px-7 py-4 sm:px-7">
        <Button variant="ghost" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button disabled={!eleccion} onClick={() => eleccion && onVer(eleccion)}>
          <ArrowRight aria-hidden />
          Ver el reporte
        </Button>
      </DialogFooter>
    </>
  );
}

const CLASE_CAMPO =
  "rounded-[0.6rem] border border-border bg-background px-3 font-mono outline-none focus:border-[#f25623] focus:shadow-[0_0_0_3px_rgba(242,86,35,0.2)]";

function Opcion({
  nombre,
  detalle,
  marcada,
  onMarcar,
  relativa,
  children,
}: {
  nombre: string;
  detalle: string;
  marcada: boolean;
  onMarcar: () => void;
  relativa?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl bg-card transition-colors hover:bg-muted/60 ${
        marcada
          ? "border-[1.5px] border-foreground px-[15px] py-[13px]"
          : "border border-border px-4 py-3.5"
      }`}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="radio"
          name="periodo"
          checked={marcada}
          onChange={onMarcar}
          className="m-0 size-[18px] shrink-0 accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f25623]"
        />
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className={`text-sm ${marcada ? "font-semibold" : "font-medium"}`}>{nombre}</span>
          <span className="font-mono text-xs text-[#4d4d4d] dark:text-[#b8b8b8]">{detalle}</span>
        </span>
        {relativa ? (
          <span className="inline-flex h-6 items-center gap-[5px] rounded-full bg-muted px-[9px] text-[11px] font-medium whitespace-nowrap text-[#4d4d4d] dark:text-[#b8b8b8]">
            <RefreshCw className="size-3" strokeWidth={2.2} aria-hidden />
            Se actualiza sola
          </span>
        ) : (
          <span className="inline-flex h-6 items-center gap-[5px] rounded-full border border-[#b8b8b8] px-[9px] text-[11px] font-medium whitespace-nowrap dark:border-[#4d4d4d]">
            <MapPin className="size-3" strokeWidth={2.2} aria-hidden />
            Fija
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function CampoFecha({
  etiqueta,
  valor,
  onCambiar,
  autoFocus,
}: {
  etiqueta: string;
  valor: string;
  onCambiar: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs font-medium">{etiqueta}</span>
      <input
        autoFocus={autoFocus}
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className={CLASE_CAMPO + " h-[38px] text-xs"}
      />
    </label>
  );
}

const mesSiguiente = (hoy: string) => {
  const mes = Number(hoy.slice(5, 7));
  return nombreMes(mes === 12 ? 1 : mes + 1);
};
const mesDeHoy = (hoy: string) => nombreMes(Number(hoy.slice(5, 7)));

/** «Vas a ver…»: la elección en una frase, y qué pasa si se vuelve a abrir otro día. */
function VasAVer({
  eleccion,
  atajos,
  sujeto,
}: {
  eleccion: Eleccion;
  atajos: Atajos;
  /** De qué habla el reporte: «Ventas», «Retenciones»… */
  sujeto: string;
}) {
  let titulo = "";
  let despues = "";
  const siguiente = mesSiguiente(atajos.hoy);
  const actual = mesDeHoy(atajos.hoy);

  switch (eleccion.tipo) {
    case "ATAJO_RANGO": {
      const o = atajos.rango.find((r) => r.atajo === eleccion.atajo);
      titulo = o ? `${sujeto} ${rangoLargo(o.desde, o.hasta)}` : "";
      despues = {
        ESTE_MES: `Si lo vuelve a abrir en ${siguiente}, mostrará ${siguiente}.`,
        MES_PASADO: `Si lo vuelve a abrir en ${siguiente}, mostrará ${actual}.`,
        ESTE_ANIO: "Siempre va del 1 de enero al día en que lo abra.",
        PERIODO: "Siempre muestra el período contable que esté en curso.",
      }[eleccion.atajo];
      break;
    }
    case "RANGO":
      titulo = `${sujeto} ${rangoLargo(eleccion.desde, eleccion.hasta)}`;
      despues = "Fechas fijas: siempre mostrará este mismo rango.";
      break;
    case "ATAJO_CORTE": {
      const o = atajos.corte.find((c) => c.atajo === eleccion.atajo);
      titulo = o ? `Cartera al ${fechaLarga(o.corte)}` : "";
      despues = {
        HOY: "Si lo vuelve a abrir otro día, mostrará la cartera de ese día.",
        CIERRE_MES_PASADO: `Si lo vuelve a abrir en ${siguiente}, mostrará el cierre de ${actual}.`,
        CIERRE_PERIODO_ANTERIOR: "Sigue al último período que se cierre.",
      }[eleccion.atajo];
      break;
    }
    case "CORTE":
      titulo = `Cartera al ${fechaLarga(eleccion.corte)}`;
      despues = "Fecha fija: siempre mostrará este mismo corte.";
      break;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3.5" aria-live="polite">
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-border bg-card">
        <ChartColumn className="size-4" aria-hidden />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Verá</span>
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="text-xs text-[#4d4d4d] dark:text-[#b8b8b8]">{despues}</span>
      </span>
    </div>
  );
}
