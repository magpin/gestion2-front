"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, TriangleAlert } from "lucide-react";

import { ArbolPlan } from "@/modules/plan-cuentas/components/ArbolPlan";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import { configuracionApi as configuracionInventarioApi } from "@/modules/inventario/services/inventario.service";
import { configuracionCajaApi } from "@/modules/tesoreria/services/tesoreria.service";
import type {
  Bloque as ClaveBloque,
  CuentaSugerida,
} from "@/modules/plan-cuentas/types/plan-cuentas.types";
import type { ClavePaso } from "@/modules/configuracion/types/configuracion.types";
import { useEmbebido } from "../components/ModoEmbebido";
import { AsistenteShell, RUTA_PASO } from "../components/AsistenteShell";
import { Bloque } from "../components/Bloque";
import { AvisoFaltante, EstadoVacio, NotaInformativa } from "../components/Comunes";
import { HechosOperativos } from "../components/HechosOperativos";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useGuardar } from "../hooks/useGuardar";
import styles from "../asistente.module.css";

const CLAVE_SUGERENCIA = ["plan-cuentas", "sugerencia"];
const CLAVE_PLAN = ["plan-cuentas"];

/** Cuántas cuentas se muestran antes de colapsar el resto del bloque. */
const TOPE_VISIBLE = 6;

/** De lo que no depende de nada a lo que depende de una respuesta puntual. */
const ORDEN_BLOQUES: ClaveBloque[] = ["BASE", "PATRIMONIO", "IMPUESTOS", "GIRO", "OPERACION"];

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

/**
 * Paso 4 — el plan de cuentas.
 *
 * No hay plantilla ni "plan típico de comercio". El sistema lee lo que la
 * empresa ya declaró —régimen tributario, actividad CIIU, sedes, tarifa de
 * ICA— y propone las cuentas que se desprenden de esos hechos, cada una
 * diciendo cuál. Lo que no se puede deducir no se inventa: aparece como dato
 * faltante, con el paso que lo resuelve.
 *
 * Todo llega marcado y **nada se crea hasta que la persona confirma**. Por eso
 * el botón de avanzar de este paso no dice «Continuar» sino «Crear las cuentas
 * marcadas y continuar»: confirmar la propuesta *es* la acción del paso, no un
 * trámite previo a irse.
 */
