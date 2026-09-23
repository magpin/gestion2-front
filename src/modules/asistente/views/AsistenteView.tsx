"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { aviso } from "@/lib/avisos";
import { BurbujaLectura } from "../components/BurbujaLectura";
import { Compositor } from "../components/Compositor";
import { ListaConversaciones } from "../components/ListaConversaciones";
import { Turno } from "../components/Mensajes";
import { Maria } from "../components/Maria";
import { Pildora } from "../components/Piezas";
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
  useDisponibilidadIa,
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
import { useProgreso } from "../hooks/useProgreso";
import { aplicarEvento, type LecturasEnVivo } from "../lib/lecturaEnVivo";
import { limiteDeLectura } from "../lib/limites";
import {
  NOMBRE_DOCUMENTO,
  TIPOS_ACEPTADOS,
  type Documento,
  type ResultadoConfirmacion,
  type TipoDocumento,
} from "../types/asistente.types";

/**
 * Para arrancar, si no se sabe qué preguntar. Son preguntas que el asistente
 * contesta con el mapa de la aplicación que lleva en sus instrucciones.
 */
/**
 * Cuánto se mira hacia atrás para saber qué documentos se subieron juntos.
 * Dos minutos: lo que tarda alguien en soltar el RUT, la Cámara y la
 * resolución, sin llegar a mezclar dos intentos distintos.
 */
