"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCOP } from "@/lib/utils";
import {
  aiuSinPedir,
  type CertezaConcepto,
  type ExplicacionRetencion,
  type PropuestaRenta as Propuesta,
  type RenglonPropuesto,
  type RespuestasRenta,
} from "../types/retenciones.types";

const CHIP: Record<CertezaConcepto, { texto: string; clase: string }> = {
  CLARA: {
    texto: "La vi clara",
    clase: "border-success/40 bg-success/10 text-foreground",
  },
  DEDUCIDA: {
    texto: "La deduje",
    clase: "border-warning/50 bg-warning/10 text-foreground",
  },
  PREGUNTA: {
    texto: "Te pregunto",
    clase: "border-warning/50 bg-warning/10 text-foreground",
  },
};

const CHIP_TUYO = {
  texto: "Lo dijiste vos",
  clase: "border-border bg-muted text-foreground",
};

/** De dónde salió el concepto que quedó, para «¿Por qué?». */
const ORIGEN_EXPLICADO: Record<string, string> = {
  CONFIRMADO: "ya me lo habías dicho",
  PRODUCTO: "es un producto del inventario",
  CIIU: "por la actividad del proveedor, y lo aceptaste",
  PALABRAS: "por lo que dice el renglón, y lo aceptaste",
  IA: "lo propuso la IA y lo aceptaste",
  MANUAL: "lo elegiste vos",
};

/** Cada guarda del motor, en palabras (las claves son de las reglas del backend). */
const FUNDAMENTO: Record<string, string> = {
  // Renta
  pagador_es_agente: "Tu empresa es agente de retención",
  beneficiario_simple: "El proveedor está en el SIMPLE",
  beneficiario_no_contribuyente: "El proveedor no es contribuyente",
  beneficiario_autorretenedor: "El proveedor es autorretenedor",
  pago_con_tarjeta: "Se pagó con tarjeta",
  // IVA
  pagador_agente_iva: "Tu empresa es agente de retención de IVA",
  vendedor_responsable_iva: "El proveedor es responsable de IVA",
  renglones_con_iva: "La factura trae IVA",
  entre_agentes_1_2_5:
    "Los dos son agentes de retención de IVA de los numerales 1, 2 o 5",
  servicio_desde_el_exterior: "Es un servicio desde el exterior",
  // ICA
  agente_ica_en_municipio: "Tu empresa es agente de ReteICA en el municipio",
  proveedor_no_contribuyente_ica:
    "El proveedor no es contribuyente de ICA allí",
  proveedor_autorretenedor_ica: "El proveedor es autorretenedor de ICA allí",
  matriz_municipal: "La matriz del municipio ordena retener",
  // Ventas
  cliente_simple: "El cliente está en el SIMPLE",
  vendedor_agente_renta: "Tu empresa es agente de retención de renta",
};

/**
 * Una guarda en palabras. Una clave que todavía no está en el mapa no se
 * muestra cruda: se le quitan los guiones bajos.
 */