export function PasoPlanCuentas() {
  const router = useRouter();
  const embebido = useEmbebido();
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());
  const [bloquesQuitados, setBloquesQuitados] = useState<Set<ClaveBloque>>(new Set());
  const [expandidos, setExpandidos] = useState<Set<ClaveBloque>>(new Set());

  const { data: estado } = useEstadoConfiguracion();
  const paso = estado?.pasos.find((p) => p.clave === "PLAN_CUENTAS");

  const { data: sugerencia, isLoading } = useQuery({
    queryKey: CLAVE_SUGERENCIA,
    queryFn: planCuentasApi.sugerencia,
    // Bloqueado significa que la situación legal todavía no da para proponer
    // nada. Pedir la sugerencia igual devolvería una lista vacía que se lee
    // como "no hay nada que agregar", que es lo contrario de lo que pasa.
    enabled: paso?.estado !== "BLOQUEADO",
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
      propuestas
        .filter((c) => !descartadas.has(c.codigo) && !bloquesQuitados.has(c.bloque))
        .map((c) => c.codigo),
    [propuestas, descartadas, bloquesQuitados],
  );

  const guardar = useGuardar<string[]>({
    fn: async (codigos) => {
      const creadas = await planCuentasApi.aplicar(codigos);
      // Con el plan creado, tesorería e inventario quedan listos: la caja de
      // cada sede, la caja menor si se declaró y todas las cuentas automáticas
      // asignadas. Si falla —por ejemplo, un rol sin permiso—, el plan ya
      // quedó y cada módulo lo vuelve a intentar al abrirse.
      await Promise.all([
        configuracionCajaApi.preparar().catch(() => undefined),
        configuracionInventarioApi.preparar().catch(() => undefined),
      ]);
      return creadas;
    },
    exito: "Cuentas agregadas al plan",
    invalidar: [
      CLAVE_PLAN,
      CLAVE_SUGERENCIA,
      ["estado-configuracion"],
      ["cajas"],
      ["tesoreria", "configuracion"],
      ["inventario", "configuracion"],
    ],
    // Dentro del chat de IA no se navega: eso sacaba del modo.
    alTerminar: () => {
      if (!embebido) router.push(RUTA_PASO.RESOLUCIONES);
    },
  });

  const alternar = (codigo: string) =>
    setDescartadas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(codigo)) nuevas.delete(codigo);
      else nuevas.add(codigo);
      return nuevas;
    });

  const alternarBloque = (b: ClaveBloque) =>
    setBloquesQuitados((previos) => {
      const nuevos = new Set(previos);
      if (nuevos.has(b)) nuevos.delete(b);
      else nuevos.add(b);
      return nuevos;
    });

  // Llegar acá con el paso bloqueado solo pasa por URL: el recorrido no lo
  // enlaza. Decir por qué y a dónde ir es más útil que un 404.
  if (paso?.estado === "BLOQUEADO") {
    const impuestos = paso.bloqueadoPor === "IMPUESTOS";
    return (
      <AsistenteShell clave="PLAN_CUENTAS" titulo="Plan de cuentas">
        <AvisoFaltante
          accion={{
            texto: impuestos ? "Ir a impuestos" : "Ir a situación legal",
            href: impuestos ? RUTA_PASO.IMPUESTOS : RUTA_PASO.SITUACION_LEGAL,
          }}
        >
          {impuestos
            ? "Todavía no se puede proponer un plan: las cuentas de IVA y de retención se desprenden de lo que contestes en Impuestos."
            : "Todavía no se puede proponer un plan: las cuentas se desprenden de lo que diga el RUT, y la situación legal está sin completar."}
        </AvisoFaltante>
      </AsistenteShell>
    );
  }

  return (
    <AsistenteShell
      clave="PLAN_CUENTAS"
      titulo="Plan de cuentas"
      guardando={guardar.isPending}
      etiquetaContinuar={
        elegidas.length > 0
          ? `Crear ${elegidas.length} cuenta${elegidas.length === 1 ? "" : "s"} y continuar`
          : undefined
      }
      alContinuar={
        elegidas.length > 0 ? () => guardar.mutate(elegidas) : undefined
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          {/* Va antes que la propuesta porque la cambia: responder que hay
              empleados suma cuentas ahí abajo, y verlas aparecer es lo que
              explica para qué sirvió la pregunta. */}
          <HechosOperativos />

          {/* Lo que no se pudo deducir, y por qué. Resolverlo cambia la
              sugerencia entera, así que atenderlo después obliga a rehacer. */}
          {(sugerencia?.faltantes ?? []).map((f) => (
            <AvisoFaltante
              key={f.hecho}
              accion={{
                texto: `Ir a ${
                  f.paso === "SITUACION_LEGAL"
                    ? "situación legal"
                    : f.paso === "IMPUESTOS"
                      ? "impuestos"
                      : "resolverlo"
                }`,
                href: RUTA_PASO[f.paso as ClavePaso],
              }}
            >
              {f.impide}
            </AvisoFaltante>
          ))}

          {propuestas.length > 0 && (
            <>
              <NotaInformativa>
                No se crea ninguna cuenta hasta que confirmes. En contabilidad, borrar una cuenta
                con movimiento no es una opción.
              </NotaInformativa>

              {/* Agrupadas por origen y no en una lista de cuarenta y cinco: así
                  se ve de dónde sale cada grupo, y descartar uno entero —"no
                  tengo empleados"— deja de ser cliquear quince veces. */}
              {ORDEN_BLOQUES.filter((b) => porBloque[b].length > 0).map((b) => {
                const quitado = bloquesQuitados.has(b);
                const cuentas = porBloque[b];
                const expandido = expandidos.has(b) || cuentas.length <= TOPE_VISIBLE;
                const visibles = expandido ? cuentas : cuentas.slice(0, TOPE_VISIBLE);

                return (
                  <div key={b} className={`${styles.up} ${quitado ? "opacity-55" : ""}`}>
                    <Bloque
                      titulo={NOMBRE_BLOQUE[b]}
                      etiqueta={b.toLowerCase()}
                      accion={
                        <button
                          type="button"
                          onClick={() => alternarBloque(b)}
                          className="text-[13px] font-medium text-brand-text hover:text-brand-hover"
                        >
                          {quitado ? "Volver a incluir" : "Quitar bloque"}
                        </button>
                      }
                    >
                      <p className="m-0 -mt-1 text-[13px] text-muted-foreground">
                        <span className="font-medium text-foreground">Porque:</span>{" "}
                        {MOTIVO_BLOQUE[b]}
                      </p>

                      {!quitado && (
                        <>
                          <ul className="m-0 flex list-none flex-col divide-y divide-secondary p-0">
                            {visibles.map((c) => (
                              <FilaSugerida
                                key={c.codigo}
                                cuenta={c}
                                elegida={!descartadas.has(c.codigo)}
                                onAlternar={() => alternar(c.codigo)}
                              />
                            ))}
                          </ul>
                          {!expandido && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandidos((p) => new Set(p).add(b))
                              }
                              className="self-start text-[13px] font-medium text-brand-text hover:text-brand-hover"
                            >
                              Ver todas las cuentas del bloque ({cuentas.length})
                            </button>
                          )}
                        </>
                      )}
                    </Bloque>
                  </div>
                );
              })}
            </>
          )}

          {propuestas.length === 0 && (sugerencia?.faltantes.length ?? 0) === 0 && (
            <EstadoVacio
              titulo="No queda nada por proponer"
              ayuda="Tu plan ya cubre lo que se desprende de los datos de la empresa."
            />
          )}

          {/* La sugerencia cubre lo que se desprende de los datos de la empresa.
              Lo que falte se agrega del catálogo, y eso vive en su propia
              pantalla: acá el foco es confirmar lo propuesto. */}
          <p className="m-0 text-xs text-muted-foreground">
            ¿Te falta alguna?{" "}
            <Link
              href="/dashboard/plan-cuentas"
              className="text-brand-text underline underline-offset-2 hover:text-brand-hover"
            >
              Buscala en el catálogo del Decreto 2650
            </Link>
            .
          </p>

          <Bloque
            titulo="Plan actual"
            descripcion={`${plan.length} cuenta${plan.length === 1 ? "" : "s"} creadas`}
          >
            {plan.length === 0 ? (
              <EstadoVacio
                titulo="El plan todavía está vacío"
                ayuda="Las cuentas que confirmes arriba aparecerán acá."
              />
            ) : (
              /* El mismo árbol de /dashboard/plan-cuentas, de solo lectura: dos
                 pantallas mostrando lo mismo de dos formas distintas hacían
                 parecer que los auxiliares no colgaban de su cuenta madre.

                 Con tope: son decenas de cuentas y creciendo, y es material de
                 consulta, no lo que hay que resolver en este paso. */
              <div className="max-h-96 overflow-y-auto overscroll-contain rounded-lg border border-border p-1">
                <ArbolPlan cuentas={plan} />
              </div>
            )}
          </Bloque>
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
        className={`flex w-full items-start gap-3 py-2.5 text-left transition-colors ${
          elegida ? "" : "opacity-55"
        }`}
      >
        <span
          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
            elegida ? "border-primary bg-primary text-primary-foreground" : "border-input"
          }`}
        >
          {elegida && <Check className="size-3" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
              {cuenta.codigo}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{cuenta.nombre}</span>
          </span>

          {/* El motivo va sangrado bajo el nombre y en gris: es la razón por la
              que la cuenta está ahí, no compite con ella. Sin él la lista sería
              un plan sembrado a ciegas más. */}
          <span className="mt-0.5 block pl-26 text-xs text-muted-foreground">
            {cuenta.porque}
          </span>
        </span>

        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {cuenta.requiereEleccion && <Etiqueta tono="aviso">elegí la subcuenta</Etiqueta>}
          {cuenta.exigeTercero && <Etiqueta>tercero</Etiqueta>}
          {/* El decreto deja libre este tramo: el número es propuesta, no norma. */}
          {cuenta.sugerido && <Etiqueta>{cuenta.rango ?? "numeración libre"}</Etiqueta>}
        </span>
      </button>
    </li>
  );
}

function Etiqueta({ children, tono }: { children: React.ReactNode; tono?: "aviso" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] whitespace-nowrap text-muted-foreground">
      {/* El color va en el ícono y no en el texto: `warning` da 4.2:1 sobre
          blanco y el reglamento pide 4.5:1 para texto normal. Como elemento
          gráfico el umbral es 3:1 y pasa de sobra. */}
      {tono === "aviso" && <TriangleAlert className="size-2.5 shrink-0 text-warning" />}
      {children}
    </span>
  );
}