const VENTANA_TANDA_MS = 120_000;

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
  const { data: estadoIa, isPending: consultandoModo } = useDisponibilidadIa();
  const disponible = estadoIa?.disponible;
  const enPausa = estadoIa?.motivo === "EN_PAUSA";
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

  /** Los archivos que se subieron en esta sesión: el nombre solo lo sabe el navegador. */
  const [subidos, setSubidos] = useState<Record<string, string>>({});
  // Lo que se subió desde el pie sin decir qué es, y lo que el asistente dijo.
  const [analizados, setAnalizados] = useState<
    { id: string; nombre: string; clase: string; resumen: string; leyendo: boolean }[]
  >([]);
  const analizando = subir.isPending && subir.variables?.tipo === undefined;
  const [confirmaciones, setConfirmaciones] = useState<
    Array<{ id: string; resultado: ResultadoConfirmacion }>
  >([]);
  /** Lo que llegó por el flujo de cada lectura en curso: rótulo y datos. */
  const [lecturas, setLecturas] = useState<LecturasEnVivo>({});
  /** El reloj del tiempo transcurrido. Solo corre mientras algo se lee. */
  const [ahora, setAhora] = useState(() => Date.now());
  /**
   * Qué está haciendo la persona en el pie, para que la cara lo mire.
   *
   * Mirar hacia donde pasa algo es la diferencia entre una cara puesta ahí y
   * una que acompaña. Y es barato: son tres píxeles de desplazamiento.
   */
  const [mirando, setMirando] = useState<"arrastrando" | "escribiendo" | null>(null);

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

  /**
   * La tanda: los documentos que se subieron cerca del que se está leyendo.
   *
   * **No hay lotes en el backend** —un archivo es un POST y una fila suelta,
   * sin llave que agrupe—, así que la tanda se deduce del único dato que hay:
   * cuándo entró cada documento. Los subidos dentro de los dos minutos
   * anteriores al último que está en curso se cuentan juntos.
   *
   * Es una aproximación, y por eso se calcula acá y no en la base: lo que se
   * muestra son documentos reales contados por su estado, no una estimación
   * de cuánto falta. Si algún día se sueltan veinte facturas de una, esto hay
   * que agruparlo de verdad, con su `lote_id`.
   */
  const ultimoEnCurso = enCurso.at(-1)?.creadoEn;
  const tanda =
    ultimoEnCurso === undefined
      ? []
      : documentos.filter(
          (d) => Date.parse(ultimoEnCurso) - Date.parse(d.creadoEn) <= VENTANA_TANDA_MS,
        );

  /**
   * Cuánto lleva la tanda, solo cuando hay más de un documento: con uno solo,
   * «0 de 1» no le dice nada a nadie y el anillo de ondas dice más.
   */
  const hechos = tanda.length - enCurso.length;
  const avance = tanda.length > 1 ? hechos / tanda.length : undefined;
  const cuenta = avance === undefined ? undefined : `${hechos} de ${tanda.length}`;

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
  }, [
    turnosVisibles,
    enVivo?.texto,
    enVivo?.pregunta,
    seleccionada,
    documentos.length,
    analizados.length,
    analizando,
  ]);

  /**
   * Sin `tipo` —el pie del chat— se sube cualquier archivo y el servidor dice
   * qué es; si es RUT, Cámara o Resolución, además lo lee.
   */
  const alSubir = (tipo: TipoDocumento | undefined, archivo: File) => {
    // Desde una tarjeta el tipo ya está dicho, y ahí se lee solo PDF o foto.
    if (tipo !== undefined && !(TIPOS_ACEPTADOS as readonly string[]).includes(archivo.type)) {
      aviso.error("Ese archivo no se puede leer", "Subí un PDF o una foto (JPG, PNG o WEBP).");
      return;
    }
    subir.mutate(
      { tipo, archivo },
      {
        onSuccess: ({ documento, clase, resumen }) => {
          if (tipo === undefined) {
            setAnalizados((previos) => [
              ...previos,
              {
                id: `${Date.now()}-${archivo.name}`,
                nombre: archivo.name,
                clase,
                resumen,
                leyendo: documento !== null,
              },
            ]);
          } else if (documento !== null) {
            setSubidos((previos) => ({ ...previos, [documento.id]: archivo.name }));
          }
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
            {/* Dormida, que es exactamente lo que pasa. */}
            <Maria estado="dormida" tamano={36} />
            <p className="m-0 text-[15px] font-medium">
              {enPausa ? "María está en pausa" : "La lectura de documentos no está disponible"}
            </p>
            <p className="m-0 text-[13px] leading-normal text-muted-foreground">
              {enPausa
                ? "La pausó quien administra la plataforma, y se levanta desde ahí. Podés configurar la empresa a mano mientras tanto."
                : "Falta configurarla en el servidor. Podés configurar la empresa a mano mientras tanto: es el mismo resultado, con más tecleo."}
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
          cara={limiteDeLectura.cara}
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
    // Mientras lee, el avance va en el arco de la cara. La cuenta también va
    // escrita: la cara acompaña, el texto informa.
    leyendo,
    avance,
    mirando,
    subtitulo: respondiendo
      ? "Escribiendo…"
      : leyendo
        ? cuenta === undefined
          ? "Leyendo tus documentos…"
          : `Leyendo tus documentos… ${cuenta}`
        : "Nada se guarda sin tu confirmación",
    lista,
    listaAbierta,
    alAlternarLista: setListaAbierta,
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


        {linea.map((item) => (
          <div key={item.clave} className="contents">
            {item.nodo}
          </div>
        ))}

        {analizados.map((a) => (
          <div key={a.id} className="contents">
            <Turno
              turno={{
                id: `archivo-${a.id}`,
                autor: "PERSONA",
                archivo: a.nombre,
                texto: "¿Qué es esto?",
              }}
            />
            <Turno
              turno={{
                id: `analisis-${a.id}`,
                autor: "ASISTENTE",
                texto: `**${a.clase}.** ${a.resumen}${
                  a.leyendo ? "\n\nLo estoy leyendo para llevar sus datos a la configuración." : ""
                }`,
              }}
            />
          </div>
        ))}

        {analizando && subir.variables !== undefined && (
          <div className="contents">
            <Turno
              turno={{
                id: "archivo-pendiente",
                autor: "PERSONA",
                archivo: subir.variables.archivo.name,
                texto: "¿Qué es esto?",
              }}
            />
            <Turno
              turno={{ id: "analisis-pendiente", autor: "ASISTENTE", texto: "Mirando el archivo…" }}
              pensando
            />
          </div>
        )}

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
                progreso={avance}
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
        alSubir={(archivo) => alSubir(undefined, archivo)}
        alMirar={setMirando}
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
  leyendo = false,
  avance,
  mirando = null,
  subtitulo = "Nada se guarda sin tu confirmación",
  lista = null,
  listaAbierta = false,
  alAlternarLista,
}: {
  children: React.ReactNode;
  pensando?: boolean;
  /** Si lo que está pasando es una lectura de documentos y no una respuesta. */
  leyendo?: boolean;
  /** Cuánto lleva la tanda, si son varios documentos. */
  avance?: number;
  /** Qué está haciendo la persona en el pie: la cara mira hacia allá. */
  mirando?: "arrastrando" | "escribiendo" | null;
  subtitulo?: string;
  lista?: React.ReactNode;
  listaAbierta?: boolean;
  alAlternarLista?: (abierta: boolean) => void;
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

      <section aria-label="María, la asistente" className="flex min-w-0 flex-grow flex-col bg-card">
        {/* 80 px de alto y no 60: el aura de la cara mide 1,9 veces su
            diámetro, y con el encabezado justo se cortaba arriba y abajo. */}
        <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-muted px-4 md:px-7">
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
            {/* 40 y no 30: por debajo de 40 px el aura no se dibuja —no cabe—,
                y el encabezado es el único sitio fijo del chat donde vive la
                cara, así que es donde tiene que verse.

                En reposo va en «suave» y no en «calma»: quieta del todo, el
                aura es tan tenue que no se distingue del borde, y acá la idea
                es justamente que se vea que hay alguien. */}
            <Maria
              estado={leyendo ? "leyendo" : pensando ? "pensando" : "reposo"}
              tamano={40}
              intensidad={leyendo || pensando ? undefined : "suave"}
              progreso={leyendo ? avance : undefined}
              // El pie está abajo a la izquierda del encabezado, así que mirar
              // lo que pasa ahí es mirar a la izquierda.
              mirada={mirando === null ? undefined : "izquierda"}
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">María</span>
              <span className="truncate text-xs text-muted-foreground">{subtitulo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <Pildora tono="HECHO">Lee y propone</Pildora>
            </span>
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
