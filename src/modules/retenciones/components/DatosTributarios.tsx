"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { retencionesApi } from "../services/retenciones.service";
import { CertificadoTercero } from "./CertificadoTercero";
import { PropuestasPerfil } from "./PropuestasPerfil";
import { ResidenciaFiscal } from "./ResidenciaFiscal";
import type {
  IcaTercero,
  NuevoIcaTerceroInput,
  NuevoPerfilInput,
  VersionPerfil,
} from "../types/retenciones.types";

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fecha = (f: string) =>
  new Date(`${f.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const REGIMEN: Record<VersionPerfil["regimen_renta"], string> = {
  ORDINARIO: "Régimen ordinario",
  SIMPLE: "Régimen simple",
  NO_CONTRIBUYENTE: "No contribuyente",
  REGIMEN_ESPECIAL: "Régimen especial",
};

/** Lo que retiene o no retiene el motor, en una línea. */
function resumen(v: VersionPerfil): string {
  const partes = [REGIMEN[v.regimen_renta]];
  partes.push(v.declarante_renta ? "declarante" : "no declarante");
  if (v.es_responsable_iva) partes.push("responsable de IVA");
  if (v.es_gran_contribuyente) partes.push("gran contribuyente");
  if (v.es_autorretenedor_renta) partes.push("autorretenedor");
  if (v.es_agente_ret_iva) partes.push("agente de IVA");
  if (v.es_zomac)
    partes.push(
      `ZOMAC${v.zomac_tamano ? ` ${v.zomac_tamano.toLowerCase()}` : ""}`,
    );
  if (v.ciiu_principal) partes.push(`CIIU ${v.ciiu_principal}`);
  return partes.join(" · ");
}

/**
 * Los datos tributarios del tercero, con su historia (plan motor de
 * retenciones, Fase 1, §1.7). Es lo que el motor mira para decidir si se le
 * retiene y con qué tarifa, **a la fecha de cada documento**: «Desde el 15 sep:
 * autorretenedor» no cambia la compra del 10.
 *
 * Nunca se edita hacia atrás. Un cambio es una versión nueva desde la fecha
 * que diga su RUT o su resolución (R-D8: la cargan DIRECTOR o CONTADOR).
 */
export function DatosTributarios({ terceroId }: { terceroId: string }) {
  const cliente = useQueryClient();
  const puede = useTieneRol("DIRECTOR", "CONTADOR");
  const [abierto, setAbierto] = useState(false);

  const { data: historia = [], isLoading } = useQuery({
    queryKey: ["retenciones", "perfil", terceroId],
    queryFn: () => retencionesApi.perfil(terceroId),
  });
  const vigente =
    historia.find((v) => v.vigencia_hasta === null) ?? historia[0];

  return (
    <section className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="m-0 text-sm font-semibold">Datos tributarios</h3>
          <p className="m-0 text-xs text-muted-foreground">
            Con esto decido si se le retiene y con qué tarifa, a la fecha de
            cada factura.
          </p>
        </div>
        {puede && !abierto && vigente !== undefined && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAbierto(true)}
          >
            <Plus className="size-3.5" /> Cambió algo
          </Button>
        )}
      </div>

      {/* Lo que se le retuvo, como lo pide el proveedor (Fase 8, §8.5). */}
      {/* Lo que sus facturas dicen y no coincide (Fase 8, §8.8). */}
      <PropuestasPerfil terceroId={terceroId} />
      {/* Proveedor del exterior: su certificado de residencia (§8.15). */}
      <ResidenciaFiscal terceroId={terceroId} />

      {puede && <CertificadoTercero terceroId={terceroId} />}

      {isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {historia.map((v) => (
            <li
              key={v.id}
              className={`rounded-xl px-3 py-2 text-sm ${v.vigencia_hasta === null ? "bg-muted/60" : "text-muted-foreground"}`}
            >
              <span className="block text-xs text-muted-foreground">
                {v.vigencia_hasta === null
                  ? `Desde el ${fecha(v.vigencia_desde)}`
                  : `Del ${fecha(v.vigencia_desde)} al ${fecha(v.vigencia_hasta)}`}
                {v.aprobado_por_nombre
                  ? ` · lo cargó ${v.aprobado_por_nombre}`
                  : " · tomado de la ficha"}
              </span>
              {resumen(v)}
            </li>
          ))}
        </ul>
      )}

      <IcaDelTercero terceroId={terceroId} puede={puede} />

      {abierto && vigente !== undefined && (
        <NuevaVersion
          vigente={vigente}
          terceroId={terceroId}
          onListo={async () => {
            await cliente.invalidateQueries({
              queryKey: ["retenciones", "perfil", terceroId],
            });
            await cliente.invalidateQueries({ queryKey: ["terceros"] });
            setAbierto(false);
          }}
          onCancelar={() => setAbierto(false)}
        />
      )}
    </section>
  );
}

function NuevaVersion({
  vigente,
  terceroId,
  onListo,
  onCancelar,
}: {
  vigente: VersionPerfil;
  terceroId: string;
  onListo: () => Promise<void>;
  onCancelar: () => void;
}) {
  const [f, setF] = useState<NuevoPerfilInput>({
    regimenRenta: vigente.regimen_renta,
    declaranteRenta: vigente.declarante_renta,
    esResponsableIva: vigente.es_responsable_iva,
    esGranContribuyente: vigente.es_gran_contribuyente,
    esAutorretenedorRenta: vigente.es_autorretenedor_renta,
    esAgenteRetIva: vigente.es_agente_ret_iva,
    esZomac: vigente.es_zomac,
    zomacTamano: vigente.zomac_tamano ?? undefined,
    ciiuPrincipal: vigente.ciiu_principal ?? undefined,
    contratoDosOMasTrabajadores:
      vigente.contrato_dos_o_mas_trabajadores ?? false,
    vigenciaDesde: hoy(),
  });

  const guardar = useMutation({
    mutationFn: () => retencionesApi.nuevoPerfil(terceroId, f),
    onSuccess: async () => {
      aviso.exito("Datos tributarios guardados");
      await onListo();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const casilla = (clave: keyof NuevoPerfilInput, texto: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-foreground"
        checked={Boolean(f[clave])}
        onChange={(e) => setF({ ...f, [clave]: e.target.checked })}
      />
      {texto}
    </label>
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Régimen de renta</span>
          <select
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
            value={f.regimenRenta}
            onChange={(e) =>
              setF({
                ...f,
                regimenRenta: e.target
                  .value as NuevoPerfilInput["regimenRenta"],
              })
            }
          >
            {Object.entries(REGIMEN).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Desde cuándo</span>
          <Input
            type="date"
            value={f.vigenciaDesde}
            max={hoy()}
            onChange={(e) => setF({ ...f, vigenciaDesde: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">
            Lo que diga su RUT o su resolución.
          </span>
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {casilla("declaranteRenta", "Declara renta")}
        {casilla("esResponsableIva", "Responsable de IVA")}
        {casilla("esAutorretenedorRenta", "Autorretenedor (no se le retiene)")}
        {casilla("esGranContribuyente", "Gran contribuyente")}
        {casilla("esAgenteRetIva", "Agente de retención de IVA")}
        {casilla("esZomac", "ZOMAC")}
        {/* Sin dos o más trabajadores, sus honorarios y servicios van por la
            tabla del art. 383 (Fase 8, §8.14). */}
        {vigente.tipo_persona === "NATURAL" &&
          casilla(
            "contratoDosOMasTrabajadores",
            "Contrató 2 o más trabajadores para su actividad",
          )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {f.esZomac && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Tamaño ZOMAC</span>
            <select
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
              value={f.zomacTamano ?? ""}
              onChange={(e) =>
                setF({
                  ...f,
                  zomacTamano: (e.target.value ||
                    undefined) as NuevoPerfilInput["zomacTamano"],
                })
              }
            >
              <option value="">Elija…</option>
              <option value="MICRO">Micro</option>
              <option value="PEQUENA">Pequeña</option>
              <option value="MEDIANA">Mediana</option>
              <option value="GRANDE">Grande</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Actividad principal (CIIU)</span>
          <Input
            inputMode="numeric"
            maxLength={4}
            value={f.ciiuPrincipal ?? ""}
            onChange={(e) =>
              setF({
                ...f,
                ciiuPrincipal: e.target.value.replace(/\D/g, "") || undefined,
              })
            }
            placeholder="4923"
          />
          <span className="text-xs text-muted-foreground">
            Me ayuda a deducir el concepto de retención.
          </span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={
            guardar.isPending ||
            (f.esZomac === true && f.zomacTamano === undefined)
          }
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Guardar desde el {fecha(f.vigenciaDesde)}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

const REGIMEN_ICA: Record<IcaTercero["ica_regimen"], string> = {
  COMUN: "Contribuyente",
  PREFERENCIAL: "Régimen preferencial",
  NO_CONTRIBUYENTE: "No contribuyente",
};

/**
 * El ICA del proveedor en cada municipio (plan motor de retenciones, Fase 3).
 * Sin datos se toma contribuyente, que es lo corriente; lo que cambia la
 * ReteICA es que sea autorretenedor o no contribuyente allí, y su actividad
 * donde la tarifa va por actividad.
 */
function IcaDelTercero({
  terceroId,
  puede,
}: {
  terceroId: string;
  puede: boolean;
}) {
  const cliente = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const { data: filas = [] } = useQuery({
    queryKey: ["retenciones", "ica-tercero", terceroId],
    queryFn: () => retencionesApi.icaTercero(terceroId),
  });
  const { data: municipios = [] } = useQuery({
    queryKey: ["retenciones", "ica"],
    queryFn: retencionesApi.ica,
    enabled: abierto,
  });
  const [f, setF] = useState<NuevoIcaTerceroInput>({
    municipioCodigo: "",
    icaRegimen: "COMUN",
    esAutorretenedorIca: false,
    vigenciaDesde: hoy(),
  });
  const guardar = useMutation({
    mutationFn: () => retencionesApi.nuevoIcaTercero(terceroId, f),
    onSuccess: async () => {
      aviso.exito("ICA del proveedor guardado");
      await cliente.invalidateQueries({
        queryKey: ["retenciones", "ica-tercero", terceroId],
      });
      setAbierto(false);
    },
    onError: (e: unknown) => aviso.falla(e),
  });
  const vigentes = filas.filter((x) => x.vigencia_hasta === null);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          ICA por municipio
        </span>
        {puede && !abierto && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAbierto(true)}
          >
            <Plus className="size-3.5" /> Agregar
          </Button>
        )}
      </div>
      {vigentes.length === 0 ? (
        <p className="m-0 text-xs text-muted-foreground">
          Sin datos: lo tomo como contribuyente de ICA donde usted le compre.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          {vigentes.map((x) => (
            <li key={x.id}>
              <span className="font-medium">{x.municipio}</span> ·{" "}
              {REGIMEN_ICA[x.ica_regimen]}
              {x.es_autorretenedor_ica
                ? " · autorretenedor (no se le retiene)"
                : ""}
              {x.codigo_actividad_local
                ? ` · actividad ${x.codigo_actividad_local}`
                : ""}
              <span className="text-xs text-muted-foreground">
                {" "}
                · desde el {fecha(x.vigencia_desde)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <div className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Municipio</span>
            <select
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
              value={f.municipioCodigo}
              onChange={(e) => setF({ ...f, municipioCodigo: e.target.value })}
            >
              <option value="">Elija…</option>
              {municipios.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Régimen de ICA allí</span>
            <select
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
              value={f.icaRegimen}
              onChange={(e) =>
                setF({
                  ...f,
                  icaRegimen: e.target
                    .value as NuevoIcaTerceroInput["icaRegimen"],
                })
              }
            >
              {Object.entries(REGIMEN_ICA).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={f.esAutorretenedorIca}
              onChange={(e) =>
                setF({ ...f, esAutorretenedorIca: e.target.checked })
              }
            />
            Autorretenedor de ICA allí
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              Código de actividad del municipio
            </span>
            <Input
              value={f.codigoActividadLocal ?? ""}
              onChange={(e) =>
                setF({
                  ...f,
                  codigoActividadLocal: e.target.value || undefined,
                })
              }
              placeholder="Opcional"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Desde cuándo</span>
            <Input
              type="date"
              value={f.vigenciaDesde}
              max={hoy()}
              onChange={(e) => setF({ ...f, vigenciaDesde: e.target.value })}
            />
          </label>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              size="sm"
              disabled={f.municipioCodigo === "" || guardar.isPending}
              onClick={() => guardar.mutate()}
            >
              {guardar.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Guardar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
