"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { aviso } from "@/lib/avisos";
import { Compositor } from "../components/Compositor";
import { Turno } from "../components/Mensajes";
import { AvatarAsistente, Pildora } from "../components/Piezas";
import {
  TarjetaConfirmado,
  TarjetaDocumentos,
  TarjetaExtraido,
  TarjetaFalla,
} from "../components/Tarjetas";
import {
  CLAVE_DOCUMENTOS,
  mensajeDeError,
  useConfirmar,
  useDetener,
  useDisponible,
  useDocumentos,
  useSubirDocumento,
} from "../hooks/useAsistente";
import { useProgreso } from "../hooks/useProgreso";
import {
  NOMBRE_DOCUMENTO,
  type ResultadoConfirmacion,
  type TipoDocumento,
} from "../types/asistente.types";
import styles from "../asistente.module.css";

/**
 * El asistente: subí un documento, mirá lo que encontró, confirmá lo que sirve.
 *
 * La conversación **no se inventa y no se guarda**: se arma con lo que devuelven
 * los endpoints de `/configuracion/ia`. Cada documento leído es un turno, cada
 * lectura que falló es otro, y el progreso llega por el flujo de eventos del
 * backend —no hay temporizadores acá—. Al recargar la página vuelve a aparecer lo
 * mismo, porque el estado vive en la base y no en esta pantalla.
 *
 * Lo que el diseño muestra y todavía no existe —asentar solo, el pago propuesto,
 * la lista de conversaciones— no está dibujado. Una tarjeta con datos de mentira
 * es peor que una pantalla que hace menos.
 */
