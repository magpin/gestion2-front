"use client";

import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { TablaAciertos } from "@/modules/retenciones/components/TablaAciertos";
import { BotonBuscar } from "../components/BotonBuscar";
import { RecalculoRetenciones } from "../components/RecalculoRetenciones";
import {
  Encabezado,
  ErrorCarga,
  EsqueletoPagina,
  Mono,
  Tarjeta,
  Td,
  Th,
} from "../components/piezas";
import { plataformaService } from "../services/plataforma.service";
import type {
  ConceptoLeyPlataforma,
  TarifaLeyPlataforma,
} from "../types/plataforma.types";

const campo =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const CLAVE = ["plataforma", "retenciones"];

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const pct = (fraccion: number) =>
  `${(Number(fraccion) * 100).toLocaleString("es-CO", { maximumFractionDigits: 3 })} %`;

const aQuien = (t: TarifaLeyPlataforma) =>
  [
    t.tipoPersona === "NATURAL"
      ? "natural"
      : t.tipoPersona === "JURIDICA"
        ? "jurídica"
        : null,
    t.declarante === true
      ? "declarante"
      : t.declarante === false
        ? "no declarante"
        : null,
  ]
    .filter(Boolean)
    .join(", ") || "todos";

/**
 * La ley de retenciones: la UVT de cada año y las vigencias de cada tarifa (plan
 * motor de retenciones, Fase 0, §0.8).
 *
 * **Nunca se edita una vigencia.** Cargar una nueva cierra la abierta el día
 * antes, en la misma transacción, y queda en la bitácora con la norma y quién
 * la validó. Recordatorio del calendario: la UVT del año siguiente sale en
 * noviembre o diciembre; los decretos y los fallos, cuando salgan.
 */
