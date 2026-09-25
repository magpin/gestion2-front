"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FileUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { BurbujaLectura, caraDeLectura } from "@/modules/asistente/components/BurbujaLectura";
import { Turno } from "@/modules/asistente/components/Mensajes";
import { TarjetaFalla } from "@/modules/asistente/components/Tarjetas";
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
  type DatoExtraido,
  type Documento,
  type ResultadoConfirmacion,
  type TipoDocumento,
} from "@/modules/asistente/types/asistente.types";
import { ModoEmbebidoProvider } from "../components/ModoEmbebido";
import { RevisarLeido, type DatoARevisar } from "../components/RevisarLeido";
import { Recorrido } from "../components/Recorrido";
import { useDisponible } from "../hooks/useModoIa";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import type { ClavePaso } from "../types/configuracion.types";
import styles from "../asistente.module.css";
import { PasoEmpresa } from "./PasoEmpresa";
import { PasoPlanCuentas } from "./PasoPlanCuentas";
import { PasoResoluciones } from "./PasoResoluciones";
import { PasoSedes } from "./PasoSedes";
import { PasoSituacionLegal } from "./PasoSituacionLegal";

/** El orden en que se piden los documentos. Uno a la vez. */
const ORDEN: Array<{ tipo: TipoDocumento; pedido: string; para: string }> = [
  {
    tipo: "RUT",
    pedido: "Empecemos por el **RUT**.",
    para: "De ahí salen la sede principal, las responsabilidades tributarias y la actividad económica.",
  },
  {
    tipo: "CAMARA_COMERCIO",
    pedido: "Ahora el **certificado de Cámara de Comercio**.",
    para: "De ahí salen el representante legal y la matrícula mercantil.",
  },
  {
    tipo: "RESOLUCION_DIAN",
    pedido: "Por último, la **resolución de facturación de la DIAN**.",
    para: "Es la numeración autorizada para facturar.",
  },
];

/** Los pasos, en el orden del recorrido, con su formulario. */
const PASO: Record<ClavePaso, { nombre: string; Componente: () => React.ReactNode }> = {
  EMPRESA: { nombre: "Empresa", Componente: PasoEmpresa },
  SEDES: { nombre: "Sedes", Componente: PasoSedes },
  SITUACION_LEGAL: { nombre: "Situación legal", Componente: PasoSituacionLegal },
  PLAN_CUENTAS: { nombre: "Plan de cuentas", Componente: PasoPlanCuentas },
  RESOLUCIONES: { nombre: "Resoluciones", Componente: PasoResoluciones },
};

const clavesOmitidos = (empresaId: string | null) => `ia-omitidos:${empresaId ?? ""}`;

