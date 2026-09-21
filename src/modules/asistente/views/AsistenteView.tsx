"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { BurbujaLectura } from "../components/BurbujaLectura";
import { Compositor } from "../components/Compositor";
import { ListaConversaciones } from "../components/ListaConversaciones";
import { Turno } from "../components/Mensajes";
import { AvatarAsistente, Pildora } from "../components/Piezas";
import {
  TarjetaConfirmado,
  TarjetaDocumentos,
  TarjetaExtraido,
  TarjetaFalla,
} from "../components/Tarjetas";
import { TurnoGuardado, TurnoRespondiendo } from "../components/TurnosConversacion";
import {
  CLAVE_DOCUMENTOS,
  mensajeDeError,
  useConfirmar,
  useDetener,
  useDisponible,
  useDocumentos,
  useSubirDocumento,
} from "../hooks/useAsistente";
import {
  useConversacionArchivada,
  useConversacionDisponible,
  useConversacionVigente,
  useListaConversaciones,
  useNuevaConversacion,
  usePreguntar,
} from "../hooks/useConversacion";
import { useResumenDelDia } from "../hooks/useAutonomia";
import { useProgreso } from "../hooks/useProgreso";
import { aplicarEvento, type LecturasEnVivo } from "../lib/lecturaEnVivo";
import {
  NOMBRE_DOCUMENTO,
  type Documento,
  type ResultadoConfirmacion,
  type TipoDocumento,
} from "../types/asistente.types";

/**
 * Para arrancar, si no se sabe qué preguntar. Son preguntas que el asistente
 * contesta con el mapa de la aplicación que lleva en sus instrucciones.
 */
const PREGUNTAS_SUGERIDAS = [
  "¿Cómo registro una compra a un proveedor?",
  "¿Cómo le cobro una factura a un cliente?",
  "¿Dónde concilio el extracto del banco?",
  "¿Cómo creo un producto nuevo?",
  "¿Quién puede cerrar un período?",
] as const;

/**
 * El asistente: subí un documento, mirá lo que encontró, confirmá lo que sirve.
 * Y desde el paso 5 de `asistente-conversacion.md`, preguntale cómo hacer algo
 * en el sistema.
 *
 * **La lectura no se inventa y no se guarda acá**: se arma con lo que devuelven
 * los endpoints de `/configuracion/ia`, y el progreso llega por el flujo de
 * eventos del backend —no hay temporizadores—.
 *
 * **La conversación sí se guarda**, en el backend (`/conversacion`). A la
 * izquierda está la lista de todas las de quien pregunta; se escribe solo en
 * la vigente, y las archivadas se abren para leerlas. En la vigente, los
 * documentos y las preguntas van mezclados en el orden en que pasaron; los
 * documentos de antes de la conversación quedan en la tarjeta del saludo.
 *
 * Lo que el diseño muestra y todavía no existe —asentar solo, el pago
 * propuesto— no está dibujado. Una tarjeta con datos de mentira es peor que
 * una pantalla que hace menos.
 */
