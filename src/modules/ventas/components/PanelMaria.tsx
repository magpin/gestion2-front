"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { useTieneRol } from "@/core/store/authStore";
import { formatCOP, formatFecha, hoyEnColombia } from "@/lib/utils";
import { Maria } from "@/modules/asistente/components/Maria";
import { ROLES_MARIA } from "@/modules/asistente/hooks/usePendientes";
import { facturasApi } from "../services/ventas.service";
import type { VentaDocumentoResumen } from "../types/ventas.types";

/** Días entre dos fechas `aaaa-mm-dd`, sin horas de por medio. */
function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

/**
 * Lo que María ve de la factura que estás mirando. Tanda 3 del diseño, sobre
 * el prototipo `Panel.dc.html` («Ve lo mismo que tú»).
 *
 * **El contexto no lo escribe el modelo**: sale de los números de la factura y
 * de la cartera del cliente, que ya están acá. Abrir una factura no puede
 * costar una llamada al modelo; preguntarle algo más sí, y para eso está el
 * enlace al chat, con la pregunta armada y sin mandar.
 *
 * Solo para quien ve a María, y solo sobre una factura emitida.
 */
export function PanelMaria({
  factura,
  alCobrar,
  alVerAsiento,
}: {
  factura: VentaDocumentoResumen;
  /** Sin esto no se ofrece: quien mira no cobra. */
  alCobrar?: () => void;
  alVerAsiento?: () => void;
}) {
  const veMaria = useTieneRol(...ROLES_MARIA);
  const veAsientos = useTieneRol("DIRECTOR", "CONTADOR", "CONSULTA");
  const numero = `${factura.prefijo ?? ""}${factura.consecutivo}`;

  // La cartera del cliente: las otras suyas que siguen debiendo.
  const { data: delCliente } = useQuery({
    queryKey: ["facturas", "del-cliente", factura.tercero_id],
    queryFn: () => facturasApi.listar({ terceroId: factura.tercero_id }),
    enabled: veMaria,
    staleTime: 60_000,
  });

  if (!veMaria || factura.tipo !== "FACTURA" || factura.estado !== "EMITIDA") return null;

  const pendiente = Number(factura.pendiente);
  const otras = (delCliente?.datos ?? []).filter(
    (f) => f.id !== factura.id && f.estado === "EMITIDA" && Number(f.pendiente) > 0,
  );
  const deudaOtras = otras.reduce((s, f) => s + Number(f.pendiente), 0);
  const dias = diasEntre(factura.fecha, hoyEnColombia());

  const frases = [
    factura.historica
      ? "Es histórica: vino del sistema anterior, así que no tiene asiento aquí."
      : null,
    pendiente > 0
      ? `Falta cobrar ${formatCOP(pendiente)}${dias > 0 ? `, y se emitió hace ${dias === 1 ? "1 día" : `${dias} días`}` : ""}.`
      : Number(factura.saldo_a_favor) > 0
        ? `Está cobrada, y el cliente quedó con ${formatCOP(Number(factura.saldo_a_favor))} a favor.`
        : "Está cobrada entera.",
    delCliente === undefined
      ? null
      : otras.length === 0
        ? "El cliente no debe ninguna otra."
        : `El cliente tiene ${otras.length === 1 ? "otra por cobrar" : `otras ${otras.length} por cobrar`}, por ${formatCOP(deudaOtras)}.`,
  ].filter((f): f is string => f !== null);

  const pregunta = `¿Qué me debe ${factura.tercero_nombre} y qué tiene vencido? Estoy mirando la factura ${numero} del ${formatFecha(factura.fecha)}.`;

  return (
    <aside
      aria-label="Lo que ve María"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4"
    >
      <div className="flex items-center gap-2">
        <Maria estado="reposo" tamano={24} />
        <span className="text-sm font-semibold">María</span>
        <span className="text-xs text-muted-foreground">Ve lo mismo que usted</span>
      </div>
      <p className="m-0 text-[13px] leading-normal">
        Está viendo la {numero} de {factura.tercero_nombre}. {frases.join(" ")}
      </p>
      <div className="flex flex-wrap gap-2">
        {alCobrar !== undefined && pendiente > 0 && (
          <button
            type="button"
            onClick={alCobrar}
            className="inline-flex h-[34px] items-center rounded-md border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground"
          >
            Registrar el cobro
          </button>
        )}
        {alVerAsiento !== undefined && veAsientos && factura.asiento_id !== null && (
          <button
            type="button"
            onClick={alVerAsiento}
            className="inline-flex h-[34px] items-center rounded-md border border-input bg-card px-4 text-[13px] font-medium"
          >
            Ver el asiento y su trazabilidad
          </button>
        )}
        <Link
          href={`/dashboard/asistente?pregunta=${encodeURIComponent(pregunta)}`}
          className="inline-flex h-[34px] items-center rounded-md border border-input bg-card px-4 text-[13px] font-medium"
        >
          Preguntarle por la cartera del cliente
        </Link>
      </div>
    </aside>
  );
}