export function RetencionesView() {
  const [dialogo, setDialogo] = useState<
    "uvt" | "ica" | "autorretencion" | { concepto?: string } | null
  >(null);
  const ica = useQuery({
    queryKey: [...CLAVE, "ica"],
    queryFn: plataformaService.leyIca,
  });
  const aciertos = useQuery({
    queryKey: [...CLAVE, "aciertos"],
    queryFn: plataformaService.aciertosRetenciones,
  });
  const especiales = useQuery({
    queryKey: [...CLAVE, "autorretencion"],
    queryFn: plataformaService.autorretenciones,
  });
  const [abierto, setAbierto] = useState<string | null>(null);
  const ley = useQuery({
    queryKey: CLAVE,
    queryFn: plataformaService.leyRetenciones,
  });

  if (ley.isPending) return <EsqueletoPagina />;
  if (ley.isError || !ley.data)
    return (
      <>
        <Encabezado titulo="Retenciones" />
        <ErrorCarga
          que="la ley de retenciones"
          alReintentar={() => void ley.refetch()}
        />
      </>
    );

  const { conceptos, uvt } = ley.data;
  const anioSiguiente = new Date().getFullYear() + 1;
  const faltaSiguiente = !uvt.some((u) => u.anio === anioSiguiente);

  return (
    <>
      <Encabezado
        titulo="Retenciones"
        subtitulo="La ley que usan todas las empresas. Nada se edita: cada cambio es una vigencia nueva, con su norma y quién la validó."
        acciones={<BotonBuscar />}
      />

      {faltaSiguiente && new Date().getMonth() >= 10 && (
        <div className="rounded-xl border border-warning bg-warning/10 p-4 text-sm">
          Falta la UVT del {anioSiguiente}. La DIAN la publica en noviembre o
          diciembre; sin ella, ningún documento de enero calcula retenciones.
        </div>
      )}

      <Tarjeta
        titulo="UVT"
        accion={
          <Button size="sm" variant="outline" onClick={() => setDialogo("uvt")}>
            <Plus /> Cargar un año
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr>
                <Th>Año</Th>
                <Th derecha>Valor</Th>
                <Th>Norma</Th>
                <Th>Validó</Th>
              </tr>
            </thead>
            <tbody>
              {uvt.map((u) => (
                <tr key={u.anio}>
                  <Td>
                    <Mono>{u.anio}</Mono>
                  </Td>
                  <Td derecha>
                    <Mono>{Number(u.valor).toLocaleString("es-CO")}</Mono>
                  </Td>
                  <Td>{u.norma ?? "—"}</Td>
                  <Td>
                    {u.validadoPor ? `${u.validadoPor}, ${u.validadoEn}` : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Tarifas"
        accion={
          <Button size="sm" onClick={() => setDialogo({})}>
            <Plus /> Nueva vigencia
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <Th>Concepto</Th>
                <Th>Vigente hoy</Th>
                <Th>Desde</Th>
                <Th>Norma</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {conceptos.map((c) => (
                <FilaConcepto
                  key={c.codigo}
                  c={c}
                  abierto={abierto === c.codigo}
                  onAbrir={() =>
                    setAbierto(abierto === c.codigo ? null : c.codigo)
                  }
                  onNueva={() => setDialogo({ concepto: c.codigo })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="ICA por municipio"
        accion={
          <Button size="sm" variant="outline" onClick={() => setDialogo("ica")}>
            <Plus /> Cargar un municipio
          </Button>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Cada municipio fija su base, su tarifa y a quién se le retiene. Sin la
          ley de un municipio, la ReteICA de allí no se calcula y se le avisa a
          la empresa.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr>
                <Th>Municipio</Th>
                <Th>Año</Th>
                <Th>Base (UVT)</Th>
                <Th>Tarifa</Th>
                <Th>Acuerdo</Th>
              </tr>
            </thead>
            <tbody>
              {(ica.data ?? []).map((m) => (
                <tr key={`${m.municipio_codigo}-${m.anio}`}>
                  <Td>{m.municipio}</Td>
                  <Td>
                    <Mono>{m.anio}</Mono>
                  </Td>
                  <Td>
                    {m.base_minima_uvt_compras ?? "—"} /{" "}
                    {m.base_minima_uvt_servicios ?? "—"}
                    {m.acumula_en_periodo ? " · acumula" : ""}
                  </Td>
                  <Td>
                    {m.usa_tarifa_por_actividad
                      ? `por actividad (${m.tarifas})`
                      : `${Number(m.tarifa_general_por_mil ?? 0).toLocaleString("es-CO")} ‰`}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {m.acuerdo} · validó {m.validadoPor}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Autorretención especial por actividad"
        accion={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogo("autorretencion")}
          >
            <Plus /> Cargar una tarifa
          </Button>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          La tarifa que se autorretiene sobre todo el ingreso quien tiene la
          responsabilidad 59 en el RUT, según su actividad principal (art.
          1.2.6.8 DUR). Sin la tarifa de su CIIU no se calcula y se le avisa a
          la empresa.
        </p>
        {(especiales.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay ninguna cargada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr>
                  <Th>CIIU</Th>
                  <Th>Tarifa</Th>
                  <Th>Vigencia</Th>
                  <Th>Norma</Th>
                </tr>
              </thead>
              <tbody>
                {(especiales.data ?? []).map((a) => (
                  <tr key={`${a.ciiu}-${a.vigenciaDesde}`}>
                    <Td>
                      <Mono>{a.ciiu}</Mono>
                    </Td>
                    <Td>{pct(Number(a.tarifa))}</Td>
                    <Td>
                      <Mono>
                        {a.vigenciaDesde} → {a.vigenciaHasta ?? "hoy"}
                      </Mono>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {a.norma} · validó {a.validadoPor}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <RecalculoRetenciones />

      <Tarjeta titulo="Aciertos del clasificador · últimos 90 días">
        <p className="mb-3 text-xs text-muted-foreground">
          De todas las empresas: por fuente, cuántas veces se aceptó el concepto
          propuesto tal cual y cuántas se cambió. Si la IA acierta poco, se
          revisa su prompt antes que nada.
        </p>
        <TablaAciertos filas={aciertos.data ?? []} />
      </Tarjeta>

      {dialogo === "uvt" && <DialogoUvt alCerrar={() => setDialogo(null)} />}
      {dialogo === "ica" && <DialogoIca alCerrar={() => setDialogo(null)} />}
      {dialogo === "autorretencion" && (
        <DialogoAutorretencion alCerrar={() => setDialogo(null)} />
      )}
      {dialogo !== null &&
        dialogo !== "uvt" &&
        dialogo !== "ica" &&
        dialogo !== "autorretencion" && (
          <DialogoTarifa
            conceptos={conceptos}
            inicial={dialogo.concepto}
            alCerrar={() => setDialogo(null)}
          />
        )}
    </>
  );
}

function FilaConcepto({
  c,
  abierto,
  onAbrir,
  onNueva,
}: {
  c: ConceptoLeyPlataforma;
  abierto: boolean;
  onAbrir: () => void;
  onNueva: () => void;
}) {
  const f = hoy();
  const vigentes = c.tarifas.filter(
    (t) =>
      t.vigenciaDesde <= f &&
      (t.vigenciaHasta === null || t.vigenciaHasta >= f),
  );
  return (
    <Fragment>
      <tr
        className="cursor-pointer align-top hover:bg-muted/40"
        onClick={onAbrir}
      >
        <Td>
          <span className="flex items-center gap-1.5 font-medium">
            <ChevronDown
              className={`size-3.5 transition-transform ${abierto ? "" : "-rotate-90"}`}
            />
            {c.nombre}
          </span>
          <Mono className="ml-5 text-xs text-muted-foreground">{c.codigo}</Mono>
        </Td>
        <Td>
          {vigentes.length === 0 ? (
            <span className="text-muted-foreground">Sin tarifa vigente</span>
          ) : (
            vigentes.map((t, i) => (
              <span key={i} className="block">
                <Mono>{pct(t.tarifa)}</Mono> desde {Number(t.baseUvt)} UVT ·{" "}
                <span className="text-muted-foreground">{aQuien(t)}</span>
              </span>
            ))
          )}
        </Td>
        <Td>{vigentes[0]?.vigenciaDesde ?? "—"}</Td>
        <Td className="text-xs text-muted-foreground">
          {vigentes[0]?.norma ?? "—"}
        </Td>
        <Td derecha>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onNueva();
            }}
          >
            Nueva
          </Button>
        </Td>
      </tr>
      {abierto && (
        <tr className="bg-muted/20">
          <Td />
          <td className="px-3 py-3" colSpan={4}>
            {c.tarifas.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Sin vigencias cargadas.
              </span>
            ) : (
              <ul className="flex flex-col gap-1.5 text-xs">
                {c.tarifas.map((t, i) => (
                  <li key={i}>
                    <Mono>{pct(t.tarifa)}</Mono> desde {Number(t.baseUvt)} UVT ·{" "}
                    {aQuien(t)} · {t.vigenciaDesde} – {t.vigenciaHasta ?? "hoy"}{" "}
                    · {t.norma} · validó {t.validadoPor}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function DialogoUvt({ alCerrar }: { alCerrar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    anio: String(new Date().getFullYear() + 1),
    valor: "",
    norma: "",
    validadoPor: "",
    validadoEn: hoy(),
  });
  const valido =
    /^\d{4}$/.test(f.anio) &&
    Number(f.valor) > 0 &&
    f.norma.trim().length >= 3 &&
    f.validadoPor.trim().length >= 2;

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.cargarUvt({
        anio: Number(f.anio),
        valor: Number(f.valor),
        norma: f.norma.trim(),
        validadoPor: f.validadoPor.trim(),
        validadoEn: f.validadoEn,
      }),
    onSuccess: async () => {
      aviso.exito(`UVT del ${f.anio} cargada`);
      await qc.invalidateQueries({ queryKey: CLAVE });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Cargar la UVT de un año</DialogTitle>
            <DialogDescription>
              La de un año ya cargado no se cambia: los documentos de ese año se
              calcularon con ella.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          <Campo texto="Año">
            <Input
              inputMode="numeric"
              value={f.anio}
              onChange={(e) => setF({ ...f, anio: e.target.value })}
            />
          </Campo>
          <Campo texto="Valor en pesos">
            <Input
              inputMode="decimal"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
              placeholder="52374"
            />
          </Campo>
          <Campo texto="Norma" ancho>
            <Input
              value={f.norma}
              onChange={(e) => setF({ ...f, norma: e.target.value })}
              placeholder="Resolución DIAN 000xxx de 2026"
            />
          </Campo>
          <Campo texto="Validó (contador)">
            <Input
              value={f.validadoPor}
              onChange={(e) => setF({ ...f, validadoPor: e.target.value })}
            />
          </Campo>
          <Campo texto="Validó el">
            <Input
              type="date"
              value={f.validadoEn}
              onChange={(e) => setF({ ...f, validadoEn: e.target.value })}
            />
          </Campo>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Cargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoTarifa({
  conceptos,
  inicial,
  alCerrar,
}: {
  conceptos: ConceptoLeyPlataforma[];
  inicial?: string;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    conceptoCodigo: inicial ?? conceptos[0]?.codigo ?? "",
    tipoPersona: "",
    declarante: "",
    baseUvt: "",
    tarifaPorcentaje: "",
    vigenciaDesde: hoy(),
    vigenciaHasta: "",
    norma: "",
    observacion: "",
    validadoPor: "",
    validadoEn: hoy(),
  });
  const valido =
    f.conceptoCodigo !== "" &&
    f.baseUvt !== "" &&
    Number(f.baseUvt) >= 0 &&
    f.tarifaPorcentaje !== "" &&
    Number(f.tarifaPorcentaje) >= 0 &&
    Number(f.tarifaPorcentaje) <= 100 &&
    f.norma.trim().length >= 3 &&
    f.validadoPor.trim().length >= 2 &&
    (f.vigenciaHasta === "" || f.vigenciaHasta >= f.vigenciaDesde);

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.nuevaTarifa({
        conceptoCodigo: f.conceptoCodigo,
        ...(f.tipoPersona
          ? { tipoPersona: f.tipoPersona as "NATURAL" | "JURIDICA" }
          : {}),
        ...(f.declarante ? { declarante: f.declarante === "SI" } : {}),
        baseUvt: Number(f.baseUvt),
        tarifaPorcentaje: Number(f.tarifaPorcentaje),
        vigenciaDesde: f.vigenciaDesde,
        ...(f.vigenciaHasta ? { vigenciaHasta: f.vigenciaHasta } : {}),
        norma: f.norma.trim(),
        ...(f.observacion.trim() ? { observacion: f.observacion.trim() } : {}),
        validadoPor: f.validadoPor.trim(),
        validadoEn: f.validadoEn,
      }),
    onSuccess: async (r) => {
      aviso.exito(
        r.cerro
          ? `Vigencia cargada. La anterior quedó cerrada el ${r.cerro.hasta}.`
          : "Vigencia cargada",
      );
      await qc.invalidateQueries({ queryKey: CLAVE });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Nueva vigencia de tarifa</DialogTitle>
            <DialogDescription>
              Cierra la vigente el día antes de que empiece esta. Si la norma
              trae fecha de fin (una suspensión), ponela.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          <Campo texto="Concepto" ancho>
            <select
              className={campo}
              value={f.conceptoCodigo}
              onChange={(e) => setF({ ...f, conceptoCodigo: e.target.value })}
            >
              {conceptos.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo texto="Tipo de persona">
            <select
              className={campo}
              value={f.tipoPersona}
              onChange={(e) => setF({ ...f, tipoPersona: e.target.value })}
            >
              <option value="">Las dos</option>
              <option value="NATURAL">Natural</option>
              <option value="JURIDICA">Jurídica</option>
            </select>
          </Campo>
          <Campo texto="Declarante de renta">
            <select
              className={campo}
              value={f.declarante}
              onChange={(e) => setF({ ...f, declarante: e.target.value })}
            >
              <option value="">Declare o no</option>
              <option value="SI">Declarante</option>
              <option value="NO">No declarante</option>
            </select>
          </Campo>
          <Campo texto="Tarifa (%)">
            <Input
              inputMode="decimal"
              value={f.tarifaPorcentaje}
              onChange={(e) => setF({ ...f, tarifaPorcentaje: e.target.value })}
              placeholder="2.5"
            />
          </Campo>
          <Campo texto="Base mínima (UVT)">
            <Input
              inputMode="decimal"
              value={f.baseUvt}
              onChange={(e) => setF({ ...f, baseUvt: e.target.value })}
              placeholder="10"
            />
          </Campo>
          <Campo texto="Rige desde">
            <Input
              type="date"
              value={f.vigenciaDesde}
              onChange={(e) => setF({ ...f, vigenciaDesde: e.target.value })}
            />
          </Campo>
          <Campo texto="Hasta (opcional)">
            <Input
              type="date"
              value={f.vigenciaHasta}
              onChange={(e) => setF({ ...f, vigenciaHasta: e.target.value })}
            />
          </Campo>
          <Campo texto="Norma" ancho>
            <Input
              value={f.norma}
              onChange={(e) => setF({ ...f, norma: e.target.value })}
              placeholder="Decreto 572 de 2025, art. 1"
            />
          </Campo>
          <Campo texto="Observación (opcional)" ancho>
            <Input
              value={f.observacion}
              onChange={(e) => setF({ ...f, observacion: e.target.value })}
            />
          </Campo>
          <Campo texto="Validó (contador)">
            <Input
              value={f.validadoPor}
              onChange={(e) => setF({ ...f, validadoPor: e.target.value })}
            />
          </Campo>
          <Campo texto="Validó el">
            <Input
              type="date"
              value={f.validadoEn}
              onChange={(e) => setF({ ...f, validadoEn: e.target.value })}
            />
          </Campo>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Cargar vigencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Una vigencia de la autorretención especial de un CIIU. Nunca se edita. */
function DialogoAutorretencion({ alCerrar }: { alCerrar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    ciiu: "",
    tarifa: "",
    vigenciaDesde: hoy(),
    norma: "",
    validadoPor: "",
    validadoEn: hoy(),
  });
  const tarifa = Number(f.tarifa.replace(",", "."));
  const valido =
    /^\d{4,8}$/.test(f.ciiu.trim()) &&
    f.tarifa.trim() !== "" &&
    tarifa >= 0 &&
    tarifa <= 10 &&
    f.norma.trim().length >= 3 &&
    f.validadoPor.trim().length >= 2;

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.nuevaAutorretencion({
        ciiu: f.ciiu.trim(),
        tarifaPorcentaje: tarifa,
        vigenciaDesde: f.vigenciaDesde,
        norma: f.norma.trim(),
        validadoPor: f.validadoPor.trim(),
        validadoEn: f.validadoEn,
      }),
    onSuccess: async () => {
      aviso.exito(`Autorretención del CIIU ${f.ciiu.trim()} cargada`);
      await qc.invalidateQueries({ queryKey: CLAVE });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>
              Cargar una tarifa de autorretención especial
            </DialogTitle>
            <DialogDescription>
              Si el CIIU ya tiene una abierta, se cierra el día antes de la
              nueva.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          <Campo texto="CIIU">
            <Input
              inputMode="numeric"
              value={f.ciiu}
              onChange={(e) => setF({ ...f, ciiu: e.target.value })}
              placeholder="4711"
            />
          </Campo>
          <Campo texto="Tarifa (%)">
            <Input
              inputMode="decimal"
              value={f.tarifa}
              onChange={(e) => setF({ ...f, tarifa: e.target.value })}
              placeholder="0,8"
            />
          </Campo>
          <Campo texto="Desde">
            <Input
              type="date"
              value={f.vigenciaDesde}
              onChange={(e) => setF({ ...f, vigenciaDesde: e.target.value })}
            />
          </Campo>
          <Campo texto="Norma">
            <Input
              value={f.norma}
              onChange={(e) => setF({ ...f, norma: e.target.value })}
              placeholder="Art. 1.2.6.8 DUR"
            />
          </Campo>
          <Campo texto="Validó (contador)">
            <Input
              value={f.validadoPor}
              onChange={(e) => setF({ ...f, validadoPor: e.target.value })}
            />
          </Campo>
          <Campo texto="Validó el">
            <Input
              type="date"
              value={f.validadoEn}
              onChange={(e) => setF({ ...f, validadoEn: e.target.value })}
            />
          </Campo>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Cargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  texto,
  ancho = false,
  children,
}: {
  texto: string;
  ancho?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 text-sm ${ancho ? "sm:col-span-2" : ""}`}
    >
      <span className="font-medium">{texto}</span>
      {children}
    </label>
  );
}

/**
 * La ley de ICA de un municipio para un año. Las tarifas por actividad van una
 * por línea: «código;CIIU;tipo;tarifa;descripción». Se validan contra el rango
 * legal (2–7 ‰ industria, 2–10 ‰ comercio y servicios).
 */
function DialogoIca({ alCerrar }: { alCerrar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    municipioCodigo: "",
    anio: String(new Date().getFullYear()),
    baseCompras: "",
    baseServicios: "",
    tarifaGeneral: "",
    usaTarifaPorActividad: false,
    acumulaEnPeriodo: false,
    periodicidad: "BIMESTRAL",
    acuerdo: "",
    validadoPor: "",
    validadoEn: hoy(),
    tarifas: "",
  });
  const filas = f.tarifas
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .map((l) => {
      const [
        codigoActividad = "",
        ciiu = "",
        tipo = "",
        tarifa = "",
        ...descripcion
      ] = l.split(";").map((x) => x.trim());
      return {
        codigoActividad,
        ...(ciiu ? { ciiu } : {}),
        tipo: tipo.toUpperCase() as
          "INDUSTRIAL" | "COMERCIAL" | "SERVICIOS" | "FINANCIERA",
        tarifaPorMil: Number(tarifa.replace(",", ".")),
        ...(descripcion.length ? { descripcion: descripcion.join(";") } : {}),
      };
    });
  const filasMalas = filas.filter(
    (x) =>
      x.codigoActividad === "" ||
      !["INDUSTRIAL", "COMERCIAL", "SERVICIOS", "FINANCIERA"].includes(
        x.tipo,
      ) ||
      !Number.isFinite(x.tarifaPorMil),
  ).length;
  const valido =
    /^\d{5}$/.test(f.municipioCodigo) &&
    /^\d{4}$/.test(f.anio) &&
    f.acuerdo.trim().length >= 3 &&
    f.validadoPor.trim().length >= 2 &&
    (f.usaTarifaPorActividad || f.tarifaGeneral !== "") &&
    filasMalas === 0;

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.nuevoIcaMunicipio({
        municipioCodigo: f.municipioCodigo,
        anio: Number(f.anio),
        ...(f.baseCompras !== "" && {
          baseMinimaUvtCompras: Number(f.baseCompras),
        }),
        ...(f.baseServicios !== "" && {
          baseMinimaUvtServicios: Number(f.baseServicios),
        }),
        ...(f.tarifaGeneral !== "" && {
          tarifaGeneralPorMil: Number(f.tarifaGeneral.replace(",", ".")),
        }),
        usaTarifaPorActividad: f.usaTarifaPorActividad,
        acumulaEnPeriodo: f.acumulaEnPeriodo,
        periodicidad: f.periodicidad as
          "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "ANUAL",
        acuerdo: f.acuerdo.trim(),
        validadoPor: f.validadoPor.trim(),
        validadoEn: f.validadoEn,
        ...(filas.length > 0 && { tarifas: filas }),
      }),
    onSuccess: async () => {
      aviso.exito("Ley de ICA cargada");
      await qc.invalidateQueries({ queryKey: CLAVE });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Ley de ICA de un municipio</DialogTitle>
            <DialogDescription>
              Para un año. La de un año ya cargado no se cambia: se carga la del
              siguiente.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          <Campo texto="Código DANE del municipio">
            <Input
              inputMode="numeric"
              maxLength={5}
              value={f.municipioCodigo}
              onChange={(e) => setF({ ...f, municipioCodigo: e.target.value })}
              placeholder="05001"
            />
          </Campo>
          <Campo texto="Año">
            <Input
              inputMode="numeric"
              value={f.anio}
              onChange={(e) => setF({ ...f, anio: e.target.value })}
            />
          </Campo>
          <Campo texto="Base mínima compras (UVT)">
            <Input
              inputMode="decimal"
              value={f.baseCompras}
              onChange={(e) => setF({ ...f, baseCompras: e.target.value })}
              placeholder="Vacío: sin base"
            />
          </Campo>
          <Campo texto="Base mínima servicios (UVT)">
            <Input
              inputMode="decimal"
              value={f.baseServicios}
              onChange={(e) => setF({ ...f, baseServicios: e.target.value })}
              placeholder="Vacío: sin base"
            />
          </Campo>
          <Campo texto="Tarifa general (por mil)">
            <Input
              inputMode="decimal"
              value={f.tarifaGeneral}
              onChange={(e) => setF({ ...f, tarifaGeneral: e.target.value })}
              placeholder="2"
            />
          </Campo>
          <Campo texto="Periodicidad">
            <select
              className={campo}
              value={f.periodicidad}
              onChange={(e) => setF({ ...f, periodicidad: e.target.value })}
            >
              <option value="MENSUAL">Mensual</option>
              <option value="BIMESTRAL">Bimestral</option>
              <option value="TRIMESTRAL">Trimestral</option>
              <option value="ANUAL">Anual</option>
            </select>
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={f.usaTarifaPorActividad}
              onChange={(e) =>
                setF({ ...f, usaTarifaPorActividad: e.target.checked })
              }
            />
            La tarifa va por la actividad del proveedor
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={f.acumulaEnPeriodo}
              onChange={(e) =>
                setF({ ...f, acumulaEnPeriodo: e.target.checked })
              }
            />
            Acumula en el período (como Medellín)
          </label>
          <Campo texto="Acuerdo" ancho>
            <Input
              value={f.acuerdo}
              onChange={(e) => setF({ ...f, acuerdo: e.target.value })}
              placeholder="Acuerdo 093 de 2023, arts. 81 y 89"
            />
          </Campo>
          <Campo texto="Tarifas por actividad (opcional)" ancho>
            <textarea
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs"
              value={f.tarifas}
              onChange={(e) => setF({ ...f, tarifas: e.target.value })}
              placeholder={
                "código;CIIU;tipo;tarifa;descripción\n4711;4711;COMERCIAL;7;Comercio al por menor"
              }
            />
            {filasMalas > 0 && (
              <span className="text-xs text-danger">
                {filasMalas === 1
                  ? "Una línea no se entiende"
                  : `${filasMalas} líneas no se entienden`}
                : código;CIIU;tipo;tarifa;descripción.
              </span>
            )}
          </Campo>
          <Campo texto="Validó (contador)">
            <Input
              value={f.validadoPor}
              onChange={(e) => setF({ ...f, validadoPor: e.target.value })}
            />
          </Campo>
          <Campo texto="Validó el">
            <Input
              type="date"
              value={f.validadoEn}
              onChange={(e) => setF({ ...f, validadoEn: e.target.value })}
            />
          </Campo>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Cargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