export function AsistenteView() {
  const queryClient = useQueryClient();
  const { data: disponible, isPending: consultandoModo } = useDisponible();
  const { data: documentos = [] } = useDocumentos();
  const subir = useSubirDocumento();
  const confirmar = useConfirmar();
  const detener = useDetener();

  const { data: conversa = false } = useConversacionDisponible();
  const { data: vigente } = useConversacionVigente(conversa);
  const { data: conversaciones = [] } = useListaConversaciones(conversa);
  /** La conversación abierta. `null` es la vigente, donde se escribe. */
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const { data: archivada } = useConversacionArchivada(seleccionada);
  const nueva = useNuevaConversacion();
  const { enviar, enVivo, respondiendo } = usePreguntar();
  /** La lista en el celular: ahí no entra al costado, se abre encima. */
  const [listaAbierta, setListaAbierta] = useState(false);
  const cuerpo = useRef<HTMLDivElement>(null);
  /** Lo que el asistente registró solo hoy (paso 8): no puede pasar desapercibido. */
  const { data: resumen } = useResumenDelDia(conversa);

  /** Los archivos que se subieron en esta sesión: el nombre solo lo sabe el navegador. */
  const [subidos, setSubidos] = useState<Record<string, string>>({});
  const [confirmaciones, setConfirmaciones] = useState<
    Array<{ id: string; resultado: ResultadoConfirmacion }>
  >([]);
  /** Lo que llegó por el flujo de cada lectura en curso: rótulo y datos. */
  const [lecturas, setLecturas] = useState<LecturasEnVivo>({});
  /** El reloj del tiempo transcurrido. Solo corre mientras algo se lee. */
  const [ahora, setAhora] = useState(() => Date.now());

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

  const enCurso = documentos
    .filter((d) => d.estado === "EN_COLA" || d.estado === "LEYENDO")
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  const leyendo = enCurso.length > 0;

  useEffect(() => {
    if (!leyendo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, [leyendo]);

  // Cada evento refresca el estado de los documentos: la tarjeta y los turnos
  // cuentan lo mismo porque leen la misma consulta.
  const conectado = useProgreso(
    disponible === true,
    useCallback(
      (evento) => {
        setLecturas((previas) => aplicarEvento(previas, evento));
        void queryClient.invalidateQueries({ queryKey: CLAVE_DOCUMENTOS });
      },
      [queryClient],
    ),
  );

  // Lo nuevo aparece abajo —la respuesta que llega, el turno guardado, la
  // conversación que se abrió— y el cuerpo baja con eso.
  const turnosVisibles =
    seleccionada === null ? (vigente?.turnos.length ?? 0) : (archivada?.turnos.length ?? 0);
  useEffect(() => {
    const el = cuerpo.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [turnosVisibles, enVivo?.texto, enVivo?.pregunta, seleccionada, documentos.length]);

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

  const alNueva = () => {
    nueva.mutate(undefined, {
      onSuccess: () => setSeleccionada(null),
      onError: (error) =>
        aviso.error("No se pudo empezar otra conversación", mensajeDeError(error)),
    });
  };

  const alElegirConversacion = (id: string | null) => {
    setSeleccionada(id);
    setListaAbierta(false);
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

  const renderDocumento = (documento: Documento) => (
    <div className="flex flex-col gap-[22px]">
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
          tarjeta={
            <TarjetaFalla
              titulo={`No pude leer ${NOMBRE_DOCUMENTO[documento.tipo]}`}
              detalle={
                documento.error ?? "La lectura terminó sin resultado. Probá con otro archivo."
              }
            />
          }
        />
      )}

      {confirmaciones
        .filter((c) => c.id === documento.id)
        .map(({ resultado }, i) => (
          <Turno
            key={`confirmado-${documento.id}-${i}`}
            turno={{
              id: `confirmado-${documento.id}-${i}`,
              autor: "ASISTENTE",
              texto:
                resultado.sinAplicar.length === 0
                  ? "Guardado. Podés seguir con el paso que sigue."
                  : "Guardé lo que se podía aplicar. Esto quedó pendiente:",
            }}
            tarjeta={<TarjetaConfirmado resultado={resultado} />}
          />
        ))}
    </div>
  );

  // Los documentos leídos durante la conversación vigente van entre sus turnos;
  // los de antes —de una conversación ya archivada— quedan solo en la tarjeta
  // del saludo, que dice el estado de los tres. «Antes» es cuando se archivó la
  // última. Las lecturas en curso van en su burbuja, abajo de todo.
  const inicioVigente = conversaciones.reduce<number | null>((max, c) => {
    if (c.archivada_en === null) return max;
    const fecha = new Date(c.archivada_en).getTime();
    return max === null || fecha > max ? fecha : max;
  }, null);
  const linea = [
    ...documentos
      .filter(
        (d) =>
          d.estado !== "EN_COLA" &&
          d.estado !== "LEYENDO" &&
          (inicioVigente === null || new Date(d.creadoEn).getTime() >= inicioVigente),
      )
      .map((documento) => ({
        fecha: new Date(documento.creadoEn).getTime(),
        clave: `documento-${documento.id}`,
        nodo: renderDocumento(documento),
      })),
    ...(vigente?.turnos ?? []).map((turno) => ({
      fecha: new Date(turno.creado_en).getTime(),
      clave: `turno-${turno.id}`,
      nodo: <TurnoGuardado turno={turno} />,
    })),
  ].sort((a, b) => a.fecha - b.fecha);

  const lista = conversa ? (
    <ListaConversaciones
      conversaciones={conversaciones}
      seleccionada={seleccionada}
      ahora={new Date(ahora)}
      nuevaDeshabilitada={nueva.isPending || respondiendo || !vigente?.id}
      alElegir={alElegirConversacion}
      alNueva={alNueva}
      className="h-full"
    />
  ) : null;

  const marco = {
    pensando: leyendo || respondiendo,
    subtitulo: respondiendo
      ? "Escribiendo…"
      : leyendo
        ? "Leyendo tus documentos…"
        : "Nada se guarda sin tu confirmación",
    lista,
    listaAbierta,
    alAlternarLista: setListaAbierta,
    conAutonomia: conversa,
  };

  // Una archivada: se lee, no se escribe.
  if (seleccionada !== null) {
    return (
      <Pantalla {...marco}>
        <div
          ref={cuerpo}
          className="flex min-h-0 flex-grow flex-col gap-[22px] overflow-auto px-4 py-6 md:px-7"
        >
          {(archivada?.turnos ?? []).map((turno) => (
            <TurnoGuardado key={turno.id} turno={turno} />
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-muted px-4 py-4 text-[13px] md:px-7">
          <span className="text-muted-foreground">
            Esta conversación está cerrada: se puede leer, no seguir.
          </span>
          <button
            type="button"
            onClick={() => setSeleccionada(null)}
            className="font-medium text-brand-text hover:text-brand-hover"
          >
            Volver a la actual
          </button>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla {...marco}>
      <div
        ref={cuerpo}
        className="flex min-h-0 flex-grow flex-col gap-[22px] overflow-auto px-4 py-6 md:px-7"
      >
        <Turno
          turno={{
            id: "saludo",
            autor: "ASISTENTE",
            texto: conversa
              ? "Subí el RUT, el certificado de Cámara de Comercio o la resolución de la DIAN y te muestro lo que diga antes de guardar nada. O preguntame cómo hacer algo en el sistema."
              : "Subí el RUT, el certificado de Cámara de Comercio o la resolución de la DIAN. Leo lo que diga y te lo muestro antes de guardar nada.",
          }}
          tarjeta={
            <TarjetaDocumentos
              documentos={documentos}
              subiendo={subir.isPending ? subir.variables?.tipo : undefined}
              alSubir={alSubir}
            />
          }
        />

        {resumen !== undefined && resumen.registradas.length > 0 && (
          <Link
            href="/dashboard/asistente/autonomia"
            className="self-center rounded-full bg-muted px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Hoy el asistente registró {resumen.registradas.length} sin preguntar, por{" "}
            {formatCOP(resumen.registradas.reduce((s, r) => s + r.valor, 0))}. Ver
          </Link>
        )}

        {linea.map((item) => (
          <div key={item.clave} className="contents">
            {item.nodo}
          </div>
        ))}

        {/* Una burbuja por lectura en curso. Dice lo que el backend está
            haciendo, palabra por palabra, y lo que va encontrando; si no hay
            evento todavía, no se inventa uno. */}
        {enCurso.map((documento) => (
          <Turno
            key={`en-vivo-${documento.id}`}
            turno={{
              id: `en-vivo-${documento.id}`,
              autor: "ASISTENTE",
              texto: undefined,
            }}
            pensando
            tarjeta={
              <BurbujaLectura
                documento={documento}
                lectura={lecturas[documento.id]}
                enVivo={conectado}
                ahora={ahora}
                deteniendo={detener.isPending && detener.variables === documento.id}
                alDetener={alDetener}
              />
            }
          />
        ))}

        {enVivo !== null && <TurnoRespondiendo enVivo={enVivo} />}
      </div>

      <Compositor
        subiendo={subir.isPending}
        alSubir={alSubir}
        conversacion={
          conversa
            ? {
                alEnviar: enviar,
                respondiendo,
                superaTope: vigente?.superaTope ?? false,
                preguntas: PREGUNTAS_SUGERIDAS,
                alNueva,
                nuevaDeshabilitada: nueva.isPending || respondiendo || !vigente?.id,
              }
            : undefined
        }
      />
    </Pantalla>
  );
}

/**
 * El marco: la lista de conversaciones a la izquierda, y el chat con su
 * encabezado. A sangre.
 *
 * Los márgenes negativos cancelan el relleno del área de trabajo y el alto se
 * calcula contra la barra superior (`h-14`): el chat tiene su propio
 * desplazamiento adentro y no es un documento centrado como el resto.
 *
 * En el celular la lista no entra al costado: se abre encima con el botón
 * «Conversaciones» del encabezado.
 */
function Pantalla({
  children,
  pensando = false,
  subtitulo = "Nada se guarda sin tu confirmación",
  lista = null,
  listaAbierta = false,
  alAlternarLista,
  conAutonomia = false,
}: {
  children: React.ReactNode;
  pensando?: boolean;
  subtitulo?: string;
  lista?: React.ReactNode;
  listaAbierta?: boolean;
  alAlternarLista?: (abierta: boolean) => void;
  /** El enlace a «Hasta dónde llega» (paso 8), si se puede conversar. */
  conAutonomia?: boolean;
}) {
  return (
    <div className="relative -mx-4 -my-7 flex h-[calc(100dvh-3.5rem)] min-h-0 md:-mx-10 lg:-mx-14">
      {lista !== null && <div className="hidden md:flex">{lista}</div>}

      {lista !== null && listaAbierta && (
        <div className="absolute inset-0 z-30 flex md:hidden">
          <div className="flex h-full">{lista}</div>
          <button
            type="button"
            aria-label="Cerrar la lista de conversaciones"
            onClick={() => alAlternarLista?.(false)}
            className="flex grow items-start justify-end bg-foreground/20 p-3"
          >
            <X className="size-5 text-background" aria-hidden="true" />
          </button>
        </div>
      )}

      <section aria-label="Asistente" className="flex min-w-0 flex-grow flex-col bg-card">
        <div className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-muted px-4 md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            {lista !== null && (
              <button
                type="button"
                aria-label="Conversaciones"
                onClick={() => alAlternarLista?.(!listaAbierta)}
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-input md:hidden"
              >
                <MessagesSquare className="size-4" aria-hidden="true" />
              </button>
            )}
            <AvatarAsistente size={30} pensando={pensando} />
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">Asistente</span>
              <span className="truncate text-xs text-muted-foreground">{subtitulo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <Pildora tono="HECHO">Lee y propone</Pildora>
            </span>
            {conAutonomia && (
              <Link
                href="/dashboard/asistente/autonomia"
                className="hidden h-[34px] items-center rounded-md border border-input bg-card px-4 text-[13px] font-medium whitespace-nowrap md:inline-flex"
              >
                Hasta dónde llega
              </Link>
            )}
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