/**
 * El modo IA del asistente de configuración: **un chat, en orden**, dentro de
 * la configuración (prototipos `IA`, `IAPensando` y `Completa` de
 * `docs/prototipos_asistente/`).
 *
 * 1. Pide el RUT; cuando está leído y confirmado, la Cámara de Comercio; después
 *    la resolución. Uno a la vez. Un documento que no se tiene se puede saltar.
 * 2. Lo que los papeles no dicen —la tarifa de ICA, el plan de cuentas, lo que
 *    se leyó dudoso— se completa **ahí mismo**, con el formulario de ese paso
 *    dentro del chat. No se sale a los pasos sueltos: eso sacaba del modo IA.
 * 3. Cuando el último paso queda listo, se entra al Inicio.
 *
 * Lo confirmado queda confirmado en la base (0068): volver a esta pantalla no
 * vuelve a pedir que se guarde lo que ya se guardó.
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

  const [lecturas, setLecturas] = useState<LecturasEnVivo>({});
  const [ahora, setAhora] = useState(() => Date.now());
  const [omitidos, setOmitidos] = useState<TipoDocumento[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(clavesOmitidos(empresaId)) ?? "[]");
    } catch {
      return [];
    }
  });
  const cuerpo = useRef<HTMLDivElement>(null);

  const leyendo = documentos.some((d) => d.estado === "EN_COLA" || d.estado === "LEYENDO");
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

  // Terminado todo, a la bienvenida de María. Si ya se vio, ella misma manda
  // al tablero.
  const completa = estado?.completa === true;
  useEffect(() => {
    if (!completa) return;
    router.replace("/configuracion/lista");
  }, [completa, router]);

  const omitir = (tipo: TipoDocumento) => {
    const nuevos = [...omitidos, tipo];
    setOmitidos(nuevos);
    try {
      window.localStorage.setItem(clavesOmitidos(empresaId), JSON.stringify(nuevos));
    } catch {
      // Sin almacenamiento, se vuelve a preguntar al recargar: nada se pierde.
    }
  };

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

  const alConfirmar = (id: string, campos?: string[], correcciones?: Record<string, string>) => {
    confirmar.mutate(
      { id, campos, correcciones },
      {
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: CLAVE_DOCUMENTOS }),
        onError: (error) => aviso.error("No se pudo guardar", mensajeDeError(error)),
      },
    );
  };

  // Lo nuevo aparece abajo, y el chat baja con eso.
  const firma = `${documentos.map((d) => d.estado + (d.confirmadoEn ?? "")).join()}|${estado?.completados}|${omitidos.length}`;
  useEffect(() => {
    const el = cuerpo.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [firma]);

  if (isLoading || !estado) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  // ── El chat, en orden ───────────────────────────────────────────────────────
  const turnos: React.ReactNode[] = [];
  let enEspera = false;

  for (const { tipo, pedido, para } of ORDEN) {
    const documento = documentos.find((d) => d.tipo === tipo);
    const confirmado = documento?.estado === "LEIDO" && documento.confirmadoEn != null;

    if (confirmado) {
      turnos.push(
        <DocumentoGuardado
          key={tipo}
          documento={documento}
          guardando={confirmar.isPending && confirmar.variables?.id === documento.id}
          alGuardarPendiente={(campos, correcciones) =>
            alConfirmar(documento.id, campos, correcciones)
          }
        />,
      );
      continue;
    }
    if (omitidos.includes(tipo) && documento === undefined) {
      turnos.push(
        <Turno
          key={tipo}
          turno={{
            id: `omitido-${tipo}`,
            autor: "ASISTENTE",
            texto: `Sin ${NOMBRE_DOCUMENTO[tipo]}: lo que diga lo completamos al final.`,
          }}
        />,
      );
      continue;
    }

    // Este es el documento en curso: lo que sigue espera.
    enEspera = true;
    if (documento === undefined || documento.estado === "FALLO") {
      turnos.push(
        <PedirDocumento
          key={tipo}
          tipo={tipo}
          texto={`${pedido} ${para}`}
          falla={documento?.estado === "FALLO" ? documento : undefined}
          subiendo={subir.isPending && subir.variables?.tipo === tipo}
          alSubir={(archivo) => alSubir(tipo, archivo)}
          alOmitir={() => omitir(tipo)}
        />,
      );
    } else if (documento.estado === "EN_COLA" || documento.estado === "LEYENDO") {
      turnos.push(
        <Turno
          key={tipo}
          turno={{ id: `leyendo-${tipo}`, autor: "ASISTENTE" }}
          pensando
          cara={caraDeLectura(documento, lecturas[documento.id])}
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
        />,
      );
    } else {
      turnos.push(
        <Turno
          key={tipo}
          turno={{
            id: `leido-${tipo}`,
            autor: "ASISTENTE",
            texto: `Leí ${NOMBRE_DOCUMENTO[tipo]}: **${documento.datos.length}** ${
              documento.datos.length === 1 ? "dato" : "datos"
            }. Revisalo: podés corregir cualquiera, y lo que marqué en ámbar no lo leí con seguridad.`,
          }}
          tarjeta={
            <RevisarLeido
              key={documento.id}
              datos={documento.datos.map(aRevisar)}
              guardando={confirmar.isPending && confirmar.variables?.id === documento.id}
              alGuardar={(campos, correcciones) => alConfirmar(documento.id, campos, correcciones)}
            />
          }
        />,
      );
    }
    break;
  }

  // ── Lo que los papeles no dicen, en el formulario de su paso ────────────────
  const pendiente = enEspera
    ? undefined
    : estado.pasos.find((p) => p.estado !== "LISTO" && p.estado !== "BLOQUEADO");

  if (pendiente !== undefined) {
    const { nombre, Componente } = PASO[pendiente.clave];
    turnos.push(
      <Turno
        key={`falta-${pendiente.clave}`}
        turno={{
          id: `falta-${pendiente.clave}`,
          autor: "ASISTENTE",
          texto:
            pendiente.faltantes.length > 0
              ? `Para terminar **${nombre}** me falta: ${pendiente.faltantes
                  .map((f) => f.etiqueta.toLowerCase())
                  .join(", ")}. Eso no sale de los documentos: completalo acá.`
              : `Sigue **${nombre}**. Completalo acá.`,
        }}
      />,
      <div
        key={`paso-${pendiente.clave}`}
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <ModoEmbebidoProvider value={true}>
          <Componente />
        </ModoEmbebidoProvider>
      </div>,
    );
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div
        className={`${styles.sombraTarjeta} mx-auto flex h-full max-h-[calc(100dvh-64px)] w-full max-w-[1240px] overflow-hidden rounded-[1.05rem] border border-border bg-card`}
      >
        <Recorrido
          pasos={estado.pasos}
          actual={pendiente?.clave ?? estado.siguiente}
          completados={estado.completados}
          porcentaje={estado.porcentaje}
          razonSocial={empresa?.razonSocial ?? "Tu empresa"}
          modoIA
        />

        <section className="flex min-w-0 grow flex-col">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6 sm:px-10">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">Asistente de configuración · con IA</span>
              <span className="truncate text-xs text-muted-foreground" aria-live="polite">
                {leyendo ? "Leyendo tu documento…" : "Nada se guarda sin tu confirmación"}
              </span>
            </div>
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
                  "Hola. Voy a configurar tu empresa con tus documentos, de a uno. Leo lo necesario y te pregunto solo lo que los papeles no dicen. Nada se guarda sin que lo confirmes.",
              }}
            />
            {turnos}
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Un documento ya leído y guardado. Si algo quedó pendiente, se muestra con el
 * valor que leyó María y por qué no se guardó, y se puede guardar ahí mismo:
 * lo dudoso lo confirma la persona que lo está viendo.
 */