export function fundamentoEnPalabras(regla: string): string {
  const conocida = FUNDAMENTO[regla];
  if (conocida !== undefined) return conocida;
  const texto = regla.replace(/_/g, " ").trim().toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * El chip y la razón de un renglón con el concepto que quedó. Si la persona
 * cambió el que el motor vio claro o dedujo, ya no es «La vi clara»: es «Lo
 * dijiste vos», y la razón vieja deja de valer.
 */
export function estadoRenglon(
  r: RenglonPropuesto,
  elegido: string | null,
  nombreDe: (codigo: string | null) => string,
): { chip: { texto: string; clase: string }; razon: string } {
  const cambiado = elegido !== null && elegido !== r.concepto;
  if (cambiado) {
    return {
      chip: CHIP_TUYO,
      razon: `Elegiste ${nombreDe(elegido).toLowerCase()}. Al registrar lo aprendo para las próximas compras de este proveedor.`,
    };
  }
  // El estado lo dice el servidor, que ya recalculó con lo contestado.
  const chip = r.pendiente
    ? r.origen === "IA"
      ? { ...CHIP.DEDUCIDA, texto: "La deduje · IA" }
      : CHIP[r.certeza]
    : r.certeza === "CLARA"
      ? CHIP.CLARA
      : CHIP_TUYO;
  return { chip, razon: r.razon };
}

/**
 * La retención en la fuente (renta) de una compra, **propuesta por el motor**
 * (plan motor de retenciones, Fase 1, §1.7). La misma para la compra manual y
 * para la factura que leyó María.
 *
 * Por renglón: el concepto con su certeza. «La vi clara» no pide nada; «La
 * deduje» se acepta o se cambia; «Te pregunto» se contesta. **No se escribe
 * una tarifa**: sale de la ley a la fecha. Cambiar el concepto enseña —la
 * próxima vez, con este proveedor, es «La vi clara»—.
 */
export function PropuestaRenta({
  propuesta,
  cargando,
  error,
  respuestas,
  onCambiar,
  editable = true,
  etiquetaRenglon = (orden) => `Renglón ${orden}`,
}: {
  propuesta: Propuesta | undefined;
  cargando: boolean;
  error: string | null;
  respuestas: RespuestasRenta;
  onCambiar: (r: RespuestasRenta) => void;
  editable?: boolean;
  etiquetaRenglon?: (orden: number) => string;
}) {
  // El AIU de un renglón que ya no lo pide no se manda: el IVA de ese renglón
  // iría sobre un AIU que nadie ve (bug #16).
  useEffect(() => {
    if (cargando) return;
    const quedan = aiuSinPedir(propuesta, respuestas.aiu ?? {});
    if (quedan !== null) onCambiar({ ...respuestas, aiu: quedan });
  }, [cargando, propuesta, respuestas, onCambiar]);

  const elegir = (orden: number, codigo: string) =>
    onCambiar({
      ...respuestas,
      conceptos: { ...respuestas.conceptos, [orden]: codigo },
    });

  const nombreDe = (codigo: string | null) =>
    propuesta?.conceptos.find((c) => c.codigo === codigo)?.nombre ??
    codigo ??
    "";

  const total =
    propuesta?.retenciones
      .filter((r) => !r.asumida)
      .reduce((s, r) => s + r.valor, 0) ?? 0;
  const asumido =
    propuesta?.retenciones
      .filter((r) => r.asumida)
      .reduce((s, r) => s + r.valor, 0) ?? 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Retenciones</p>
        {cargando && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error !== null && (
        <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm">{error}</p>
      )}

      {respuestas.sinRetencion ? (
        <SinRetencion
          respuestas={respuestas}
          onCambiar={onCambiar}
          editable={editable}
        />
      ) : propuesta === undefined ? (
        <p className="text-sm text-muted-foreground">
          Completá el proveedor y las líneas para ver la retención.
        </p>
      ) : propuesta.renglones.length === 0 &&
        propuesta.retenciones.length === 0 ? (
        // Una guarda cortó antes de clasificar y no quedó ninguna retención:
        // no hay nada que preguntar ni que mostrar.
        <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
          {propuesta.motivo}
        </p>
      ) : (
        <>
          {/* Sin renglones que clasificar puede haber retenciones igual: el
              ReteIVA a un proveedor del SIMPLE no pide concepto. */}
          {propuesta.renglones.length > 0 && (
            <ul className="m-0 flex list-none flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border p-0">
              {propuesta.renglones.map((r) => (
                <FilaRenglon
                  key={r.orden}
                  renglon={r}
                  etiqueta={etiquetaRenglon(r.orden)}
                  elegido={respuestas.conceptos[r.orden] ?? r.elegido}
                  conceptos={propuesta.conceptos}
                  nombreDe={nombreDe}
                  editable={editable}
                  onElegir={(codigo) => elegir(r.orden, codigo)}
                />
              ))}
            </ul>
          )}

          {/* El convenio del país del proveedor del exterior (§8.15): se
              ofrece, y se aplica solo si la persona lo elige. */}
          {editable &&
            propuesta.renglones
              .filter((r) => (r.convenios ?? []).length > 0)
              .map((r) => (
                <div
                  key={`cdi-${r.orden}`}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3 text-sm"
                >
                  <span>
                    {etiquetaRenglon(r.orden)}: el proveedor probó su residencia
                    en {r.convenios![0].paisNombre}.
                  </span>
                  {r.convenios!.map((c) => {
                    const puesto = respuestas.convenios?.[r.orden] === c.tipo;
                    return (
                      <Button
                        key={c.tipo}
                        type="button"
                        size="sm"
                        variant={puesto ? "default" : "outline"}
                        title={c.ley}
                        onClick={() => {
                          const otros = { ...respuestas.convenios };
                          if (puesto) delete otros[r.orden];
                          else otros[r.orden] = c.tipo;
                          onCambiar({ ...respuestas, convenios: otros });
                        }}
                      >
                        {puesto ? "Aplicado: " : "Aplicar convenio: "}
                        {c.tipo === "INTERESES" ? "intereses" : "regalías"}{" "}
                        {(c.tarifa * 100).toLocaleString("es-CO")} %
                      </Button>
                    );
                  })}
                </div>
              ))}

          {/* Temporales, aseo y vigilancia retienen sobre el AIU (§8.13). */}
          {editable &&
            propuesta.renglones
              .filter((r) => r.pideAiu === true)
              .map((r) => (
                <label
                  key={`aiu-${r.orden}`}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium">
                    AIU de {etiquetaRenglon(r.orden)}
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    className="h-10 w-48 rounded-lg border border-input bg-transparent px-3 text-sm"
                    placeholder="El que discrimina la factura"
                    value={respuestas.aiu?.[r.orden] ?? ""}
                    onChange={(e) =>
                      onCambiar({
                        ...respuestas,
                        aiu: { ...respuestas.aiu, [r.orden]: e.target.value },
                      })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    El IVA y la retención van sobre el AIU, nunca menos del 10 % del renglón.
                  </span>
                </label>
              ))}

          {propuesta.retenciones.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {propuesta.retenciones.map((r) => (
                <FilaRetencion key={r.conceptoCodigo} retencion={r} />
              ))}
            </ul>
          )}
          {propuesta.sinRetener.map((s) => (
            <p
              key={s.conceptoCodigo}
              className="m-0 text-xs text-muted-foreground"
            >
              {s.texto}
            </p>
          ))}
          {propuesta.decision === "REVISION" && (
            <p className="rounded-2xl bg-warning/10 px-4 py-3 text-sm">
              {propuesta.motivo}
            </p>
          )}
          {total > 0 && (
            <p className="m-0 text-sm">
              Se retiene{" "}
              <strong className="font-mono">{formatCOP(total)}</strong>.
            </p>
          )}
          {asumido > 0 && (
            <p className="m-0 text-xs text-muted-foreground">
              Además asumís {formatCOP(asumido)} de IVA del exterior: no se le
              descuenta al proveedor, lo declarás y lo descontás vos.
            </p>
          )}
        </>
      )}

      {(propuesta?.avisos ?? []).map((a) => (
        <p key={a} className="m-0 rounded-2xl bg-muted/50 px-4 py-3 text-xs">
          {a}
        </p>
      ))}

      {/* Persona natural por la tabla del art. 383: sus aportes a salud y
          pensión bajan la base (Fase 8, §8.14). */}
      {propuesta?.pideAportes === true &&
        !respuestas.sinRetencion &&
        editable && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              Aportes a salud y pensión del proveedor (su planilla del mes)
            </span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              className="h-10 w-56 rounded-lg border border-input bg-transparent px-3 text-sm"
              placeholder="0"
              value={respuestas.aportes}
              onChange={(e) =>
                onCambiar({ ...respuestas, aportes: e.target.value })
              }
            />
          </label>
        )}

      {/* La factura leída: lo que dice el papel contra lo que dice la norma. */}
      {propuesta?.difiere === true && !respuestas.sinRetencion && (
        <p className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          El papel dice <strong>{formatCOP(propuesta.impresa ?? 0)}</strong> de
          retención; por norma corresponden{" "}
          <strong>{formatCOP(propuesta.calculada ?? 0)}</strong>. Registro la de
          la norma. Si el proveedor tiene otra condición, corregila en su ficha
          y volvé a abrir la factura.
        </p>
      )}

      {editable && !respuestas.sinRetencion && (
        <button
          type="button"
          className="w-fit text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => onCambiar({ ...respuestas, sinRetencion: true })}
        >
          Registrar sin retención…
        </button>
      )}
    </section>
  );
}

