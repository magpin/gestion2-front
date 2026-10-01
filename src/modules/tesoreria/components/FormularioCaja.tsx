"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useManejaCajaMenor } from "@/core/hooks/useManejaCajaMenor";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { Campo } from "@/modules/configuracion/components/Campo";
import { empresaApi } from "@/modules/configuracion/services/nucleo.service";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { NOMBRE_TIPO_CAJA, TIPOS_CAJA } from "../types/tesoreria.types";

// `sedeId` no se valida acá con un `refine`: `ck_caja_sede` en el backend es
// quien decide (PRINCIPAL la exige, MENOR no la acepta) — mismo criterio
// que `CrearCajaDto` en el backend: duplicar la regla acá es mantenerla en
// dos lugares que tarde o temprano se separan.
const esquema = z.object({
  nombre: z.string().min(2, "Requerido").max(200),
  tipo: z.enum(TIPOS_CAJA),
  sedeId: z.string().optional(),
  cuentaId: z.string().min(1, "Elija una cuenta contable"),
  responsableTerceroId: z.string().optional(),
});

export type DatosCaja = z.infer<typeof esquema>;

const VACIO: DatosCaja = { nombre: "", tipo: "PRINCIPAL", sedeId: "", cuentaId: "", responsableTerceroId: undefined };
const CONTROL = "h-11 rounded-xl px-4";

/**
 * Alta de una caja. Sin edición de tipo/sede/cuenta después de creada —el
 * maestro solo permite editar el nombre (`EditarCajaDto` del backend no
 * acepta más), y la cuenta tampoco: cambiarla dejaría el libro viejo
 * apuntando a una cuenta que la caja ya no dice usar, mismo criterio que
 * `cuentaInventarioId` en Inventario.
 */
export function FormularioCaja({
  id,
  cuenta,
  onCuenta,
  alGuardar,
}: {
  id: string;
  /** La cuenta elegida, controlada afuera porque `SelectorCuenta` trabaja con el objeto completo, no solo el id. */
  cuenta: CuentaEmpresa | null;
  onCuenta: (cuenta: CuentaEmpresa) => void;
  alGuardar: (datos: DatosCaja) => void;
}) {
  const { data: sedes = [] } = useQuery({
    queryKey: ["sedes"],
    queryFn: empresaApi.sedes,
    staleTime: 5 * 60_000,
  });

  // Si la empresa no maneja caja menor, no hay nada que elegir: toda caja es
  // principal, igual que no se muestra el IVA a quien no lo liquida.
  const manejaCajaMenor = useManejaCajaMenor();
  const [responsable, setResponsable] = useState<TerceroResumen | null>(null);

  const form = useForm<DatosCaja>({
    resolver: zodResolver(esquema),
    defaultValues: VACIO,
  });
  const errores = form.formState.errors;
  const tipo = form.watch("tipo");

  const elegirCuenta = (c: CuentaEmpresa) => {
    onCuenta(c);
    form.setValue("cuentaId", c.id, { shouldValidate: true });
  };

  return (
    <form
      id={id}
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((d) =>
        alGuardar({ ...d, cuentaId: cuenta?.id ?? "" }),
      )}
    >
      <Campo id="nombre" etiqueta="Nombre *" error={errores.nombre?.message} escala="grande">
        <Input id="nombre" className={CONTROL} placeholder="Ej. Caja principal Chapinero" {...form.register("nombre")} />
      </Campo>

      {manejaCajaMenor && (
      <Campo id="tipo" etiqueta="Tipo *" escala="grande">
        <Select
          value={tipo}
          onValueChange={(v) => form.setValue("tipo", v as DatosCaja["tipo"])}
        >
          <SelectTrigger id="tipo" className={`w-full ${CONTROL}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_CAJA.map((t) => (
              <SelectItem key={t} value={t}>
                {NOMBRE_TIPO_CAJA[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>
      )}

      {tipo === "PRINCIPAL" && (
        <Campo
          id="sedeId"
          etiqueta="Sede *"
          ayuda="Una caja principal vive en una sede; el arqueo es por punto de venta"
          escala="grande"
        >
          <Select
            items={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
            value={form.watch("sedeId")}
            onValueChange={(v) => form.setValue("sedeId", v ?? undefined)}
          >
            <SelectTrigger id="sedeId" className={`w-full ${CONTROL}`}>
              <SelectValue placeholder="Seleccione una sede" />
            </SelectTrigger>
            <SelectContent>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      )}

      <Campo
        id="cuentaId"
        etiqueta="Cuenta contable *"
        error={errores.cuentaId?.message}
        ayuda="No se puede cambiar después de creada"
        escala="grande"
      >
        <SelectorCuenta
          valor={cuenta}
          onElegir={elegirCuenta}
          invalido={Boolean(errores.cuentaId)}
          crear={{ madres: [tipo === "MENOR" ? "110510" : "110505"], nombreSugerido: form.watch("nombre") || undefined }}
        />
      </Campo>

      <Campo
        id="responsable"
        etiqueta="Responsable"
        ayuda="El empleado que responde por la caja: a quién se le cobra un faltante"
        escala="grande"
      >
        <SelectorTercero
          rol="empleado"
          valor={responsable}
          onElegir={(t) => {
            setResponsable(t);
            form.setValue("responsableTerceroId", t.id);
          }}
        />
      </Campo>
    </form>
  );
}