export function AsistenteView() {
  const queryClient = useQueryClient();
  const { data: disponible, isPending: consultandoModo } = useDisponible();
  const { data: documentos = [] } = useDocumentos();
  const subir = useSubirDocumento();
  const confirmar = useConfirmar();
  const detener = useDetener();

  /** Los archivos que se subieron en esta sesión: el nombre solo lo sabe el navegador. */
  const [subidos, setSubidos] = useState<Record<string, string>>({});
  const [confirmaciones, setConfirmaciones] = useState<
    Array<{ id: string; resultado: ResultadoConfirmacion }>
  >([]);
  /** Lo último que dijo el backend mientras lee. Es el rótulo de «pensando». */
  const [enVivo, setEnVivo] = useState<string | null>(null);

  /**
   * Los documentos que ya se confirmaron en esta sesión.
   *
   * Sin esto, «Todo correcto» seguía activo después de confirmar y se podía
   * volver a apretar: salía un segundo resumen que contradecía al primero
   * —«0 datos guardados» donde el anterior decía uno— porque la segunda vez ya
   * no quedaba nada por aplicar. La base nunca se ensució, la restricción de
   * vigencia frena el duplicado; lo que se rompía era lo que la persona leía.
   */
  const confirmados = useMemo(
    () => new Set(confirmaciones.map((c) => c.id)),
    [confirmaciones],
  );

  const leyendo = documentos.some(
    (d) => d.estado === "EN_COLA" || d.estado === "LEYENDO",
  );

  // Cada evento refresca el estado de los documentos: la tarjeta y los turnos
  // cuentan lo mismo porque leen la misma consulta.
  useProgreso(
    disponible === true,
    useCallback(
      (evento) => {
        setEnVivo(
          evento.etapa === "LISTO" || evento.etapa === "ERROR" ? null : evento.mensaje,
        );
        void queryClient.invalidateQueries({ queryKey: CLAVE_DOCUMENTOS });
      },
      [queryClient],
    ),
  );

  const alSubir = (tipo: TipoDocumento, archivo: File) => {
    subir.mutate(
      { tipo, archivo },
      {
        onSuccess: (documento) => {
          setSubidos((previos) => ({ ...previos, [documento.id]: archivo.name }));
        },
        onError: (error) => {
          aviso.error("No se pudo subir el documento", mensajeDeError(error));
        },
      },
    );
  };

  const alConfirmar = (id: string) => {
    confirmar.mutate(
      { id },
      {
        onSuccess: (resultado) => {
          setConfirmaciones((previas) => [...previas, { id, resultado }]);
          aviso.exito(
            resultado.aplicados.length === 1
              ? "Se guardó 1 dato"
              : `Se guardaron ${resultado.aplicados.length} datos`,
            resultado.sinAplicar.length === 0
              ? undefined
              : `${resultado.sinAplicar.length} quedaron pendientes, con su razón.`,
          );
        },
        onError: (error) => {
          aviso.error("No se pudo guardar", mensajeDeError(error));
        },
      },
    );
  };

  const alDetener = (id: string) => {
    detener.mutate(id, {
      onError: (error) => aviso.error("No se pudo detener", mensajeDeError(error)),
    });
  };

  if (consultandoModo) {
    return <Pantalla>{null}</Pantalla>;
  }

  // Sin clave del modelo o sin bucket el modo no se ofrece, y se dice por qué: el
  // asistente manual sigue funcionando igual.
  if (disponible !== true) {
    return (
      <Pantalla>
        <div className="flex flex-grow items-center justify-center px-7">
          <div className="flex max-w-[420px] flex-col items-center gap-3 text-center">
            <AvatarAsistente size={36} />
            <p className="m-0 text-[15px] font-medium">
              La lectura de documentos no está disponible
            </p>
            <p className="m-0 text-[13px] leading-normal text-muted-foreground">
              Falta configurarla en el servidor. Podés configurar la empresa a mano
              mientras tanto: es el mismo resultado, con más tecleo.
            </p>
            <Link
              href="/configuracion/empresa"
              className="text-[13px] font-medium text-brand-text hover:text-brand-hover"
            >
              Ir al asistente manual
            </Link>
          </div>
        </div>
      </Pantalla>
    );
  }

  const ordenados = [...documentos].sort((a, b) =>
    a.creadoEn.localeCompare(b.creadoEn),
  );

  return (
    <Pantalla pensando={leyendo}>
      <div className="flex min-h-0 flex-grow flex-col gap-[22px] overflow-auto px-7 py-6">
        <Turno
          turno={{
            id: "saludo",
            autor: "ASISTENTE",
            texto:
              "Subí el RUT, el certificado de Cámara de Comercio o la resolución de la DIAN. Leo lo que diga y te lo muestro antes de guardar nada.",
          }}
          tarjeta={
            <TarjetaDocumentos
              documentos={documentos}
              subiendo={subir.isPending ? subir.variables?.tipo : undefined}
              alSubir={alSubir}
              alDetener={alDetener}
            />
          }
        />

        {ordenados.map((documento) => (
          <div key={documento.id} className="flex flex-col gap-[22px]">
            {subidos[documento.id] !== undefined && (
              <Turno
                turno={{
                  id: `subida-${documento.id}`,
                  autor: "PERSONA",
                  archivo: subidos[documento.id],
                  texto: `Leé esto como ${NOMBRE_DOCUMENTO[documento.tipo]}.`,
                }}
              />
            )}

            {documento.estado === "LEIDO" && documento.datos.length > 0 && (
              <Turno
                turno={{
                  id: `leido-${documento.id}`,
                  autor: "ASISTENTE",
                  texto: `Leí ${NOMBRE_DOCUMENTO[documento.tipo]}: **${documento.datos.length}** ${
                    documento.datos.length === 1 ? "dato" : "datos"
                  }. Nada está guardado todavía.`,
                }}
                tarjeta={
                  <TarjetaExtraido
                    documento={documento}
                    confirmando={
                      confirmar.isPending && confirmar.variables?.id === documento.id
                    }
                    yaConfirmado={confirmados.has(documento.id)}
                    alConfirmar={alConfirmar}
                  />
                }
              />
            )}

            {documento.estado === "FALLO" && (
              <Turno
                turno={{ id: `fallo-${documento.id}`, autor: "ASISTENTE" }}
                tarjeta={
                  <TarjetaFalla
                    titulo={`No pude leer ${NOMBRE_DOCUMENTO[documento.tipo]}`}
                    detalle={
                      documento.error ??
                      "La lectura terminó sin resultado. Probá con otro archivo."
                    }
                  />
                }
              />
            )}
          </div>
        ))}

        {confirmaciones.map(({ id, resultado }, i) => (
          <Turno
            key={`confirmado-${id}-${i}`}
            turno={{
              id: `confirmado-${id}-${i}`,
              autor: "ASISTENTE",
              texto:
                resultado.sinAplicar.length === 0
                  ? "Guardado. Podés seguir con el paso que sigue."
                  : "Guardé lo que se podía aplicar. Esto quedó pendiente:",
            }}
            tarjeta={<TarjetaConfirmado resultado={resultado} />}
          />
        ))}

        {/* El rótulo de «pensando» dice lo que el backend está haciendo, palabra
            por palabra. Si no hay evento todavía, no se inventa uno. */}
        {leyendo && (
          <Turno
            turno={{
              id: "en-vivo",
              autor: "ASISTENTE",
              texto: undefined,
            }}
            pensando
            tarjeta={
              <span
                className={`${styles.pulso} text-[15px] text-muted-foreground`}
                aria-live="polite"
              >
                {enVivo ?? "Leyendo el documento…"}
              </span>
            }
          />
        )}
      </div>

      <Compositor subiendo={subir.isPending} alSubir={alSubir} />
    </Pantalla>
  );
}

/**
 * El marco: encabezado y cuerpo, a sangre.
 *
 * Los márgenes negativos cancelan el relleno del área de trabajo y el alto se
 * calcula contra la barra superior (`h-14`): el chat tiene su propio
 * desplazamiento adentro y no es un documento centrado como el resto.
 */
function Pantalla({
  children,
  pensando = false,
}: {
  children: React.ReactNode;
  pensando?: boolean;
}) {
  return (
    <div className="-mx-4 -my-7 flex h-[calc(100dvh-3.5rem)] min-h-0 md:-mx-10 lg:-mx-14">
      <section
        aria-label="Asistente"
        className="flex min-w-0 flex-grow flex-col bg-card"
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-muted px-7">
          <div className="flex items-center gap-3">
            <AvatarAsistente size={30} pensando={pensando} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Asistente de configuración</span>
              <span className="text-xs text-muted-foreground">
                {pensando
                  ? "Leyendo tus documentos…"
                  : "Nada se guarda sin tu confirmación"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pildora tono="HECHO">Lee y propone</Pildora>
            <Link
              href="/configuracion/empresa"
              className="inline-flex h-[34px] items-center rounded-md border border-input bg-card px-4 text-[13px] font-medium whitespace-nowrap"
            >
              Pasar a manual
            </Link>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

