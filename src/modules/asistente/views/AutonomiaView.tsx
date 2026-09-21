"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { FilaRegla } from "../components/FilaRegla";
import { BotonTarjeta } from "../components/Piezas";
import { useCambiarAutonomia, useEstadoAutonomia, useResumenDelDia } from "../hooks/useAutonomia";

const ACCION = { COBRO: "Cobro", PAGO: "Pago" } as const;

/**
 * «Hasta dónde llega el asistente» (paso 8 de `docs/planes/asistente-autonomia.md`),
 * sobre el prototipo `docs/asistente-ia-diseno/Autonomia.dc.html`.
 *
 * Tipo por tipo, «solo proponer» o «confirmar si pasa todo» bajo un límite.
 * Arriba el interruptor que pausa todo; abajo lo que ninguna regla apaga y lo
 * que el asistente hizo solo hoy. **Lo que se registra sin preguntar no puede
 * pasar desapercibido**: por eso todos lo ven, aunque solo la dirección lo
 * cambie.
 */
export function AutonomiaView() {
  const { data: estado, isPending } = useEstadoAutonomia();
  const { data: resumen } = useResumenDelDia();
  const { regla, pausa } = useCambiarAutonomia();

  if (isPending || estado === undefined) {
    return <div className="text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/asistente"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al asistente
        </Link>
        <h1 className="m-0 text-xl font-semibold">Hasta dónde llega el asistente</h1>
        <p className="m-0 max-w-2xl text-sm text-muted-foreground">
          Decidís tipo por tipo. Todo empieza en «solo proponer»: el asistente arma el cobro o el
          pago y una persona lo confirma. Soltá lo que veas que acierta; la columna de la derecha
          dice cuántas veces hubo que corregirlo.
        </p>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {estado.pausada ? "La autonomía está pausada" : "La autonomía está activa"}
          </span>
          <span className="text-xs text-muted-foreground">
            {estado.pausada
              ? "Todo espera una confirmación, sin importar las reglas. Las reglas se conservan."
              : "Las reglas de abajo se aplican. Pausar vuelve todo a solo proponer de un clic."}
          </span>
        </div>
        {estado.puedeEditar && (
          <BotonTarjeta
            principal={!estado.pausada}
            disabled={pausa.isPending}
            onClick={() =>
              pausa.mutate(!estado.pausada, {
                onError: (e) => aviso.error("No se pudo cambiar", mensajeDeError(e)),
              })
            }
          >
            {estado.pausada ? "Reanudar" : "Pausar la autonomía"}
          </BotonTarjeta>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card px-5">
        {estado.reglas.map((r) => (
          <FilaRegla
            key={`${r.accion}-${r.modo}-${r.limite ?? ""}`}
            regla={r}
            puedeEditar={estado.puedeEditar}
            historiaMinima={estado.historiaMinima}
            guardando={regla.isPending && regla.variables?.accion === r.accion}
            alGuardar={(modo, limite) =>
              regla.mutate(
                { accion: r.accion, modo, limite },
                {
                  onSuccess: () => aviso.exito("Regla guardada"),
                  onError: (e) => aviso.error("No se guardó la regla", mensajeDeError(e)),
                },
              )
            }
          />
        ))}
      </section>
      {!estado.puedeEditar && (
        <p className="m-0 -mt-3 text-xs text-muted-foreground">
          Solo la dirección cambia estas reglas.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="m-0 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Siempre te pregunta, así lo sueltes todo
        </h2>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px] text-muted-foreground">
          {estado.guardas.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-sm font-semibold">Hoy</h2>
        {resumen === undefined ||
        (resumen.registradas.length === 0 && resumen.apartadas.length === 0) ? (
          <p className="m-0 text-[13px] text-muted-foreground">
            Hoy no registró nada solo ni apartó nada.
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-[13px]">
            {resumen.registradas.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-medium">Registró solo</span>
                {resumen.registradas.map((r, i) => (
                  <span key={i}>
                    {r.hora} · {ACCION[r.accion]} de {r.numero} · {r.tercero} ·{" "}
                    <span className="tabular-nums">{formatCOP(r.valor)}</span>
                  </span>
                ))}
              </div>
            )}
            {resumen.apartadas.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-medium">Apartó, esperando a una persona</span>
                {resumen.apartadas.map((a, i) => (
                  <span key={i}>
                    {ACCION[a.accion]} de {a.numero} · {a.tercero} —{" "}
                    <span className="text-muted-foreground">
                      {a.motivo.replace(/^No se registró sola: /, "")}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
