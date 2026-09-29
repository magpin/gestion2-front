"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTieneRol } from "@/core/store/authStore";
import { Maria } from "@/modules/asistente/components/Maria";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { DetalleFacturaLeida } from "../components/DetalleFacturaLeida";
import { lecturasApi } from "../services/lecturas.service";
import type { LecturaFactura } from "../types/lecturas.types";

const CLAVE = ["lecturas-factura"];

/** Lo que la API acepta leer. Un `.xls` viejo no se puede abrir: se avisa antes. */
const TIPOS = "application/pdf,image/jpeg,image/png,image/webp";

/** Cada cuánto se vuelve a preguntar mientras hay una lectura en curso. */
const REFRESCO_MS = 2500;

/**
 * Las facturas que María leyó.
 *
 * Es la única pantalla del sistema donde **lo que se ve no está registrado**:
 * son propuestas. Por eso no hay ninguna acción que escriba desde la lista —
 * registrar se aprieta adentro, después de mirar los renglones—.
 *
 * Se refresca sola mientras algo está en curso, y **deja de hacerlo cuando no
 * queda nada leyendo**: un intervalo que no para le pega a la API para siempre
 * en una pestaña que alguien dejó abierta.
 */
export function LecturasSeccion() {
  const cliente = useQueryClient();
  const puedeSubir = useTieneRol(
    "COMPRAS",
    "DIRECTOR",
    "CONTADOR",
    "ADMIN_TENANT",
  );
  const [abierta, setAbierta] = useState<LecturaFactura | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const {
    data: lecturas,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: CLAVE,
    queryFn: lecturasApi.listar,
    meta: SILENCIOSO,
    refetchInterval: (q) =>
      (q.state.data ?? []).some(
        (l) => l.estado === "EN_COLA" || l.estado === "LEYENDO",
      )
        ? REFRESCO_MS
        : false,
  });

  const subir = useMutation({
    mutationFn: async (archivo: File) => {
      const { url, clave } = await lecturasApi.urlDeCarga(archivo.type);
      await lecturasApi.subirAlBucket(url, archivo, archivo.type);
      return lecturasApi.encolar(clave);
    },
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Subida. María la está leyendo.");
    },
    // `falla` y no `e.message`: en un error HTTP, `message` es el genérico de
    // axios («Request failed with status code 400») y esconde lo que dijo el
    // servidor, que es lo que explica qué hacer.
    onError: (e: unknown) => aviso.falla(e),
  });

  const elegir = (archivo: File | undefined) => {
    if (archivo === undefined) return;
    if (!TIPOS.split(",").includes(archivo.type)) {
      aviso.error(
        "Solo puedo leer facturas en PDF o en foto. Si es un Excel, registrala a mano.",
      );
      return;
    }
    subir.mutate(archivo);
  };

  // La lista abierta y la fila pueden desincronizarse: la lista se refresca
  // sola y el diálogo se quedaría con la versión de cuando se abrió.
  const enPantalla =
    abierta === null
      ? null
      : (lecturas?.find((l) => l.id === abierta.id) ?? abierta);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Maria estado={subir.isPending ? "leyendo" : "reposo"} tamano={32} />
          <div>
            <p className="text-sm font-medium">Subí la factura y yo la leo</p>
            <p className="text-xs text-muted-foreground">
              En PDF o en foto. Te digo qué entendí y qué me falta; registrar lo
              apretás vos.
            </p>
          </div>
        </div>

        {puedeSubir && (
          <>
            <input
              ref={entrada}
              type="file"
              accept={TIPOS}
              className="sr-only"
              aria-label="Elegir la factura para leer"
              onChange={(e) => {
                elegir(e.target.files?.[0]);
                // Sin esto, elegir dos veces el mismo archivo no dispara nada.
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              className="h-11 rounded-xl px-5"
              disabled={subir.isPending}
              onClick={() => entrada.current?.click()}
            >
              {subir.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Subir una factura
            </Button>
          </>
        )}
      </div>

      {lecturas === undefined ? (
        isError ? (
          <ErrorCarga
            error={error}
            titulo="No se pudieron leer las facturas que leyó María"
            onReintentar={refetch}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Cargando…
          </p>
        )
      ) : lecturas.length === 0 ? (
        <EmptyState
          icon={Upload}
          titulo="Todavía no le pasaste ninguna factura a María"
          descripcion={
            puedeSubir
              ? "Subí la factura de un proveedor, en PDF o en foto. María la lee, te dice qué le falta y la registrás vos después de revisarla."
              : "Cuando alguien de compras suba la factura de un proveedor, la vas a ver acá con lo que leyó María."
          }
          accion={
            puedeSubir && !subir.isPending
              ? {
                  label: "Subir una factura",
                  onClick: () => entrada.current?.click(),
                }
              : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {lecturas.map((lectura) => (
            <Fila
              key={lectura.id}
              lectura={lectura}
              onAbrir={() => setAbierta(lectura)}
            />
          ))}
        </ul>
      )}

      <Dialog
        open={enPantalla !== null}
        onOpenChange={(v) => !v && setAbierta(null)}
      >
        {/* `size` y no una clase de ancho: el `max-w` del componente va después
            en la cascada y le gana a cualquiera que se le pase por `className`. */}
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Lo que leí de esta factura</DialogTitle>
              <DialogDescription>
                {enPantalla?.compra == null
                  ? "Nada de esto está registrado todavía."
                  : "Así quedó cuando se registró."}
              </DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            {enPantalla !== null && (
              <DetalleFacturaLeida
                lectura={enPantalla}
                onRegistrada={() => setAbierta(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fila({
  lectura,
  onAbrir,
}: {
  lectura: LecturaFactura;
  onAbrir: () => void;
}) {
  const estado = estadoDe(lectura);
  const factura = lectura.extraido?.factura;
  const enCurso = lectura.estado === "EN_COLA" || lectura.estado === "LEYENDO";

  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        disabled={enCurso}
        className={cn(
          "flex w-full flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors",
          enCurso ? "opacity-70" : "hover:border-brand/40",
        )}
      >
        <Maria estado={estado.cara} tamano={28} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {factura === undefined
              ? "Leyendo…"
              : `${factura.proveedor.nombre}${factura.numero === null ? "" : ` · ${factura.numero}`}`}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {estado.texto}
          </p>
        </div>

        {factura !== undefined && (
          <div className="text-right">
            <p className="font-mono text-sm">
              {formatCOP(factura.impreso.total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFecha(factura.fecha)}
            </p>
          </div>
        )}
      </button>
    </li>
  );
}

/**
 * Qué cara pone María y qué dice la fila.
 *
 * Cuatro estados y no tres: **«no cuadra» y «me faltan datos» son cosas
 * distintas**. Lo primero no se puede contestar —lo leído se contradice con lo
 * impreso— y lo segundo sí. Juntarlos en un «revisá» haría que se abra la
 * pantalla para descubrir cuál de los dos es.
 */
function estadoDe(lectura: LecturaFactura): {
  cara: "leyendo" | "noPude" | "espera" | "lista" | "reposo";
  texto: string;
} {
  if (lectura.estado === "EN_COLA" || lectura.estado === "LEYENDO") {
    return { cara: "leyendo", texto: "Leyéndola…" };
  }

  // Va antes que todo lo demás: una vez registrada, lo que le faltaba a la
  // lectura dejó de importar. Sin esto la fila seguía diciendo «me faltan 2
  // datos» sobre algo que ya es una compra con su asiento.
  if (lectura.compra !== null) {
    return {
      cara: "lista",
      texto: `Registrada como ${lectura.compra.numero}${lectura.compra.estado === "ANULADA" ? ", después anulada" : ""}.`,
    };
  }
  if (lectura.estado === "FALLO") {
    return { cara: "noPude", texto: lectura.error ?? "No la pude leer." };
  }
  if (lectura.estado === "DESCARTADO") {
    return { cara: "reposo", texto: `Descartada: ${lectura.motivoDescarte ?? "sin motivo"}` };
  }

  const cruzada = lectura.extraido;
  if (cruzada === null) {
    return { cara: "noPude", texto: "No quedó nada que mostrar." };
  }

  const sinCuadrar = cruzada.comprobaciones.filter((c) => !c.cuadra);
  if (sinCuadrar.length > 0) {
    return {
      cara: "noPude",
      texto: `Las cuentas no dan: ${sinCuadrar.map((c) => c.que.toLowerCase()).join("; ")}.`,
    };
  }
  if (cruzada.preguntas.length > 0) {
    return {
      cara: "espera",
      texto:
        cruzada.preguntas.length === 1
          ? "Me falta un dato."
          : `Me faltan ${cruzada.preguntas.length} datos.`,
    };
  }
  return {
    cara: "lista",
    texto: `${cruzada.renglones.length} ${cruzada.renglones.length === 1 ? "renglón" : "renglones"} · lista para registrar.`,
  };
}
