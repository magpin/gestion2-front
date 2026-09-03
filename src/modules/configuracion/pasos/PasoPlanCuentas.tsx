"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ArbolPlan } from "@/modules/plan-cuentas/components/ArbolPlan";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import type {
  Bloque as ClaveBloque,
  CuentaSugerida,
} from "@/modules/plan-cuentas/types/plan-cuentas.types";
import type { ClavePaso } from "@/modules/configuracion/types/configuracion.types";
import { AsistenteShell, RUTA_PASO } from "../components/AsistenteShell";
import { Bloque } from "../components/Bloque";
import { HechosOperativos } from "../components/HechosOperativos";
import { useGuardar } from "../hooks/useGuardar";

const CLAVE_SUGERENCIA = ["plan-cuentas", "sugerencia"];

/** De lo que no depende de nada a lo que depende de una respuesta puntual. */
const ORDEN_BLOQUES: ClaveBloque[] = [
  "BASE",
  "PATRIMONIO",
  "IMPUESTOS",
  "GIRO",
  "OPERACION",
];

const NOMBRE_BLOQUE: Record<ClaveBloque, string> = {
  BASE: "Lo que usa toda contabilidad",
  PATRIMONIO: "Patrimonio",
  IMPUESTOS: "Impuestos",
  GIRO: "Tu giro",
  OPERACION: "Tu operación",
};

const MOTIVO_BLOQUE: Record<ClaveBloque, string> = {
  BASE: "Efectivo, cartera, proveedores y los gastos que aparecen todos los meses. No dependen de ningún documento.",
  PATRIMONIO:
    "Sale de la forma jurídica: una persona natural no emite acciones ni constituye reserva legal.",
  IMPUESTOS:
    "Sale de la casilla 53 del RUT. Si no sos responsable de IVA, acá no hay cuentas de IVA.",
  GIRO: "Sale del sector marcado y de la actividad CIIU: qué vendés y con qué lo producís.",
  OPERACION:
    "Sale de lo que declaraste sobre tu operación: empleados, activos, crédito, caja menor.",
};
const CLAVE_PLAN = ["plan-cuentas"];

/**
 * Paso 4 — el plan de cuentas.
 *
 * No hay plantilla ni "plan típico de comercio". El sistema lee lo que la
 * empresa ya declaró —régimen tributario, actividad CIIU, sedes, tarifa de
 * ICA— y propone las cuentas que se desprenden de esos hechos, cada una
 * diciendo cuál. Lo que no se puede deducir no se inventa: aparece como dato
 * faltante, con el paso que lo resuelve.
 *
 * Todo llega marcado y nada se crea hasta que la persona confirma. Un plan
 * sembrado a ciegas obliga después a borrar la mitad, y en contabilidad borrar
 * cuentas con movimiento no es una opción.
 */
