"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsistenteShell } from "../components/AsistenteShell";
import { Bloque } from "../components/Bloque";
import { BloqueResponsabilidades } from "../components/BloqueResponsabilidadesRut";
import { NotaInformativa, Pildora, SegmentadoSiNo } from "../components/Comunes";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useGuardar } from "../hooks/useGuardar";
import { impuestosApi } from "../services/nucleo.service";
import type {
  ClavePreguntaImpuesto,
  EstadoImpuestos,
  MunicipioIca,
} from "../types/configuracion.types";

export const CLAVE_IMPUESTOS = ["empresa-impuestos"];

/** Lo que cambia al contestar: el plan sugerido, la casilla 53 y sus condiciones. */
const INVALIDAR = [
  CLAVE_IMPUESTOS,
  ["plan-cuentas", "sugerencia"],
  ["responsabilidades-empresa"],
  ["regimenes"],
];

const fechaCorta = (f: string) =>
  new Date(`${f.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * El paso «Impuestos»: todo lo tributario, en lenguaje de persona (plan motor
 * de retenciones, Fase 0, §0.7.3).
 *
 * Tres bloques, en este orden: lo que la empresa es ante la DIAN (termina en la
 * casilla 53 del RUT), el ICA de cada municipio donde tiene sede, y lo que todo
 * eso significa —qué va a retener y qué le van a retener—, que se arma solo y
 * se confirma con «Todo correcto».
 */
export function PasoImpuestos() {
  const { data: estado } = useEstadoConfiguracion();
  const paso = estado?.pasos.find((p) => p.clave === "IMPUESTOS");
  const falta = (campo: string) =>
    paso?.faltantes.some((f) => f.campo === campo) ?? false;

  const { data: imp } = useQuery({
    queryKey: CLAVE_IMPUESTOS,
    queryFn: impuestosApi.estado,
  });

  return (
    <AsistenteShell clave="IMPUESTOS" titulo="Impuestos">
      {imp === undefined ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          <NotaInformativa>
            Cada respuesta se guarda al tocarla. Cambiarla después no borra la anterior: abre
            una nueva{" "}
            <span className="font-medium text-foreground">desde ese día</span>.
          </NotaInformativa>

          <BloqueDian imp={imp} pendiente={falta("iva")} />
          <BloqueIca imp={imp} pendiente={falta("ica")} />
          <BloqueResumen imp={imp} pendiente={falta("confirmar")} />
        </div>
      )}
    </AsistenteShell>
  );
}

// ---------------------------------------------------------------------------
// Bloque 1 — Tu empresa ante la DIAN
// ---------------------------------------------------------------------------

function BloqueDian({ imp, pendiente }: { imp: EstadoImpuestos; pendiente: boolean }) {
  const [verCodigos, setVerCodigos] = useState(false);
  const responder = useGuardar<{ clave: ClavePreguntaImpuesto; valor: boolean }>({
    fn: ({ clave, valor }) => impuestosApi.responder(clave, valor),
    exito: "Respuesta guardada",
    invalidar: INVALIDAR,
  });

  return (
    <Bloque
      titulo="Tu empresa ante la DIAN"
      descripcion="Sale de la casilla 53 del RUT. Si María leyó tu RUT, ya está contestado."
      pendiente={pendiente}
    >
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
        {imp.preguntas.map((p) => (
          <li
            key={p.clave}
            className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">{p.pregunta}</span>
              <span className="text-xs text-muted-foreground">{p.ayuda}</span>
              <Origen pregunta={p} />
            </div>
            <SegmentadoSiNo
              etiquetaGrupo={p.pregunta}
              valor={p.respuesta}
              deshabilitado={responder.isPending}
              onCambio={(valor) => responder.mutate({ clave: p.clave, valor })}
            />
          </li>
        ))}
      </ul>

      {/* Lo deducido no se pregunta: se dice, con su porqué. */}
      <p className="m-0 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Agente de retención de IVA: </span>
        {imp.agenteIva.es ? `sí. ${imp.agenteIva.porque ?? ""}` : "no, según lo que contestaste."}
      </p>

      <button
        type="button"
        onClick={() => setVerCodigos((v) => !v)}
        aria-expanded={verCodigos}
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={`size-3.5 transition-transform ${verCodigos ? "" : "-rotate-90"}`}
        />
        Ver los códigos del RUT
      </button>
      {verCodigos && <BloqueResponsabilidades pendiente={false} />}
    </Bloque>
  );
}

/** De dónde salió la respuesta: el RUT, o lo que contestó la persona. */
function Origen({ pregunta }: { pregunta: EstadoImpuestos["preguntas"][number] }) {
  if (pregunta.fuente !== null) {
    return (
      <span className="text-[11px] text-muted-foreground">
        Según tu RUT, casilla 53, código{" "}
        <span className="font-mono">{String(pregunta.fuente.codigo).padStart(2, "0")}</span> ·
        desde el {fechaCorta(pregunta.fuente.desde)}
      </span>
    );
  }
  // Un «No» sin código en el RUT solo llega si la persona lo contestó (o confirmó el paso).
  if (pregunta.respuesta === false) {
    return <span className="text-[11px] text-muted-foreground">Lo contestaste vos.</span>;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Bloque 2 — ICA en tus municipios
// ---------------------------------------------------------------------------

function BloqueIca({ imp, pendiente }: { imp: EstadoImpuestos; pendiente: boolean }) {
  return (
    <Bloque
      titulo="ICA en tus municipios"
      descripcion="Lo decide cada municipio por acuerdo o resolución; no aparece en el RUT. Una fila por municipio donde tenés sede."
      pendiente={pendiente}
    >
      {imp.municipios.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Todavía no hay sedes. El ICA se contesta por cada municipio donde tengas una.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {imp.municipios.map((m) => (
            <FilaMunicipio key={m.codigo} municipio={m} />
          ))}
        </ul>
      )}
    </Bloque>
  );
}

function FilaMunicipio({ municipio: m }: { municipio: MunicipioIca }) {
  const r = m.respuesta;
  const [tarifa, setTarifa] = useState<string | null>(null);

  const guardar = useGuardar<{
    esAgenteRetenedor: boolean;
    esAutorretenedor: boolean;
    tarifaProvisionalPorMil?: number;
  }>({
    fn: (datos) => impuestosApi.responderIca(m.codigo, datos),
    exito: `ICA de ${m.nombre} guardado`,
    invalidar: INVALIDAR,
    alTerminar: () => setTarifa(null),
  });

  const escrita = tarifa ?? (r?.tarifaProvisionalPorMil ?? "").toString();
  const valor = Number(escrita.replace(",", "."));
  // Por mil: ninguna tarifa municipal se acerca a 30. Un 8000 es alguien que
  // escribió «8.000» queriendo decir 8.
  const tarifaValida = escrita.trim() !== "" && Number.isFinite(valor) && valor >= 0 && valor <= 30;
  const tarifaCambio = tarifa !== null && tarifaValida && valor !== r?.tarifaProvisionalPorMil;

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{m.nombre}</span>
        {m.esPrincipal && <Pildora>Sede principal</Pildora>}
        {r === null && <span className="size-1.5 rounded-full bg-warning" />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            ¿Te nombró agente retenedor de ICA?
          </span>
          <SegmentadoSiNo
            etiquetaGrupo={`Agente retenedor de ICA en ${m.nombre}`}
            valor={r?.esAgenteRetenedor ?? null}
            deshabilitado={guardar.isPending}
            onCambio={(v) =>
              guardar.mutate({
                esAgenteRetenedor: v,
                esAutorretenedor: r?.esAutorretenedor ?? false,
              })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">¿Sos autorretenedor de ICA allí?</span>
          <SegmentadoSiNo
            etiquetaGrupo={`Autorretenedor de ICA en ${m.nombre}`}
            valor={r === null ? null : r.esAutorretenedor}
            deshabilitado={guardar.isPending || r === null}
            onCambio={(v) =>
              r !== null &&
              guardar.mutate({ esAgenteRetenedor: r.esAgenteRetenedor, esAutorretenedor: v })
            }
          />
        </div>
      </div>

      {/* La tarifa sale de la ley de ICA del municipio y del CIIU; mientras esa
          ley no esté cargada, la que se escriba acá queda marcada como
          provisional (R-D11) y se reemplaza sola cuando llegue. */}
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          Tarifa de ICA <Pildora>Provisional</Pildora>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Input
            aria-label={`Tarifa de ICA en ${m.nombre}, por mil`}
            inputMode="decimal"
            placeholder="Ej. 9.66"
            value={escrita}
            disabled={r === null}
            onChange={(e) => setTarifa(e.target.value)}
            className="h-9 w-28 font-mono"
          />
          <span className="text-xs text-muted-foreground">por mil</span>
          {tarifaCambio && r !== null && (
            <Button
              size="sm"
              disabled={guardar.isPending}
              onClick={() =>
                guardar.mutate({
                  esAgenteRetenedor: r.esAgenteRetenedor,
                  esAutorretenedor: r.esAutorretenedor,
                  tarifaProvisionalPorMil: valor,
                })
              }
            >
              Guardar tarifa
            </Button>
          )}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {r === null
            ? "Contestá primero si sos agente retenedor allí."
            : `Todavía no tengo las tarifas de ICA de ${m.nombre}: usá la de tu acuerdo municipal mientras tanto.`}
          {tarifa !== null && escrita.trim() !== "" && !tarifaValida && (
            <span className="block font-medium text-foreground">
              Tiene que ser un número entre 0 y 30.
            </span>
          )}
        </span>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Bloque 3 — Lo que esto significa para vos
// ---------------------------------------------------------------------------

function BloqueResumen({ imp, pendiente }: { imp: EstadoImpuestos; pendiente: boolean }) {
  const confirmar = useGuardar<void>({
    fn: () => impuestosApi.confirmar(),
    exito: "Listo: quedó confirmado",
    invalidar: INVALIDAR,
  });

  return (
    <Bloque
      titulo="Lo que esto significa para vos"
      descripcion="Se arma solo con lo que contestaste. Si algo no cuadra, cambiá la respuesta de arriba."
      pendiente={pendiente}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Lista titulo="Vas a retener" items={imp.resumen.vasARetener} vacio="Nada: no retenés a nadie." />
        <Lista titulo="Te van a retener" items={imp.resumen.teVanARetener} />
      </div>

      <p className="m-0 text-sm">
        <span className="font-medium">Las cuentas contables para todo esto se crean solas</span>{" "}
        <span className="text-muted-foreground">en el paso siguiente.</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => confirmar.mutate(undefined)}
          disabled={confirmar.isPending}
          className="h-11 rounded-xl px-5"
        >
          {confirmar.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Todo correcto
        </Button>
        {imp.confirmadoEn !== null && (
          <span className="text-xs text-muted-foreground">
            Lo confirmaste el {fechaCorta(imp.confirmadoEn)}.
          </span>
        )}
      </div>
    </Bloque>
  );
}

function Lista({ titulo, items, vacio }: { titulo: string; items: string[]; vacio?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {titulo}
      </span>
      {items.length === 0 ? (
        <span className="text-sm text-muted-foreground">{vacio}</span>
      ) : (
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
