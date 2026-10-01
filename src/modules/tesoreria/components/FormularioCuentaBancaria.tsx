"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import {
  NOMBRE_TIPO_CUENTA_BANCARIA,
  TIPOS_CUENTA_BANCARIA,
} from "../types/bancos.types";

const esquema = z.object({
  banco: z.string().min(2, "Requerido").max(100),
  numeroCuenta: z.string().min(1, "Requerido").max(40),
  tipoCuenta: z.enum(TIPOS_CUENTA_BANCARIA),
  cuentaId: z.string().min(1, "Elija una cuenta contable"),
});

export type DatosCuentaBancaria = z.infer<typeof esquema>;

const VACIO: DatosCuentaBancaria = {
  banco: "",
  numeroCuenta: "",
  tipoCuenta: "AHORROS",
  cuentaId: "",
};
const CONTROL = "h-11 rounded-xl px-4";

/**
 * Alta de una cuenta bancaria. Sin edición después de creada — ni el
 * banco/número, ni la cuenta contable: cambiarla dejaría el libro viejo
 * apuntando a un auxiliar que esta cuenta ya no dice usar, mismo
 * criterio que `cuentaId` en `FormularioCaja`.
 */
export function FormularioCuentaBancaria({
  id,
  cuenta,
  onCuenta,
  alGuardar,
}: {
  id: string;
  /** La cuenta contable elegida, controlada afuera porque `SelectorCuenta` trabaja con el objeto completo. */
  cuenta: CuentaEmpresa | null;
  onCuenta: (cuenta: CuentaEmpresa) => void;
  alGuardar: (datos: DatosCuentaBancaria) => void;
}) {
  const form = useForm<DatosCuentaBancaria>({
    resolver: zodResolver(esquema),
    defaultValues: VACIO,
  });
  const errores = form.formState.errors;
  const tipoCuenta = form.watch("tipoCuenta");

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
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="banco" etiqueta="Banco *" error={errores.banco?.message} escala="grande">
          <Input id="banco" className={CONTROL} placeholder="Ej. Bancolombia" {...form.register("banco")} />
        </Campo>

        <Campo
          id="numeroCuenta"
          etiqueta="Número de cuenta *"
          error={errores.numeroCuenta?.message}
          escala="grande"
        >
          <Input id="numeroCuenta" className={`font-mono ${CONTROL}`} {...form.register("numeroCuenta")} />
        </Campo>
      </div>

      <Campo id="tipoCuenta" etiqueta="Tipo *" escala="grande">
        <Select
          value={tipoCuenta}
          onValueChange={(v) => form.setValue("tipoCuenta", v as DatosCuentaBancaria["tipoCuenta"])}
        >
          <SelectTrigger id="tipoCuenta" className={`w-full ${CONTROL}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_CUENTA_BANCARIA.map((t) => (
              <SelectItem key={t} value={t}>
                {NOMBRE_TIPO_CUENTA_BANCARIA[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

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
          crear={{ madres: ["111005"], nombreSugerido: nombreDelAuxiliar(form.watch("banco"), form.watch("numeroCuenta")) }}
        />
      </Campo>
    </form>
  );
}

/** «Bancos - Bancolombia ···1234»: el nombre que se propone para su auxiliar. */
export function nombreDelAuxiliar(banco: string, numero: string): string | undefined {
  if (banco.trim() === "") return undefined;
  const ultimos = numero.replace(/\D/g, "").slice(-4);
  return `Bancos - ${banco.trim()}${ultimos ? ` ···${ultimos}` : ""}`;
}
