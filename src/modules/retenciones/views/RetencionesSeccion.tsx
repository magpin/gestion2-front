"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";

import { Aviso } from "@/components/shared/Aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { DiferenciasRecalculo } from "../components/DiferenciasRecalculo";
import { PropuestasPerfil } from "../components/PropuestasPerfil";
import { TablaAciertos } from "../components/TablaAciertos";
import { retencionesApi } from "../services/retenciones.service";
import {
  NOMBRE_TIPO_RETENCION,
  type ConceptoLey,
  type TarifaVigencia,
} from "../types/retenciones.types";

const CLAVE = ["retenciones"];

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const rige = (t: TarifaVigencia, fecha: string) =>
  t.vigenciaDesde <= fecha &&
  (t.vigenciaHasta === null || t.vigenciaHasta >= fecha);

const fechaCorta = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** «2,5 %» — la ley guarda fracciones. */
const porcentaje = (fraccion: number) =>
  `${(fraccion * 100).toLocaleString("es-CO", { maximumFractionDigits: 3 })} %`;

/** A quién le aplica una fila, cuando el concepto distingue. */
function aQuien(t: TarifaVigencia): string | null {
  const partes: string[] = [];
  if (t.tipoPersona === "NATURAL") partes.push("persona natural");
  if (t.tipoPersona === "JURIDICA") partes.push("persona jurídica");
  if (t.declarante === true) partes.push("declarante");
  if (t.declarante === false) partes.push("no declarante");
  return partes.length === 0 ? null : partes.join(", ");
}

/**
 * Las retenciones, **para consultar**. Nada de esto se carga a mano (plan motor
 * de retenciones, Fase 0):
 *
 * - Las tarifas, las bases mínimas y la UVT son de la ley: las carga la
 *   plataforma con su norma y quién las validó, y cada una rige entre dos
 *   fechas. Una compra se calcula con lo que regía el día de la compra.
 * - Las cuentas se crean solas según lo que la empresa dijo en Configuración →
 *   Impuestos, y cada concepto se enlaza a la suya.
 */