function DocumentoGuardado({
  documento,
  guardando,
  alGuardarPendiente,
}: {
  documento: Documento;
  guardando: boolean;
  alGuardarPendiente: (campos: string[], correcciones: Record<string, string>) => void;
}) {
  const resultado: ResultadoConfirmacion | null = documento.confirmacion ?? null;
  const nombre = NOMBRE_DOCUMENTO[documento.tipo];
  const pendientes = resultado?.sinAplicar ?? [];
  const titulo = `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`;

  return (
    <Turno
      turno={{
        id: `guardado-${documento.id}`,
        autor: "ASISTENTE",
        texto:
          pendientes.length === 0
            ? `${titulo}: guardado.`
            : `De ${nombre} guardé **${resultado?.aplicados.length ?? 0}** datos. Esto quedó pendiente: corregilo si hace falta y decidí qué se guarda.`,
      }}
      tarjeta={
        pendientes.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/35 bg-success/12 px-2.5 py-[3px] text-xs font-medium">
            <Check className="size-3.5" />
            {resultado === null ? "Confirmado" : `${resultado.aplicados.length} datos guardados`}
          </span>
        ) : (
          <RevisarLeido
            key={`${documento.id}-${documento.confirmadoEn ?? ""}`}
            datos={pendientes.map((p) => {
              const dato = documento.datos.find((d) => d.campo === p.campo);
              return {
                ...(dato === undefined
                  ? { campo: p.campo, etiqueta: p.etiqueta, valor: "", dudoso: true }
                  : aRevisar(dato)),
                dudoso: true,
                motivo: p.motivo,
              };
            })}
            guardando={guardando}
            alGuardar={alGuardarPendiente}
          />
        )
      }
    />
  );
}

/** Un dato leído, listo para revisar: el valor como texto y de dónde salió. */
function aRevisar(dato: DatoExtraido): DatoARevisar {
  return {
    campo: dato.campo,
    etiqueta: dato.etiqueta,
    valor: Array.isArray(dato.valor)
      ? dato.valor.join(", ")
      : dato.valor === null || dato.valor === undefined
        ? ""
        : String(dato.valor),
    dudoso: dato.confianza !== "ALTA",
    fuente:
      dato.fuente.casilla === undefined
        ? undefined
        : `casilla ${dato.fuente.casilla}`,
  };
}

/** María pide un documento: subirlo o decir que no se tiene. */
function PedirDocumento({
  tipo,
  texto,
  falla,
  subiendo,
  alSubir,
  alOmitir,
}: {
  tipo: TipoDocumento;
  texto: string;
  falla?: Documento;
  subiendo: boolean;
  alSubir: (archivo: File) => void;
  alOmitir: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-[22px]">
      {falla !== undefined && (
        <Turno
          turno={{ id: `fallo-${falla.id}`, autor: "ASISTENTE" }}
          cara="noPude"
          tarjeta={
            <TarjetaFalla
              titulo={`No pude leer ${NOMBRE_DOCUMENTO[tipo]}`}
              detalle={falla.error ?? "Probá con otro archivo."}
            />
          }
        />
      )}
      <Turno
        turno={{
          id: `pedir-${tipo}`,
          autor: "ASISTENTE",
          texto: falla === undefined ? texto : "Probá subirlo de nuevo.",
        }}
        tarjeta={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={entrada}
              type="file"
              accept={TIPOS_ACEPTADOS.join(",")}
              className="sr-only"
              aria-label={`Elegir ${NOMBRE_DOCUMENTO[tipo]}`}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo !== undefined) alSubir(archivo);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={subiendo}
              onClick={() => entrada.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-[0.6rem] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {subiendo ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              Subir {NOMBRE_DOCUMENTO[tipo]}
            </button>
            <button
              type="button"
              onClick={alOmitir}
              className="inline-flex h-10 items-center rounded-[0.6rem] px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              No lo tengo
            </button>
          </div>
        }
      />
    </div>
  );
}
