"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Destello } from "@/modules/landing/components/Marca";
import { useAuthStore } from "@/core/store/authStore";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useDisponible } from "../hooks/useModoIa";
import type { ClavePaso } from "../types/configuracion.types";
import { configuracionService } from "../services/configuracion.service";
import { useEmbebido } from "./ModoEmbebido";
import { Recorrido } from "./Recorrido";
import { RUTA_PASO } from "./rutas";
import styles from "../asistente.module.css";

export { RUTA_PASO };

/**
 * Dónde vive el modo IA: **dentro de la configuración** (`/configuracion/ia`),
 * con el mismo riel de pasos. Antes llevaba al chat de María, y la configuración
 * se terminaba fuera de su propia pantalla.
 */
export const RUTA_MODO_IA = "/configuracion/ia";

/**
 * Una línea por paso, para el encabezado.
 *
 * Dice qué se resuelve ahí, no qué campos tiene. Quien configura no viene a
 * "llenar la situación legal": viene a dejar registrado lo que dice su RUT.
 */
const DESCRIPCION: Record<ClavePaso, string> = {
  EMPRESA: "Cómo se identifica y con qué políticas lleva su contabilidad.",
  SEDES: "Dónde opera. El municipio de la principal define la tarifa de ICA.",
  SITUACION_LEGAL: "Lo que dice el RUT: responsabilidades, representante y actividad.",
  PLAN_CUENTAS: "Las cuentas que se desprenden de lo que ya declaraste.",
  RESOLUCIONES: "La numeración que la DIAN autorizó para facturar.",
};

interface Props {
  clave: ClavePaso;
  titulo: string;
  children: ReactNode;
  /**
   * Qué hace el botón principal. Solo lo pasan los pasos que necesitan guardar
   * antes de avanzar; el resto avanza solo. Cada paso escribiendo a mano cuál es
   * el siguiente es lo que hacía que situación legal saltara el plan de cuentas.
   */
  alContinuar?: () => void;
  guardando?: boolean;
  /**
   * Solo para el plan de cuentas, que dice «Crear las cuentas marcadas y
   * continuar»: ahí confirmar la propuesta *es* la acción del paso. En los
   * demás, la etiqueta la decide si el paso está completo.
   */
  etiquetaContinuar?: string;
}

/**
 * El armazón del asistente: el recorrido a la izquierda, el paso a la derecha.
 *
 * Tres cosas que no cambian, y conviene que no cambien:
 *
 * - **Alto fijo, scroll solo en el cuerpo.** Una tarjeta que crece con el
 *   contenido empuja los botones fuera de la vista y obliga a bajar toda la
 *   página para encontrarlos, que es lo contrario de lo que hace un asistente.
 * - **Un solo ancho** para los cinco pasos. Si cambia entre pasos, parece que
 *   cambió la pantalla y no el contenido.
 * - **El destino lo decide el armazón**, saltando bloqueados. Cuando cada paso
 *   escribía a mano cuál era el siguiente, situación legal se saltaba el plan
 *   de cuentas.
 */