function FilaRenglon({
  renglon: r,
  etiqueta,
  elegido,
  conceptos,
  nombreDe,
  editable,
  onElegir,
}: {
  renglon: RenglonPropuesto;
  etiqueta: string;
  elegido: string | null;
  conceptos: Array<{ codigo: string; nombre: string }>;
  nombreDe: (codigo: string | null) => string;
  editable: boolean;
  onElegir: (codigo: string) => void;
}) {
  const [cambiando, setCambiando] = useState(false);
  const { chip, razon } = estadoRenglon(r, elegido, nombreDe);
  const opciones = r.opciones
    ? conceptos.filter((c) => r.opciones!.includes(c.codigo))
    : conceptos;
  const verSelector = editable && (r.certeza !== "CLARA" || cambiando);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{etiqueta}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${chip.clase}`}
        >
          {chip.texto}
        </span>
        {elegido !== null && (
          <span className="text-sm font-medium">{nombreDe(elegido)}</span>
        )}
      </div>
      <p className="m-0 text-xs text-muted-foreground">{razon}</p>

      {verSelector && (
        <div className="flex flex-wrap items-center gap-2">
          {r.pendiente && r.certeza === "DEDUCIDA" && r.concepto !== null && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onElegir(r.concepto!)}
            >
              <Check className="size-3.5" /> Sí, es{" "}
              {nombreDe(r.concepto).toLowerCase()}
            </Button>
          )}
          {r.pendiente &&
            (r.alternativas ?? []).map((a) => (
              <Button
                key={a}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onElegir(a)}
              >
                {nombreDe(a)}
              </Button>
            ))}
          <Select
            // Sin `items`, el disparador muestra el código (EXT_GENERAL).
            items={conceptos.map((c) => ({ value: c.codigo, label: c.nombre }))}
            value={r.pendiente ? undefined : (elegido ?? undefined)}
            onValueChange={(v) => {
              if (v) {
                onElegir(v);
                setCambiando(false);
              }
            }}
          >
            <SelectTrigger
              className="h-9 w-64 rounded-xl px-3 text-sm"
              aria-label={`Concepto de retención, ${etiqueta}`}
            >
              <SelectValue
                placeholder={
                  r.certeza === "PREGUNTA" ? "¿Qué concepto es?" : "Es otro…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((c) => (
                <SelectItem key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {editable && r.certeza === "CLARA" && !cambiando && (
        <button
          type="button"
          className="w-fit text-[11px] text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setCambiando(true)}
        >
          No es esto
        </button>
      )}
    </li>
  );
}

function FilaRetencion({
  retencion: r,
}: {
  retencion: Propuesta["retenciones"][number];
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <li className="rounded-2xl bg-muted/40 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {r.nombre} ·{" "}
          <span className="font-mono">
            {r.impuesto === "ICA"
              ? `${(r.tarifa * 10).toLocaleString("es-CO")} por mil`
              : `${r.tarifa.toLocaleString("es-CO")} %`}
          </span>{" "}
          sobre <span className="font-mono">{formatCOP(r.base)}</span>
        </span>
        <span className="font-mono font-semibold">{formatCOP(r.valor)}</span>
      </div>
      {r.cuentaId === null && (
        <p className="m-0 mt-1 text-xs">
          No tenés la cuenta de esta retención. Se crea sola en el plan de
          cuentas si sos agente.
        </p>
      )}
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={`size-3 transition-transform ${abierta ? "" : "-rotate-90"}`}
        />
        ¿Por qué?
      </button>
      {abierta && <Explicacion e={r.explicacion} />}
    </li>
  );
}

/** La traza de una retención, en palabras. */
export function Explicacion({ e }: { e: ExplicacionRetencion }) {
  return (
    <ul className="m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
      {e.guardas.map((g) => (
        <li key={g.regla}>
          {fundamentoEnPalabras(g.regla)}: {g.resultado ? "sí" : "no"} (
          {g.fundamento})
        </li>
      ))}
      {e.base && (
        <li>Base: {formatCOP(e.base.base_final)}, el subtotal sin IVA.</li>
      )}
      {e.cuantia_minima && (
        <li>
          {e.cuantia_minima.uvt === 0
            ? "Se retiene desde el primer peso."
            : `Mínimo: ${e.cuantia_minima.uvt} UVT (${formatCOP(e.cuantia_minima.valor)}) — ${e.cuantia_minima.supera ? "la base lo supera" : "la base no llega"}.`}
        </li>
      )}
      {e.acumulado && (
        <li>
          En el año lleva {formatCOP(e.acumulado.con_este)} contra{" "}
          {e.acumulado.umbral_uvt.toLocaleString("es-CO")} UVT (
          {formatCOP(e.acumulado.umbral)}):{" "}
          {e.acumulado.supera ? "lo cruza, va al 11 %" : "no lo cruza"}.
        </li>
      )}
      {e.zomac && <li>{e.zomac}</li>}
      {e.tarifa && (
        <li>
          Tarifa:{" "}
          {(e.tarifa.efectiva * 100).toLocaleString("es-CO", {
            maximumFractionDigits: 3,
          })}{" "}
          % — {e.tarifa.norma}.
        </li>
      )}
      {e.perfil?.aproximado && (
        <li>
          La compra es anterior al primer dato que tengo del proveedor (del{" "}
          {e.perfil.desde}); usé ese.
        </li>
      )}
      {e.clasificacion && (
        <li>
          Concepto: {e.clasificacion.nombre} (
          {ORIGEN_EXPLICADO[e.clasificacion.origen] ??
            e.clasificacion.origen.toLowerCase()}
          ).
        </li>
      )}
    </ul>
  );
}

function SinRetencion({
  respuestas,
  onCambiar,
  editable,
}: {
  respuestas: RespuestasRenta;
  onCambiar: (r: RespuestasRenta) => void;
  editable: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border p-4">
      <p className="m-0 text-sm">
        Se registra <strong>sin retención</strong> (ni de renta ni de IVA). El
        motivo queda escrito en la compra y la revisión lo respeta.
      </p>
      <Textarea
        value={respuestas.motivo}
        onChange={(e) => onCambiar({ ...respuestas, motivo: e.target.value })}
        placeholder="Por qué: el proveedor nos mostró su resolución de autorretenedor…"
        maxLength={300}
        rows={2}
        disabled={!editable}
        aria-label="Motivo para registrar sin retención"
      />
      {editable && (
        <button
          type="button"
          className="w-fit text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => onCambiar({ ...respuestas, sinRetencion: false })}
        >
          Mejor calcularla
        </button>
      )}
    </div>
  );
}
