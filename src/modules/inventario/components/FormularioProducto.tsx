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
import { NOMBRE_UNIDAD, UNIDADES_MEDIDA, TARIFAS_IVA } from "../types/inventario.types";

const esquema = z.object({
  codigo: z
    .string()
    .min(1, "Requerido")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones"),
  nombre: z.string().min(2, "Requerido").max(200),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  ivaTarifa: z.union([z.literal(0), z.literal(5), z.literal(19)]),
  cuentaInventarioId: z.string().min(1, "Elegí una cuenta de inventario"),
  precioVenta: z.number().min(0, "No puede ser negativo"),
});

export type DatosProducto = z.infer<typeof esquema>;

const VACIO: DatosProducto = {
  codigo: "",
  nombre: "",
  unidadMedida: "UND",
  ivaTarifa: 19,
  cuentaInventarioId: "",
  precioVenta: 0,
};

/** La escala del modal: control cómodo, no fila de planilla. */
const CONTROL = "h-11 rounded-xl px-4";

/**
 * Ficha de alta de un producto. Solo crea — este módulo no ofrece editar
 * código, cuenta de inventario ni precio desde acá: la cuenta no se puede
 * cambiar después de creado el producto (dejaría el kardex viejo apuntando a
 * una cuenta que el producto ya no dice usar) y el precio tiene su propio
 * formulario (`FormularioPrecio`), porque cambiarlo abre una fila nueva en el
 * historial en vez de pisar la anterior.
 *
 * No trae sus propios botones: vive dentro de un modal, el pie los dispara
 * por `form={id}`.
 */
export function FormularioProducto({
  id,
  cuenta,
  onCuenta,
  cuentaCosto,
  onCuentaCosto,
  cuentaIngreso,
  onCuentaIngreso,
  alGuardar,
}: {
  /** El `id` del `<form>`, para que el botón del pie del modal lo envíe. */
  id: string;
  /** La cuenta elegida, controlada afuera porque `SelectorCuenta` trabaja con el objeto completo, no solo el id. */
  cuenta: CuentaEmpresa | null;
  onCuenta: (cuenta: CuentaEmpresa) => void;
  /** La cuenta de costo de venta. Opcional: se puede vender más adelante sin haberla elegido al crear. */
  cuentaCosto: CuentaEmpresa | null;
  onCuentaCosto: (cuenta: CuentaEmpresa) => void;
  /** La cuenta de ingreso — pareja de `cuentaCosto`, mismo criterio: opcional acá. */
  cuentaIngreso: CuentaEmpresa | null;
  onCuentaIngreso: (cuenta: CuentaEmpresa) => void;
  alGuardar: (
    datos: DatosProducto & {
      cuentaCostoVentaId?: string;
      cuentaIngresoId?: string;
    },
  ) => void;
}) {
  const form = useForm<DatosProducto>({
    resolver: zodResolver(esquema),
    defaultValues: VACIO,
  });
  const errores = form.formState.errors;

  return (
    <form
      id={id}
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((d) =>
        alGuardar({
          ...d,
          cuentaInventarioId: cuenta?.id ?? "",
          cuentaCostoVentaId: cuentaCosto?.id,
          cuentaIngresoId: cuentaIngreso?.id,
        }),
      )}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="codigo" etiqueta="Código *" error={errores.codigo?.message} escala="grande">
          <Input
            id="codigo"
            className={`font-mono ${CONTROL}`}
            placeholder="Ej. FER-001"
            {...form.register("codigo")}
          />
        </Campo>

        <Campo id="nombre" etiqueta="Nombre *" error={errores.nombre?.message} escala="grande">
          <Input id="nombre" className={CONTROL} placeholder="Nombre del producto" {...form.register("nombre")} />
        </Campo>

        <Campo id="unidadMedida" etiqueta="Unidad de medida" escala="grande">
          <Select
            value={form.watch("unidadMedida")}
            onValueChange={(v) => form.setValue("unidadMedida", v as DatosProducto["unidadMedida"])}
          >
            <SelectTrigger id="unidadMedida" className={`w-full ${CONTROL}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES_MEDIDA.map((u) => (
                <SelectItem key={u} value={u}>
                  {NOMBRE_UNIDAD[u]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo id="ivaTarifa" etiqueta="Tarifa de IVA" escala="grande">
          <Select
            value={String(form.watch("ivaTarifa"))}
            onValueChange={(v) => form.setValue("ivaTarifa", Number(v) as DatosProducto["ivaTarifa"])}
          >
            <SelectTrigger id="ivaTarifa" className={`w-full ${CONTROL}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARIFAS_IVA.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo
          id="cuentaInventarioId"
          etiqueta="Cuenta de inventario *"
          error={errores.cuentaInventarioId?.message}
          ayuda="No se puede cambiar después de creado"
          escala="grande"
          className="sm:col-span-2"
        >
          <SelectorCuenta valor={cuenta} onElegir={onCuenta} invalido={Boolean(errores.cuentaInventarioId)} />
        </Campo>

        <Campo
          id="cuentaCostoVentaId"
          etiqueta="Cuenta de costo de venta"
          ayuda="Opcional acá — hace falta recién cuando se venda este producto"
          escala="grande"
          className="sm:col-span-2"
        >
          <SelectorCuenta valor={cuentaCosto} onElegir={onCuentaCosto} />
        </Campo>

        <Campo
          id="cuentaIngresoId"
          etiqueta="Cuenta de ingreso"
          ayuda="Opcional acá — hace falta recién cuando se venda este producto"
          escala="grande"
          className="sm:col-span-2"
        >
          <SelectorCuenta valor={cuentaIngreso} onElegir={onCuentaIngreso} />
        </Campo>

        <Campo
          id="precioVenta"
          etiqueta="Precio de venta inicial *"
          error={errores.precioVenta?.message}
          escala="grande"
        >
          <Input
            id="precioVenta"
            type="number"
            min="0"
            step="0.01"
            className={CONTROL}
            {...form.register("precioVenta", { valueAsNumber: true })}
          />
        </Campo>
      </div>
    </form>
  );
}
