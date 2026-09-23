"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { BurbujaLectura } from "@/modules/asistente/components/BurbujaLectura";
import { Turno } from "@/modules/asistente/components/Mensajes";
import {
  TarjetaConfirmado,
  TarjetaDocumentos,
  TarjetaExtraido,
  TarjetaFalla,
} from "@/modules/asistente/components/Tarjetas";
import {
  CLAVE_DOCUMENTOS,
  mensajeDeError,
  useConfirmar,
  useDetener,
  useDocumentos,
  useSubirDocumento,
} from "@/modules/asistente/hooks/useAsistente";
import { useProgreso } from "@/modules/asistente/hooks/useProgreso";
import { aplicarEvento, type LecturasEnVivo } from "@/modules/asistente/lib/lecturaEnVivo";
import {
  NOMBRE_DOCUMENTO,
  TIPOS_ACEPTADOS,
  type ResultadoConfirmacion,
  type TipoDocumento,
} from "@/modules/asistente/types/asistente.types";
import { Recorrido } from "../components/Recorrido";
import { RUTA_PASO } from "../components/rutas";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { useDisponible } from "../hooks/useModoIa";
import styles from "../asistente.module.css";

/**
 * El modo IA del asistente de configuración (prototipos `IA`, `IAPensando` y
 * `Completa` de `docs/prototipos_asistente/`). **Vive dentro de la
 * configuración**, no en el chat: el riel de los cinco pasos a la izquierda,
 * que se va llenando, y a la derecha los documentos, lo que María leyó y lo que
 * los papeles no dicen.
 *
 * Nada de esto es nuevo por dentro: subir, leer en vivo y confirmar son las
 * mismas piezas del chat. Lo nuevo es el cierre: lo que ningún documento trae
 * —la tarifa de ICA, el plan de cuentas— queda listado con un botón que abre ese
 * paso, y cuando el último queda listo se entra al Inicio.
 */
