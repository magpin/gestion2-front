"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { proximoCodigo, raices } from "../lib/arbol";
import type { CuentaEmpresa } from "../types/plan-cuentas.types";

interface Props {
  cuentas: CuentaEmpresa[];
  /**
   * Sin estas dos el árbol queda de solo lectura. Es como lo usa el asistente:
   * ahí el foco es confirmar la sugerencia, y mantener las cuentas se hace en
   * su propia pantalla.
   */
  /** La madre y el nombre: el código definitivo lo pone el servidor. */
  onCrearAuxiliar?: (datos: { madre: string; nombre: string }) => void;
  onDesactivar?: (id: string) => void;
  /** Volver a ofrecer una cuenta desactivada. */
  onActivar?: (id: string) => void;
  creando?: boolean;
}

/**
 * El plan de la empresa como árbol, con sus auxiliares colgando de la cuenta
 * madre. Es lo que en la base Access de origen eran las `cnfPUCSubcuentas8`:
 *
 *     110505  Caja general
 *        11050501  Caja Efectivo - Computintas
 *        11050502  Caja Efectivo - Technology
 *
 * El decreto termina en seis dígitos. De ahí para abajo el código lo elige la
 * empresa, y por eso el auxiliar se numera solo: quien lo crea está pensando en
 * "la caja del local nuevo", no en qué consecutivo sigue.
 */
export function ArbolPlan({ cuentas, onCrearAuxiliar, onDesactivar, onActivar, creando = false }: Props) {
  const madres = raices(cuentas);
  const hijasDe = (codigo: string) => cuentas.filter((c) => c.codigo_padre === codigo);

  if (cuentas.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
        Sin cuentas. Empiece por las sugerencias.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {madres.map((m) => (
        <Rama
          key={m.id}
          cuenta={m}
          hijas={hijasDe(m.codigo)}
          hijasDe={hijasDe}
          profundidad={0}
          onCrearAuxiliar={onCrearAuxiliar}
          onDesactivar={onDesactivar}
          onActivar={onActivar}
          creando={creando}
        />
      ))}
    </ul>
  );
}

function Rama({
  cuenta,
  hijas,
  hijasDe,
  profundidad,
  onCrearAuxiliar,
  onDesactivar,
  onActivar,
  creando,
}: {
  cuenta: CuentaEmpresa;
  hijas: CuentaEmpresa[];
  hijasDe: (codigo: string) => CuentaEmpresa[];
  profundidad: number;
  onCrearAuxiliar?: (d: { madre: string; nombre: string }) => void;
  onDesactivar?: (id: string) => void;
  /** Volver a ofrecer una cuenta desactivada. */
  onActivar?: (id: string) => void;
  creando: boolean;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nombre, setNombre] = useState("");
  const codigo = proximoCodigo(cuenta.codigo, hijas);

  const confirmar = () => {
    if (nombre.trim().length < 2) return;
    onCrearAuxiliar?.({ madre: cuenta.codigo, nombre: nombre.trim() });
    setNombre("");
    setAgregando(false);
  };

  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
        style={{ paddingLeft: `${profundidad * 20 + 12}px` }}
      >
        <span className="w-28 shrink-0 font-mono text-xs">{cuenta.codigo}</span>
        <span
          className={`min-w-0 flex-1 truncate ${
            cuenta.activa ? "" : "text-muted-foreground line-through"
          }`}
        >
          {cuenta.nombre}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{cuenta.naturaleza}</span>

        {/* Lo que la cuenta le va a exigir a cada asiento. Se muestra aquí porque
            es lo que después frena una factura al digitarla. */}
        {cuenta.exige_tercero && <Etiqueta>tercero</Etiqueta>}
        {cuenta.exige_centro_costo && <Etiqueta>centro de costo</Etiqueta>}
        {cuenta.exige_base_gravable && <Etiqueta>base gravable</Etiqueta>}
        {!cuenta.es_auxiliar && <Etiqueta>agrupa</Etiqueta>}

        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          PUC {cuenta.codigo_puc}
        </span>

        {cuenta.activa && onCrearAuxiliar !== undefined && (
          <Button variant="ghost" size="sm" onClick={() => setAgregando((a) => !a)}>
            <Plus className="size-3.5" />
            Auxiliar
          </Button>
        )}
        {cuenta.activa && onDesactivar !== undefined && (
          <Button variant="ghost" size="sm" onClick={() => onDesactivar(cuenta.id)}>
            Desactivar
          </Button>
        )}
        {!cuenta.activa && onActivar !== undefined && (
          <Button variant="ghost" size="sm" onClick={() => onActivar(cuenta.id)}>
            Activar
          </Button>
        )}
      </div>

      {agregando && (
        <div
          className="flex flex-wrap items-center gap-2 bg-muted/40 px-3 py-2"
          style={{ paddingLeft: `${(profundidad + 1) * 20 + 12}px` }}
        >
          {/* El código va bloqueado: es la propuesta con lo que se ve, y el
              definitivo lo pone el servidor contando también las
              desactivadas, para que no queden repetidos. */}
          <Input
            readOnly
            value={codigo}
            className="w-28 bg-muted font-mono text-muted-foreground"
            aria-label="Código del auxiliar"
          />
          <Input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmar();
              if (e.key === "Escape") setAgregando(false);
            }}
            placeholder={`Ej: ${cuenta.nombre} - sede norte`}
            className="min-w-56 flex-1"
            aria-label="Nombre del auxiliar"
          />
          <Button size="sm" onClick={confirmar} disabled={creando || nombre.trim().length < 2}>
            {creando ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Crear
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAgregando(false)}>
            <X className="size-3.5" />
            Cancelar
          </Button>
        </div>
      )}

      {hijas.length > 0 && (
        <ul className="border-t border-border">
          {hijas.map((h) => (
            <Rama
              key={h.id}
              cuenta={h}
              hijas={hijasDe(h.codigo)}
              hijasDe={hijasDe}
              profundidad={profundidad + 1}
              onCrearAuxiliar={onCrearAuxiliar}
              onDesactivar={onDesactivar}
              onActivar={onActivar}
              creando={creando}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}