export function RetencionesSeccion() {
  const [fecha, setFecha] = useState(hoy);
  const [abierto, setAbierto] = useState<string | null>(null);
  const anio = Number(fecha.slice(0, 4));

  const { data: uvts = [] } = useQuery({
    queryKey: [...CLAVE, "uvt"],
    queryFn: retencionesApi.uvt,
  });
  const { data: ley = [], isLoading } = useQuery({
    queryKey: [...CLAVE, "ley"],
    queryFn: retencionesApi.ley,
  });
  const { data: conceptos = [] } = useQuery({
    queryKey: [...CLAVE, "conceptos"],
    queryFn: () => retencionesApi.conceptos(),
  });

  const uvt = uvts.find((u) => u.anio === anio) ?? null;
  const enlaces = useMemo(
    () => conceptos.filter((c) => c.activo && c.anio === null),
    [conceptos],
  );
  const viejos = conceptos.filter((c) => c.activo && c.anio !== null);
  const sinEquivalente = viejos.filter((c) => c.concepto_nacional_id === null);
  // Ajustar lo que cambió con una norma nueva es de quien responde por la
  // declaración (Fase 6, §6.3).
  const respondePorDeclaracion = useTieneRol("DIRECTOR", "CONTADOR");

  return (
    <>
      {respondePorDeclaracion && <DiferenciasRecalculo />}
      <PropuestasPerfil />

      {sinEquivalente.length > 0 && (
        <Aviso
          tono="alarma"
          titulo="Conceptos cargados a mano sin equivalente en la ley"
        >
          {sinEquivalente.map((c) => `«${c.nombre}»`).join(", ")}{" "}
          {sinEquivalente.length === 1 ? "sigue" : "siguen"} calculando con la
          tarifa que se les cargó. Pedile al contador que diga a qué concepto de
          la ley corresponde{sinEquivalente.length === 1 ? "" : "n"}.
        </Aviso>
      )}

      <section className="mb-6 flex flex-wrap items-end gap-6 rounded-3xl border border-border bg-card p-6">
        <Campo
          id="fecha"
          etiqueta="Ver lo que regía el"
          ayuda="Cada documento se calcula con la ley de su fecha."
          escala="grande"
        >
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="h-11 w-48 rounded-xl px-4"
          />
        </Campo>
        <p className="pb-1 text-sm text-muted-foreground">
          UVT {anio}:{" "}
          {uvt === null ? (
            <b className="text-warning">sin cargar todavía</b>
          ) : (
            <b className="font-mono text-foreground">
              {formatCOP(Number(uvt.valor))}
            </b>
          )}
          <span className="block text-xs">
            La fija la DIAN por resolución; la carga la plataforma.
          </span>
        </p>
      </section>

      <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Tarifas de la ley</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Las que regían el {fechaCorta(fecha)}. Tocá un concepto para ver sus
            vigencias anteriores.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Concepto", "Tarifa", "Desde", "Norma"].map((x) => (
                    <th key={x} scope="col" className="px-5 py-4">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ley.map((c) => (
                  <FilaConcepto
                    key={c.id}
                    concepto={c}
                    fecha={fecha}
                    uvt={uvt === null ? null : Number(uvt.valor)}
                    abierto={abierto === c.id}
                    onAbrir={() => setAbierto(abierto === c.id ? null : c.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Tus cuentas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Se crearon solas con lo que dijiste en Configuración → Impuestos. Se
            cambian en el Plan de cuentas, como cualquier cuenta.
          </p>
        </div>
        {enlaces.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            Todavía no hay cuentas de retención. Aparecen cuando el plan de
            cuentas las crea.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Concepto", "Lo que retenés", "Lo que te retienen"].map(
                    (x) => (
                      <th key={x} scope="col" className="px-5 py-4">
                        {x}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enlaces.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3">
                      <span className="block text-sm font-semibold">
                        {c.nombre}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {NOMBRE_TIPO_RETENCION[c.tipo]}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-sm">
                      {c.cuenta_codigo ?? (
                        <span className="font-sans text-xs text-muted-foreground">
                          no sos agente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm">
                      {c.cuenta_activo_codigo ?? (
                        <span className="font-sans text-xs text-muted-foreground">
                          sin cuenta todavía
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <IcaMunicipios />

      <LoAprendido />

      <Aciertos />
    </>
  );
}

/**
 * El ICA de la empresa en cada municipio donde tiene sede (plan motor de
 * retenciones, Fase 3): si es agente allí y lo que dice la ley del municipio.
 * Si falta la ley de un municipio, la ReteICA de allí no se calcula y se dice.
 */
function IcaMunicipios() {
  const { data: municipios = [] } = useQuery({
    queryKey: [...CLAVE, "ica"],
    queryFn: retencionesApi.ica,
  });
  if (municipios.length === 0) return null;
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-semibold">ICA en tus municipios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Si sos agente de ICA en cada municipio lo contestás en Configuración →
          Impuestos. Las bases y tarifas son de la ley de cada municipio.
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
        {municipios.map((m) => (
          <li key={m.codigo} className="flex flex-col gap-1 px-6 py-4 text-sm">
            <span className="font-semibold">
              {m.nombre}
              {m.es_principal ? " · sede principal" : ""}
            </span>
            <span className="text-muted-foreground">
              {m.es_agente_retenedor === true
                ? "Sos agente de retención de ICA aquí."
                : m.es_agente_retenedor === false
                  ? "No sos agente de retención de ICA aquí."
                  : "Todavía no contestaste si sos agente aquí."}
            </span>
            {m.acuerdo === null ? (
              m.es_agente_retenedor === true && (
                <span className="text-xs text-warning">
                  Todavía no tengo la ley de ICA de {m.nombre} para este año: la
                  ReteICA de aquí no se calcula hasta que el administrador la
                  cargue.
                </span>
              )
            ) : (
              <span className="text-xs text-muted-foreground">
                {m.tarifa_general_por_mil !== null &&
                !m.usa_tarifa_por_actividad
                  ? `${Number(m.tarifa_general_por_mil).toLocaleString("es-CO")} por mil`
                  : `Tarifa según la actividad del proveedor (${m.tarifas_por_actividad} cargadas)`}
                {m.base_minima_uvt_compras !== null &&
                  ` · desde ${Number(m.base_minima_uvt_compras).toLocaleString("es-CO")} UVT`}
                {m.acumula_en_periodo
                  ? ` · acumula en el período (${(m.periodicidad ?? "").toLowerCase()})`
                  : ""}
                {` · ${m.acuerdo}`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Lo que el motor aprendió de lo que confirmaron (plan motor de retenciones,
 * Fase 1, §1.7): «a Omaira, por “arriendo”, es arrendamiento de inmuebles».
 * La próxima vez es «La vi clara». Quitarlo vuelve a deducir o a preguntar.
 */
/**
 * Cuánto acierta cada fuente (plan motor de retenciones, Fase 5, §5.3): de lo
 * que propuso, cuánto se aceptó tal cual y cuánto se cambió.
 */
function Aciertos() {
  const { data: filas = [] } = useQuery({
    queryKey: [...CLAVE, "aciertos"],
    queryFn: retencionesApi.aciertos,
  });
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-semibold">Aciertos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          De dónde salió el concepto de cada renglón que registraste, y cuántas
          veces lo aceptaste tal cual. Lo que propone la IA nunca se aplica
          solo: siempre lo confirma una persona.
        </p>
      </div>
      <TablaAciertos filas={filas} />
    </section>
  );
}

function LoAprendido() {
  const cliente = useQueryClient();
  const puedeQuitar = useTieneRol("DIRECTOR", "CONTADOR");
  const { data: aprendido = [] } = useQuery({
    queryKey: [...CLAVE, "aprendido"],
    queryFn: retencionesApi.aprendido,
  });
  const quitar = useMutation({
    mutationFn: retencionesApi.quitarAprendido,
    onSuccess: async () => {
      aviso.exito("Listo: la próxima vez lo vuelvo a deducir o te pregunto.");
      await cliente.invalidateQueries({ queryKey: [...CLAVE, "aprendido"] });
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-semibold">Lo que aprendí</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando confirmás o cambiás el concepto de un renglón, lo recuerdo para
          ese proveedor.
        </p>
      </div>
      {aprendido.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          Todavía nada. Aparece cuando contestás el concepto de una compra.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                {["Proveedor y renglón", "Concepto", "Quién y cuándo", ""].map(
                  (x) => (
                    <th key={x} scope="col" className="px-5 py-4">
                      {x}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {aprendido.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 text-sm">
                    <span className="block font-semibold">
                      {a.proveedor ?? "Cualquier proveedor"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a.producto ??
                        (a.llave_renglon ? `«${a.llave_renglon}»` : "")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {a.concepto_nombre}
                    <span className="block text-xs text-muted-foreground">
                      {a.origen === "CORREGIDO"
                        ? "Lo cambiaste"
                        : "Aceptaste lo que deduje"}
                      {a.veces > 1 ? ` · ${a.veces} veces` : ""}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {a.confirmado_por ?? "—"},{" "}
                    {fechaCorta(a.actualizado_en.slice(0, 10))}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {puedeQuitar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={quitar.isPending}
                        onClick={() => quitar.mutate(a.id)}
                      >
                        Quitar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FilaConcepto({
  concepto,
  fecha,
  uvt,
  abierto,
  onAbrir,
}: {
  concepto: ConceptoLey;
  fecha: string;
  uvt: number | null;
  abierto: boolean;
  onAbrir: () => void;
}) {
  const vigentes = concepto.tarifas.filter((t) => rige(t, fecha));
  const anteriores = concepto.tarifas.filter((t) => !rige(t, fecha));

  const detalle = (t: TarifaVigencia) => (
    <>
      <span className="font-mono text-sm font-semibold">
        {porcentaje(t.tarifa)}
        {concepto.base_es_iva && " del IVA"}
      </span>
      <span className="block text-xs text-muted-foreground">
        {t.baseUvt === 0
          ? "desde el primer peso"
          : `desde ${t.baseUvt.toLocaleString("es-CO")} UVT${
              uvt === null ? "" : ` (${formatCOP(Math.round(t.baseUvt * uvt))})`
            }`}
        {aQuien(t) !== null && ` · ${aQuien(t)}`}
      </span>
    </>
  );

  return (
    <Fragment>
      <tr
        className="cursor-pointer align-top transition-colors hover:bg-muted/40"
        onClick={onAbrir}
      >
        <td className="px-5 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${abierto ? "" : "-rotate-90"}`}
            />
            {concepto.nombre}
          </span>
          <span className="ml-6 text-xs text-muted-foreground">
            {NOMBRE_TIPO_RETENCION[concepto.impuesto]}
          </span>
        </td>
        {vigentes.length === 0 ? (
          <td colSpan={3} className="px-5 py-3 text-sm text-muted-foreground">
            {concepto.tarifas.length === 0
              ? "Todavía sin tarifas de la ley."
              : "Sin tarifa a esa fecha."}
          </td>
        ) : (
          <>
            <td className="flex flex-col gap-2 px-5 py-3">
              {vigentes.map((t, i) => (
                <span key={i}>{detalle(t)}</span>
              ))}
            </td>
            <td className="px-5 py-3 text-sm">
              {fechaCorta(vigentes[0].vigenciaDesde)}
            </td>
            <td className="px-5 py-3 text-xs text-muted-foreground">
              {vigentes[0].norma}
              <span className="block">
                Validó {vigentes[0].validadoPor},{" "}
                {fechaCorta(vigentes[0].validadoEn)}
              </span>
            </td>
          </>
        )}
      </tr>
      {abierto && anteriores.length > 0 && (
        <tr className="bg-muted/20">
          <td />
          <td colSpan={3} className="px-5 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Otras vigencias
            </p>
            <ul className="flex flex-col gap-2">
              {anteriores.map((t, i) => (
                <li key={i} className="text-sm">
                  {detalle(t)}
                  <span className="block text-xs text-muted-foreground">
                    {fechaCorta(t.vigenciaDesde)} –{" "}
                    {t.vigenciaHasta === null
                      ? "hoy"
                      : fechaCorta(t.vigenciaHasta)}{" "}
                    · {t.norma}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
      {abierto && anteriores.length === 0 && (
        <tr className="bg-muted/20">
          <td />
          <td colSpan={3} className="px-5 py-3 text-xs text-muted-foreground">
            No tiene otras vigencias.
          </td>
        </tr>
      )}
    </Fragment>
  );
}