export function ModoIaView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: estado, isLoading } = useEstadoConfiguracion();
  const { data: disponible } = useDisponible();
  const { data: documentos = [] } = useDocumentos();
  const subir = useSubirDocumento();
  const confirmar = useConfirmar();
  const detener = useDetener();
  const empresas = useAuthStore((s) => s.empresas);
  const empresaId = useAuthStore((s) => s.empresaId);
  const empresa = empresas.find((e) => e.id === empresaId);

  const [confirmaciones, setConfirmaciones] = useState<
    Array<{ id: string; resultado: ResultadoConfirmacion }>
  >([]);
  const [lecturas, setLecturas] = useState<LecturasEnVivo>({});
  const [ahora, setAhora] = useState(() => Date.now());
  const cuerpo = useRef<HTMLDivElement>(null);

  const enCurso = documentos.filter((d) => d.estado === "EN_COLA" || d.estado === "LEYENDO");
  const leyendo = enCurso.length > 0;

  useEffect(() => {
    if (!leyendo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, [leyendo]);

  const conectado = useProgreso(
    disponible === true,
    useCallback(
      (evento) => {
        if (evento.etapa === "LOTE") return;
        setLecturas((previas) => aplicarEvento(previas, evento));
        void queryClient.invalidateQueries({ queryKey: CLAVE_DOCUMENTOS });
      },
      [queryClient],
    ),
  );

  // Terminado todo, al Inicio: es lo que se pidió, no una pantalla más que
  // felicita y obliga a un clic.
  const completa = estado?.completa === true;
  useEffect(() => {
    if (!completa) return;
    aviso.exito("Tu empresa quedó lista", "Los cinco pasos están completos.");
    router.replace("/dashboard");
  }, [completa, router]);

  useEffect(() => {
    const el = cuerpo.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [documentos.length, confirmaciones.length, leyendo]);

  const alSubir = (tipo: TipoDocumento, archivo: File) => {
    if (!(TIPOS_ACEPTADOS as readonly string[]).includes(archivo.type)) {
      aviso.error("Ese archivo no se puede leer", "Subí un PDF o una foto (JPG, PNG o WEBP).");
      return;
    }
    subir.mutate(
      { tipo, archivo },
      { onError: (error) => aviso.error("No se pudo subir el documento", mensajeDeError(error)) },
    );
  };

  const alConfirmar = (id: string) => {
    confirmar.mutate(
      { id },
      {
        onSuccess: (resultado) => setConfirmaciones((p) => [...p, { id, resultado }]),
        onError: (error) => aviso.error("No se pudo guardar", mensajeDeError(error)),
      },
    );
  };

  if (isLoading || !estado) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const confirmados = new Set(confirmaciones.map((c) => c.id));
  const pendientes = estado.pasos.filter((p) => p.estado !== "LISTO");
  const leidos = documentos.filter((d) => d.estado === "LEIDO" || d.estado === "FALLO");

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div
        className={`${styles.sombraTarjeta} mx-auto flex h-full max-h-[calc(100dvh-64px)] w-full max-w-[1240px] overflow-hidden rounded-[1.05rem] border border-border bg-card`}
      >
        <Recorrido
          pasos={estado.pasos}
          actual={estado.siguiente}
          completados={estado.completados}
          porcentaje={estado.porcentaje}
          razonSocial={empresa?.razonSocial ?? "Tu empresa"}
          modoIA
        />

        <section className="flex min-w-0 grow flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-6 sm:px-10">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">Asistente de configuración</span>
              <span className="truncate text-xs text-muted-foreground" aria-live="polite">
                {leyendo ? "Leyendo tus documentos…" : "Nada se guarda sin tu confirmación"}
              </span>
            </div>
            <Link
              href={estado.siguiente ? RUTA_PASO[estado.siguiente] : RUTA_PASO.EMPRESA}
              className="flex h-[34px] shrink-0 items-center rounded-full border border-border px-3 text-[13px] font-medium text-foreground no-underline hover:bg-muted"
            >
              Pasar a manual
            </Link>
          </div>

          <div
            ref={cuerpo}
            className="flex min-h-0 grow flex-col gap-[22px] overflow-y-auto overscroll-contain px-6 py-8 sm:px-10"
          >
            <Turno
              turno={{
                id: "saludo",
                autor: "ASISTENTE",
                texto:
                  "Voy a configurar tu empresa a partir de tus documentos. Subilos acá y yo leo lo necesario; te pregunto solo lo que los papeles no dicen. Nada se guarda sin que lo confirmes.",
              }}
              tarjeta={
                <TarjetaDocumentos
                  documentos={documentos}
                  subiendo={subir.isPending ? subir.variables?.tipo : undefined}
                  alSubir={alSubir}
                />
              }
            />

            {leidos.map((documento) => (
              <div key={documento.id} className="flex flex-col gap-[22px]">
                {documento.estado === "LEIDO" && documento.datos.length > 0 && (
                  <Turno
                    turno={{
                      id: `leido-${documento.id}`,
                      autor: "ASISTENTE",
                      texto: `Leí ${NOMBRE_DOCUMENTO[documento.tipo]}: **${documento.datos.length}** ${
                        documento.datos.length === 1 ? "dato" : "datos"
                      }. Revisá que esté bien antes de guardarlo.`,
                    }}
                    tarjeta={
                      <TarjetaExtraido
                        documento={documento}
                        confirmando={confirmar.isPending && confirmar.variables?.id === documento.id}
                        yaConfirmado={confirmados.has(documento.id)}
                        alConfirmar={alConfirmar}
                      />
                    }
                  />
                )}
                {documento.estado === "FALLO" && (
                  <Turno
                    turno={{ id: `fallo-${documento.id}`, autor: "ASISTENTE" }}
                    cara="noPude"
                    tarjeta={
                      <TarjetaFalla
                        titulo={`No pude leer ${NOMBRE_DOCUMENTO[documento.tipo]}`}
                        detalle={documento.error ?? "Probá con otro archivo."}
                      />
                    }
                  />
                )}
                {confirmaciones
                  .filter((c) => c.id === documento.id)
                  .map(({ resultado }, i) => (
                    <Turno
                      key={i}
                      turno={{
                        id: `confirmado-${documento.id}-${i}`,
                        autor: "ASISTENTE",
                        texto:
                          resultado.sinAplicar.length === 0
                            ? "Guardado."
                            : "Guardé lo que se podía. Esto quedó para completar abajo:",
                      }}
                      tarjeta={<TarjetaConfirmado resultado={resultado} />}
                    />
                  ))}
              </div>
            ))}

            {enCurso.map((documento) => (
              <Turno
                key={`en-vivo-${documento.id}`}
                turno={{ id: `en-vivo-${documento.id}`, autor: "ASISTENTE" }}
                pensando
                tarjeta={
                  <BurbujaLectura
                    documento={documento}
                    lectura={lecturas[documento.id]}
                    enVivo={conectado}
                    ahora={ahora}
                    deteniendo={detener.isPending && detener.variables === documento.id}
                    alDetener={(id) =>
                      detener.mutate(id, {
                        onError: (error) => aviso.error("No se pudo detener", mensajeDeError(error)),
                      })
                    }
                  />
                }
              />
            ))}

            {pendientes.length > 0 && !leyendo && (
              <Turno
                turno={{
                  id: "falta",
                  autor: "ASISTENTE",
                  texto:
                    "Esto es lo que falta para terminar. Lo que los documentos no dicen —la tarifa de ICA, el grupo NIIF, el plan de cuentas— lo completás en su paso:",
                }}
                tarjeta={
                  <ul className="m-0 flex w-full max-w-[640px] list-none flex-col divide-y divide-border rounded-xl border border-border bg-card p-0">
                    {pendientes.map((p) => (
                      <li key={p.clave} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex min-w-0 grow flex-col gap-0.5">
                          <span className="text-sm font-medium">{p.nombre}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.estado === "BLOQUEADO"
                              ? "Se habilita cuando termines la situación legal."
                              : p.faltantes.length > 0
                                ? `Falta: ${p.faltantes.map((f) => f.etiqueta).join(" · ")}`
                                : "Sin empezar."}
                          </span>
                        </div>
                        {p.estado === "BLOQUEADO" ? (
                          <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Bloqueado" />
                        ) : (
                          <Link
                            href={RUTA_PASO[p.clave]}
                            className="flex h-[34px] shrink-0 items-center gap-1.5 rounded-md border border-input bg-card px-3.5 text-[13px] font-medium text-foreground no-underline hover:bg-muted"
                          >
                            Completar
                            <ArrowRight className="size-3.5" />
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