export function PasoPlanCuentas() {
  const router = useRouter();
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());

  const { data: sugerencia, isLoading } = useQuery({
    queryKey: CLAVE_SUGERENCIA,
    queryFn: planCuentasApi.sugerencia,
  });

  const { data: plan = [] } = useQuery({
    queryKey: CLAVE_PLAN,
    queryFn: () => planCuentasApi.listar(),
  });

  // `?? []` crea un arreglo nuevo en cada render, así que memorizarlo evita que
  // `elegidas` se recalcule sin que haya cambiado nada.
  const propuestas = useMemo(() => sugerencia?.cuentas ?? [], [sugerencia]);

  const porBloque = useMemo(() => {
    const grupos: Record<ClaveBloque, CuentaSugerida[]> = {
      BASE: [],
      PATRIMONIO: [],
      IMPUESTOS: [],
      GIRO: [],
      OPERACION: [],
    };
    for (const c of propuestas) grupos[c.bloque]?.push(c);
    return grupos;
  }, [propuestas]);
  const elegidas = useMemo(
    () =>
      propuestas.filter((c) => !descartadas.has(c.codigo)).map((c) => c.codigo),
    [propuestas, descartadas],
  );

  const guardar = useGuardar<string[]>({
    fn: (codigos) => planCuentasApi.aplicar(codigos),
    exito: "Cuentas agregadas al plan",
    invalidar: [CLAVE_PLAN, CLAVE_SUGERENCIA],
  });

  const alternar = (codigo: string) =>
    setDescartadas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(codigo)) nuevas.delete(codigo);
      else nuevas.add(codigo);
      return nuevas;
    });

  return (
    <AsistenteShell clave="PLAN_CUENTAS" titulo="Plan de cuentas">
      {isLoading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Va antes que la propuesta porque la cambia: responder que hay
              empleados suma quince cuentas ahí abajo, y verlo aparecer es lo que
              explica para qué sirvió la pregunta. */}
          <HechosOperativos />

          {/* Lo que no se pudo deducir, y por qué. Resolverlo cambia la
              sugerencia entera, así que atenderlo después obliga a rehacer. */}
          {(sugerencia?.faltantes ?? []).map((f) => (
            <div
              key={f.hecho}
              className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Falta {f.etiqueta.toLowerCase()}</p>
                <p className="text-muted-foreground">{f.impide}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(RUTA_PASO[f.paso as ClavePaso])}
              >
                Cargarlo
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          ))}

          {propuestas.length > 0 && (
            <section className="flex flex-col gap-8">
              {/* Agrupadas por origen y no en una lista de cuarenta y cinco: así
                  se ve de dónde sale cada grupo, y descartar uno entero —"no
                  tengo empleados"— deja de ser cliquear quince veces. */}
              {ORDEN_BLOQUES.filter((b) => porBloque[b].length > 0).map((b) => (
                <Bloque
                  key={b}
                  titulo={NOMBRE_BLOQUE[b]}
                  descripcion={MOTIVO_BLOQUE[b]}
                  accion={
                    <span className="font-mono text-xs text-muted-foreground">
                      {porBloque[b].length}
                    </span>
                  }
                >
                  {/* Una lista con separadores y no una tarjeta con borde por
                      cuenta: quince bordes compiten entre sí y ninguno destaca.

                      El scroll lo lleva el cuerpo del paso, no cada bloque:
                      scrolls anidados hacen que la rueda mueva algo distinto
                      según dónde esté el puntero. */}
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {porBloque[b].map((c) => (
                      <FilaSugerida
                        key={c.codigo}
                        cuenta={c}
                        elegida={!descartadas.has(c.codigo)}
                        onAlternar={() => alternar(c.codigo)}
                      />
                    ))}
                  </ul>
                </Bloque>
              ))}

              <div className="flex items-center gap-3 border-t border-border pt-6">
                <Button
                  onClick={() => guardar.mutate(elegidas)}
                  disabled={elegidas.length === 0 || guardar.isPending}
                >
                  {guardar.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Agregar {elegidas.length} cuenta
                  {elegidas.length === 1 ? "" : "s"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {descartadas.size > 0 &&
                    `${descartadas.size} descartada${descartadas.size === 1 ? "" : "s"}`}
                </span>
              </div>
            </section>
          )}

          {propuestas.length === 0 &&
            (sugerencia?.faltantes.length ?? 0) === 0 && (
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                No queda nada por proponer: tu plan ya cubre lo que se desprende
                de los datos de la empresa. Podés agregar cuentas propias desde
                Plan de cuentas.
              </p>
            )}

          {/* La sugerencia cubre lo que se desprende de los datos de la empresa.
              Lo que falte se agrega del catálogo, y eso vive en su propia
              pantalla: acá el foco es confirmar lo propuesto. */}
          <p className="text-xs text-muted-foreground">
            ¿Te falta alguna?{" "}
            <Link
              href="/dashboard/plan-cuentas"
              className="underline underline-offset-2"
            >
              Buscala en el catálogo del Decreto 2650
            </Link>
            .
          </p>

          {plan.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">
                Tu plan ·{" "}
                <span className="text-brand-text">
                  {plan.length} cuenta{plan.length === 1 ? "" : "s"}
                </span>
              </h2>
              {/* El mismo árbol de /dashboard/plan-cuentas, de solo lectura: dos
                  pantallas mostrando lo mismo de dos formas distintas hacían
                  parecer que los auxiliares no colgaban de su cuenta madre.

                  Con tope: son treinta y tres cuentas y creciendo, y es material
                  de consulta, no lo que hay que resolver en este paso. */}
              <div className="max-h-96 overflow-y-auto overscroll-contain rounded-xl border border-border p-1">
                <ArbolPlan cuentas={plan} />
              </div>
            </section>
          )}
        </div>
      )}
    </AsistenteShell>
  );
}

function FilaSugerida({
  cuenta,
  elegida,
  onAlternar,
}: {
  cuenta: CuentaSugerida;
  elegida: boolean;
  onAlternar: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onAlternar}
        aria-pressed={elegida}
        className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent ${
          elegida ? "" : "opacity-55"
        }`}
      >
        <span
          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
            elegida
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border"
          }`}
        >
          {elegida && <Check className="size-3" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
              {cuenta.codigo}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {cuenta.nombre}
            </span>
          </span>

          {/* El motivo va sangrado bajo el nombre y en gris: es la razón por la
              que la cuenta está ahí, no compite con ella. Sin él la lista sería
              un plan sembrado a ciegas más. */}
          <span className="mt-0.5 block pl-26 text-xs text-muted-foreground">
            {cuenta.porque}
          </span>
        </span>

        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {cuenta.requiereEleccion && (
            <Etiqueta tono="aviso">elegí la subcuenta</Etiqueta>
          )}
          {cuenta.exigeTercero && <Etiqueta>tercero</Etiqueta>}
          {/* El decreto deja libre este tramo: el número es propuesta, no norma. */}
          {cuenta.sugerido && (
            <Etiqueta>{cuenta.rango ?? "numeración libre"}</Etiqueta>
          )}
        </span>
      </button>
    </li>
  );
}

function Etiqueta({
  children,
  tono,
}: {
  children: React.ReactNode;
  tono?: "aviso";
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {/* El color va en el icono y no en el texto: `warning` (#B26A00) da 4.2:1
          sobre blanco y el reglamento pide 4.5:1 para texto normal. Como
          elemento gráfico el umbral es 3:1 y pasa de sobra. */}
      {tono === "aviso" && (
        <AlertTriangle className="size-2.5 shrink-0 text-warning" />
      )}
      {children}
    </span>
  );
}
