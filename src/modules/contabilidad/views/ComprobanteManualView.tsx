"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  FileText,
  Info,
  Loader2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { cn, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import {
  EditorLineas,
  lineaVacia,
  type LineaBorrador,
} from "../components/EditorLineas";
import { aLineasNuevas, problemaDelAsiento } from "../lib/asiento-nuevo";
import { calcularCuadre } from "../lib/cuadre";
import {
  asientosApi,
  comprobantesApi,
  periodosApi,
} from "../services/contabilidad.service";
import {
  CLASES_ACTIVO,
  NOMBRE_PLANTILLA,
  RAMOS_SEGURO,
  type ClaseActivo,
  type DatosPlantilla,
  type Plantilla,
  type PropuestaManual,
  type RamoSeguro,
} from "../types/contabilidad.types";

const DEL_SISTEMA = ["APERTURA", "CIERRE"];
const PLANTILLAS: Plantilla[] = [
  "DEPRECIACION",
  "PRIMA",
  "SEGUROS",
  "INVENTARIO",
];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Lo que se digita en la plantilla, como texto: vacío es «sin llenar». */
interface Campos {
  clase: ClaseActivo | "";
  ramo: RamoSeguro | "";
  costo: string;
  meses: string;
  salarios: string;
  valor: string;
}
const CAMPOS_VACIOS: Campos = {
  clase: "",
  ramo: "",
  costo: "",
  meses: "",
  salarios: "",
  valor: "",
};

const aDatos = (c: Campos): DatosPlantilla => ({
  ...(c.clase !== "" && { clase: c.clase }),
  ...(c.ramo !== "" && { ramo: c.ramo }),
  ...(Number(c.costo) > 0 && { costo: Number(c.costo) }),
  ...(Number(c.meses) > 0 && { meses: Math.trunc(Number(c.meses)) }),
  ...(Number(c.salarios) > 0 && { salarios: Number(c.salarios) }),
  ...(Number(c.valor) > 0 && { valor: Number(c.valor) }),
});

/**
 * El comprobante manual (pantalla 52): para lo que no nace de una factura ni
 * de un pago —depreciaciones, provisiones y ajustes—.
 *
 * María reconoce la plantilla por lo que se le cuenta y propone el asiento con
 * una regla, sin modelo. La persona lo revisa, lo cambia si quiere y lo
 * contabiliza: nunca se asienta solo (PC22). Es un comprobante CD (PC28).
 */
export function ComprobanteManualView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const archivoRef = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState("");
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [campos, setCampos] = useState<Campos>(CAMPOS_VACIOS);
  const [respuesta, setRespuesta] = useState<PropuestaManual | null>(null);

  const [elegido, setElegido] = useState("");
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [glosa, setGlosa] = useState("");
  const [lineas, setLineas] = useState<LineaBorrador[]>([
    lineaVacia(),
    lineaVacia(),
  ]);
  const [soporte, setSoporte] = useState<File | null>(null);

  const { data: comprobantes = [] } = useQuery({
    queryKey: ["comprobantes"],
    queryFn: () => comprobantesApi.listar(),
    staleTime: 60 * 60_000,
  });
  const digitables = comprobantes.filter(
    (c) => !DEL_SISTEMA.includes(c.naturaleza),
  );
  // CD, el comprobante de contabilidad, por defecto (PC28).
  const comprobanteTipoId =
    elegido ||
    digitables.find((c) => c.codigo === "CD")?.id ||
    digitables[0]?.id ||
    "";
  const comprobante = digitables.find((c) => c.id === comprobanteTipoId);
  const siguiente = comprobante
    ? `${comprobante.prefijo}-${String(comprobante.consecutivo + 1).padStart(6, "0")}`
    : "—";

  const [anio, mes] = fecha.split("-").map(Number);
  const { data: periodos = [] } = useQuery({
    queryKey: ["periodos", anio],
    queryFn: () => periodosApi.listar(anio),
    enabled: anio > 2000,
  });
  const periodo = periodos.find((p) => p.mes === mes);

  // Lo que María propone llena las líneas: cada código a la cuenta del plan.
  const pedir = useMutation({
    mutationFn: (p: { plantilla?: Plantilla; texto?: string }) =>
      asientosApi.propuesta({ ...p, fecha, datos: aDatos(campos) }),
    onSuccess: async (r) => {
      setRespuesta(r);
      if (r.plantilla === null) return;
      setPlantilla(r.plantilla);
      if (r.sugerido.clase && campos.clase === "")
        setCampos((c) => ({ ...c, clase: r.sugerido.clase! }));
      const p = r.propuesta;
      if (p === null || p.renglones.length === 0) return;
      const nuevas = await Promise.all(
        p.renglones.map(async (x) => {
          const cuenta =
            x.cuenta === null
              ? null
              : ((
                  await planCuentasApi.listar({
                    q: x.codigo,
                    soloAuxiliares: "true",
                  })
                ).find((c) => c.codigo === x.codigo) ?? null);
          return {
            ...lineaVacia(),
            cuenta,
            detalle: x.detalle,
            debito: x.debito > 0 ? String(x.debito) : "",
            credito: x.credito > 0 ? String(x.credito) : "",
          };
        }),
      );
      setLineas(nuevas);
      setGlosa(p.glosa);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const contabilizar = useMutation({
    mutationFn: async () => {
      const subido =
        soporte === null ? undefined : await asientosApi.subirSoporte(soporte);
      return asientosApi.crear({
        comprobanteTipoId,
        fecha,
        glosa: glosa.trim(),
        lineas: aLineasNuevas(lineas),
        ...(subido && { soporte: subido }),
      });
    },
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ["asientos"] });
      await queryClient.invalidateQueries({ queryKey: ["comprobantes"] });
      aviso.exito(`Comprobante ${r.numero} contabilizado`);
      router.push("/dashboard/contabilidad");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const problema =
    problemaDelAsiento({ comprobanteTipoId, glosa, lineas }) ??
    (periodo?.estado === "CERRADO"
      ? `${MESES[mes - 1]} está cerrado: elegí una fecha de un período abierto.`
      : null);
  const cuadre = calcularCuadre(lineas);
  const propuesta = respuesta?.plantilla ? respuesta.propuesta : null;

  const campo = (k: keyof Campos, etiqueta: string, ayuda?: string) => (
    <Campo id={`p-${k}`} etiqueta={etiqueta} ayuda={ayuda}>
      <Input
        id={`p-${k}`}
        inputMode="numeric"
        value={campos[k]}
        onChange={(e) =>
          setCampos({ ...campos, [k]: e.target.value.replace(/[^\d.]/g, "") })
        }
        className="h-11 rounded-xl px-4 font-mono"
      />
    </Campo>
  );

  return (
    <div className="w-full">
      <header className="mb-8">
        <Link
          href="/dashboard/contabilidad"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Libro
        </Link>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Comprobante manual<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Para lo que no nace de una factura ni de un pago: depreciaciones,
          provisiones y ajustes.
        </p>
      </header>

      <section className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-brand" />
          Contale a María qué querés registrar
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              texto.trim() !== "" &&
              pedir.mutate({ texto })
            }
            placeholder="Depreciación de septiembre de los equipos de cómputo"
            maxLength={500}
            className="h-12 flex-1 rounded-xl px-4"
          />
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={texto.trim() === "" || pedir.isPending}
            onClick={() => pedir.mutate({ texto })}
          >
            {pedir.isPending && <Loader2 className="size-4 animate-spin" />}
            Armar asiento
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Plantillas:</span>
          {PLANTILLAS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={plantilla === p}
              onClick={() => {
                setPlantilla(p);
                setRespuesta(null);
                if (p === "INVENTARIO") pedir.mutate({ plantilla: p });
              }}
              className={cn(
                "rounded-full border px-3 py-1 font-medium transition-colors",
                plantilla === p
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-accent",
              )}
            >
              {NOMBRE_PLANTILLA[p]}
            </button>
          ))}
        </div>

        {respuesta?.plantilla === null && (
          <p className="mt-3 text-sm text-muted-foreground">
            {respuesta.mensaje}
          </p>
        )}

        {plantilla !== null && plantilla !== "INVENTARIO" && (
          <div className="mt-5 grid items-end gap-4 border-t border-border pt-5 sm:grid-cols-4">
            {plantilla === "DEPRECIACION" && (
              <>
                <Campo id="p-clase" etiqueta="Qué se deprecia">
                  <select
                    id="p-clase"
                    value={campos.clase}
                    onChange={(e) =>
                      setCampos({
                        ...campos,
                        clase: e.target.value as ClaseActivo | "",
                      })
                    }
                    className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Elegí…</option>
                    {(Object.keys(CLASES_ACTIVO) as ClaseActivo[]).map((c) => (
                      <option key={c} value={c}>
                        {CLASES_ACTIVO[c]}
                      </option>
                    ))}
                  </select>
                </Campo>
                {campo("costo", "Costo del activo")}
                {campo(
                  "meses",
                  "Vida útil (meses)",
                  "Cómputo 60, oficina 120, vehículos 60",
                )}
              </>
            )}
            {plantilla === "PRIMA" && campo("salarios", "Salarios del mes")}
            {plantilla === "SEGUROS" && (
              <>
                <Campo id="p-ramo" etiqueta="Ramo">
                  <select
                    id="p-ramo"
                    value={campos.ramo}
                    onChange={(e) =>
                      setCampos({
                        ...campos,
                        ramo: e.target.value as RamoSeguro | "",
                      })
                    }
                    className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Elegí…</option>
                    {(Object.keys(RAMOS_SEGURO) as RamoSeguro[]).map((r) => (
                      <option key={r} value={r}>
                        {RAMOS_SEGURO[r]}
                      </option>
                    ))}
                  </select>
                </Campo>
                {campo("valor", "Valor de la póliza")}
                {campo("meses", "Meses de vigencia")}
              </>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              disabled={pedir.isPending}
              onClick={() => pedir.mutate({ plantilla })}
            >
              Proponer
            </Button>
            {respuesta?.plantilla && respuesta.faltan.length > 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-4">
                Faltan: {respuesta.faltan.join(", ")}.
              </p>
            )}
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          {propuesta?.redirigir ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-semibold">{propuesta.redirigir.motivo}</p>
              {propuesta.explicacion.map((x, i) => (
                <p key={i} className="text-muted-foreground">
                  {x}
                </p>
              ))}
              <Button
                className="h-11 w-fit rounded-xl px-5"
                render={<Link href="/dashboard/inventario" />}
              >
                Ir al ajuste de inventario
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* La tarjeta es angosta al lado de la lista previa: el tipo va arriba, a lo ancho. */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="tipo" etiqueta="Tipo" className="sm:col-span-2">
                  <select
                    id="tipo"
                    value={comprobanteTipoId}
                    onChange={(e) => setElegido(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
                  >
                    {digitables.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo id="numero" etiqueta="Número">
                  <div className="flex h-11 items-center rounded-xl bg-muted px-4 font-mono text-sm font-semibold">
                    {siguiente}
                  </div>
                </Campo>
                <Campo id="fecha" etiqueta="Fecha">
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="h-11 rounded-xl px-4"
                  />
                </Campo>
              </div>
              <Campo
                id="glosa"
                etiqueta="Glosa"
                ayuda="Por qué existe este comprobante. Es lo primero que lee quien audita."
              >
                <Input
                  id="glosa"
                  value={glosa}
                  onChange={(e) => setGlosa(e.target.value)}
                  className="h-11 rounded-xl px-4"
                />
              </Campo>

              <EditorLineas lineas={lineas} onCambiar={setLineas} />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <div className="flex items-center gap-2">
                  <input
                    ref={archivoRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
                  />
                  {soporte === null ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl border-dashed px-4"
                      onClick={() => archivoRef.current?.click()}
                    >
                      <Paperclip className="size-4" />
                      Adjuntar soporte
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                      <FileText className="size-4" />
                      {soporte.name}
                      <button
                        type="button"
                        aria-label="Quitar el soporte"
                        onClick={() => {
                          setSoporte(null);
                          if (archivoRef.current) archivoRef.current.value = "";
                        }}
                      >
                        <X className="size-4" />
                      </button>
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  className="h-12 rounded-xl px-6"
                  disabled={problema !== null || contabilizar.isPending}
                  onClick={() => contabilizar.mutate()}
                >
                  {contabilizar.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Contabilizar
                </Button>
              </div>
              <p className="-mt-3 text-right text-sm text-muted-foreground">
                {problema ?? "Listo para contabilizar."}
              </p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          {propuesta && !propuesta.redirigir && (
            <div className="rounded-3xl border border-border bg-card p-5 text-sm shadow-sm">
              <p className="mb-2 font-semibold">Cómo lo calculó María</p>
              <p className="text-muted-foreground">
                {propuesta.explicacion[0]}
              </p>
              {propuesta.explicacion[1] && (
                <p className="mt-2 rounded-xl bg-muted px-3 py-2 font-mono text-xs">
                  {propuesta.explicacion[1]}
                </p>
              )}
              {propuesta.renglones
                .filter((r) => r.problema !== null)
                .map((r) => (
                  <p key={r.codigo} className="mt-2 text-xs text-danger">
                    {r.problema}
                  </p>
                ))}
            </div>
          )}
          <div className="rounded-3xl border border-border bg-card p-5 text-sm shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Antes de contabilizar
            </p>
            <ul className="flex flex-col gap-2">
              <Chequeo bien={lineas.length >= 2 && cuadre.totalDebito > 0 ? cuadre.cuadra : null}>
                Débitos y créditos cuadran
              </Chequeo>
              <Chequeo
                bien={lineas.every(
                  (l) => l.cuenta !== null && l.cuenta.es_auxiliar,
                )}
              >
                Son cuentas de movimiento (auxiliares)
              </Chequeo>
              <Chequeo
                bien={
                  periodo === undefined ? null : periodo.estado === "ABIERTO"
                }
              >
                {periodo?.estado === "CERRADO"
                  ? `${capitalizar(MESES[mes - 1])} está cerrado`
                  : `${capitalizar(MESES[(mes || 1) - 1])} sigue abierto`}
              </Chequeo>
              <Chequeo bien={soporte !== null ? true : null}>
                {soporte !== null
                  ? "Con soporte adjunto"
                  : "Sin soporte adjunto · es opcional, pero tu contador lo agradece"}
              </Chequeo>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Un punto de la lista previa: bien, mal, o solo informativo (`null`). */
function Chequeo({
  bien,
  children,
}: {
  bien: boolean | null;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      {bien === null ? (
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : bien ? (
        <Check className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <X className="mt-0.5 size-4 shrink-0 text-danger" />
      )}
      <span className={cn(bien === false && "text-danger")}>{children}</span>
    </li>
  );
}