export function AsistenteShell({
  clave,
  titulo,
  children,
  alContinuar,
  guardando,
  etiquetaContinuar,
}: Props) {
  const router = useRouter();
  const { data, isLoading } = useEstadoConfiguracion();
  const empresas = useAuthStore((s) => s.empresas);
  const empresaId = useAuthStore((s) => s.empresaId);
  const empresa = empresas.find((e) => e.id === empresaId);
  const embebido = useEmbebido();

  // Quien eligió IA no entra a los pasos sueltos hasta terminar: salir del modo
  // y volver era lo que lo metía en un bucle.
  const enIa = data?.modo === "IA" && !data.completa;
  useEffect(() => {
    if (!embebido && enIa) router.replace(RUTA_MODO_IA);
  }, [embebido, enIa, router]);

  if (embebido) {
    return (
      <div className="flex flex-col gap-6">
        {children}
        {alContinuar !== undefined && (
          <button
            type="button"
            onClick={alContinuar}
            disabled={guardando}
            className="flex h-11 w-fit items-center gap-2.5 rounded-[0.6rem] bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {guardando && <Loader2 className="size-4 animate-spin" />}
            {etiquetaContinuar ?? "Guardar"}
          </button>
        )}
      </div>
    );
  }

  if (isLoading || !data || enIa) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const indice = data.pasos.findIndex((p) => p.clave === clave);
  const paso = data.pasos[indice];
  const anterior = data.pasos[indice - 1];

  // El siguiente al que se puede entrar. Un paso bloqueado se saltea —entrar a
  // uno que exige otro antes no lleva a ninguna parte— y si no queda ninguno, la
  // configuración terminó.
  const siguiente = data.pasos.slice(indice + 1).find((p) => p.estado !== "BLOQUEADO");
  const completo = paso?.estado === "LISTO";

  const avanzar = () =>
    // Sin pasos por delante: si quedó completa, al Inicio; si no, la lista
    // manda al que falta.
    router.push(
      siguiente ? RUTA_PASO[siguiente.clave] : data.completa ? "/dashboard" : "/configuracion/lista",
    );

  // «Omitir» cuando el paso no está completo y «Continuar» cuando sí. Es el
  // mismo botón: ofrecer los dos obligaría a elegir entre dos cosas que llevan
  // al mismo lado, y la diferencia real —si queda algo pendiente— ya la sabe el
  // backend.
  const etiqueta = etiquetaContinuar ?? (completo ? "Continuar" : "Omitir");

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div
        className={`${styles.sombraTarjeta} mx-auto flex h-full max-h-[calc(100dvh-64px)] w-full max-w-[1240px] overflow-hidden rounded-[1.05rem] border border-border bg-card`}
      >
        <Recorrido
          pasos={data.pasos}
          actual={clave}
          completados={data.completados}
          porcentaje={data.porcentaje}
          razonSocial={empresa?.razonSocial ?? "Tu empresa"}
        />

        <section className="flex min-w-0 grow flex-col">
          <BarraSuperior indice={indice} total={data.pasos.length} />

          {/* La única región que scrollea. `overscroll-contain` evita que al
              llegar al final la rueda siga moviendo lo de atrás. */}
          <div className="flex min-h-0 grow flex-col gap-8 overflow-y-auto overscroll-contain px-6 py-9 sm:px-10">
            <div className={`${styles.up} flex flex-col gap-2`}>
              <h1 className="m-0 font-serif text-[clamp(2rem,4vw,2.75rem)] leading-none tracking-[-0.8px]">
                {titulo}
              </h1>
              <p className="m-0 text-[15px] text-muted-foreground">{DESCRIPCION[clave]}</p>
            </div>
            <div className={`${styles.up} ${styles.d1}`}>{children}</div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border px-6 py-4.5 sm:px-10">
            <div className="flex min-w-0 flex-col gap-1">
              {anterior ? (
                <Link
                  href={RUTA_PASO[anterior.clave]}
                  className="flex items-center gap-1.5 text-[13px] text-muted-foreground no-underline hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Atrás
                </Link>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  {siguiente ? `Siguiente: ${siguiente.nombre}` : "Último paso"}
                </span>
              )}

              {/* Lo que conviene pero no bloquea. Va con los botones y no en el
                  cuerpo: es contexto del paso entero, no una fila más de la
                  lista que se está mirando. */}
              {paso !== undefined &&
                paso.opcionales.map((o) => (
                  <span
                    key={o.campo + o.etiqueta}
                    className="flex items-start gap-1.5 text-xs text-muted-foreground"
                  >
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    <span>
                      Opcional: {o.etiqueta}
                      {o.detalle && <span className="block">{o.detalle}</span>}
                    </span>
                  </span>
                ))}
            </div>

            <button
              type="button"
              onClick={alContinuar ?? avanzar}
              disabled={guardando}
              className={`flex h-11 shrink-0 items-center gap-2.5 rounded-[0.6rem] px-5 text-sm font-medium transition-colors disabled:opacity-60 ${
                completo || etiquetaContinuar
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {guardando && <Loader2 className="size-4 animate-spin" />}
              {etiqueta}
              <ArrowRight className="size-[15px]" />
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}

/**
 * La barra del panel derecho: dónde estoy y cómo salgo del modo manual.
 *
 * Cambiar de modo no pierde nada —lo guardado ya está en el backend— y por eso
 * el atajo está siempre visible en vez de esconderse en la bienvenida.
 */
function BarraSuperior({ indice, total }: { indice: number; total: number }) {
  // `undefined` mientras se pregunta: la píldora no aparece y después entra, en
  // vez de aparecer y desaparecer si el modo no estuviera disponible.
  const { data: modoIa } = useDisponible();
  const router = useRouter();

  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 sm:px-10">
      <span className="font-mono text-xs text-muted-foreground">
        Paso {indice + 1} de {total}
      </span>
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="hidden sm:inline">Modo manual</span>
        {modoIa === true && (
          // Sin `?volver=`: lo llevaba y nadie lo leía nunca del otro lado. Un
          // parámetro que no hace nada promete un regreso que no existe. Del
          // modo IA se vuelve por «Pasar a manual», que está en su pantalla.
          // Pasar a IA queda elegido: desde ahí se termina en IA.
          <button
            type="button"
            onClick={() => {
              void configuracionService
                .elegirModo("IA")
                .catch(() => undefined)
                .then(() => router.push(RUTA_MODO_IA));
            }}
            className="flex h-[34px] items-center gap-2 rounded-full border border-border px-3 font-medium text-foreground hover:bg-secondary"
          >
            <Destello size={13} className="text-brand" />
            Llenar con IA
          </button>
        )}
      </div>
    </div>
  );
}
