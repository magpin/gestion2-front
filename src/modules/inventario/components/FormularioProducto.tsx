"use client";

import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  CampoPesos,
  comoNumero,
  comoTexto,
} from "@/components/shared/CampoNumero";
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
import { categoriasApi } from "../services/inventario.service";
import {
  NOMBRE_UNIDAD,
  UNIDADES_MEDIDA,
  TARIFAS_IVA,
  type ProductoResumen,
} from "../types/inventario.types";

const esquema = z.object({
  codigo: z
    .string()
    .min(1, "Requerido")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones"),
  nombre: z.string().min(2, "Requerido").max(200),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  ivaTarifa: z.union([z.literal(0), z.literal(5), z.literal(19)]),
  // Opcional: sin ella, el producto toma la cuenta de inventario de la empresa.
  cuentaInventarioId: z.string().optional(),
  precioVenta: z.number().min(0, "No puede ser negativo"),
  categoriaId: z.string().optional(),
  codigoBarras: z
    .string()
    .trim()
    .min(6, "Muy corto para ser un código de barras")
    .max(48)
    .optional()
    .or(z.literal("")),
});

export type DatosProducto = z.infer<typeof esquema>;

const VACIO: DatosProducto = {
  codigo: "",
  nombre: "",
  unidadMedida: "UND",
  ivaTarifa: 19,
  cuentaInventarioId: "",
  precioVenta: 0,
  categoriaId: "",
  codigoBarras: "",
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
  edicion = false,
  inicial,
  codigoSugerido,
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
  /**
   * Corrigiendo un producto que ya existe. Deja fijos los tres datos que el
   * backend no acepta en el PATCH: el código (es la identidad del producto en
   * el kardex), la cuenta de inventario (cambiarla dejaría los movimientos
   * viejos apuntando a una cuenta que el producto ya no dice usar) y el
   * precio, que tiene su propio formulario porque abre una fila nueva en el
   * historial en vez de pisar la anterior.
   */
  edicion?: boolean;
  /** El producto a corregir. Sin esto, el formulario da de alta uno nuevo. */
  inicial?: ProductoResumen;
  /** Lo que se venía buscando cuando el producto no apareció, como código. */
  codigoSugerido?: string;
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
    defaultValues:
      inicial === undefined
        ? { ...VACIO, codigo: codigoSugerido ?? "" }
        : {
            codigo: inicial.codigo,
            nombre: inicial.nombre,
            unidadMedida: inicial.unidad_medida,
            ivaTarifa: Number(inicial.iva_tarifa) as DatosProducto["ivaTarifa"],
            cuentaInventarioId: inicial.cuenta_inventario_id,
            categoriaId: inicial.categoria_id ?? "",
            codigoBarras: inicial.codigo_barras ?? "",
            // No viaja en el PATCH; está para que el esquema valide.
            precioVenta: 0,
          },
  });
  const errores = form.formState.errors;

  // Solo las activas: clasificar en una categoría que alguien archivó es
  // volver a abrirla por la puerta de atrás.
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => categoriasApi.listar(),
  });

  // `cuenta` vive afuera (el padre necesita el objeto completo), pero
  // `cuentaInventarioId` es lo que valida el esquema: sin este puente el
  // formulario nunca deja de ver el campo como vacío, aunque la pantalla ya
  // muestre una cuenta elegida.
  const elegirCuenta = (c: CuentaEmpresa) => {
    onCuenta(c);
    form.setValue("cuentaInventarioId", c.id, { shouldValidate: true });
  };

  return (
    <form
      id={id}
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((d) =>
        alGuardar({
          ...d,
          cuentaInventarioId: cuenta?.id ?? inicial?.cuenta_inventario_id ?? "",
          cuentaCostoVentaId: cuentaCosto?.id,
          cuentaIngresoId: cuentaIngreso?.id,
        }),
      )}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="codigo"
          etiqueta="Código *"
          error={errores.codigo?.message}
          ayuda={
            edicion
              ? "El código no se cambia: es como el kardex nombra a este producto"
              : undefined
          }
          escala="grande"
        >
          {edicion ? (
            <p
              id="codigo"
              className={`flex items-center rounded-xl border border-border bg-muted/40 font-mono text-sm font-medium ${CONTROL}`}
            >
              {inicial?.codigo}
            </p>
          ) : (
            <Input
              id="codigo"
              className={`font-mono ${CONTROL}`}
              placeholder="Ej. FER-001"
              {...form.register("codigo")}
            />
          )}
        </Campo>

        <Campo
          id="nombre"
          etiqueta="Nombre *"
          error={errores.nombre?.message}
          escala="grande"
        >
          <Input
            id="nombre"
            className={CONTROL}
            placeholder="Nombre del producto"
            {...form.register("nombre")}
          />
        </Campo>

        {/* El lector escribe aquí y manda Enter: el campo acepta lo que venga
            del empaque tal cual, sin normalizar, porque normalizarlo rompería
            el cruce con lo que el lector lee. */}
        <Campo
          id="codigoBarras"
          etiqueta="Código de barras"
          error={errores.codigoBarras?.message}
          ayuda="Pase el lector o escríbalo. Opcional."
          escala="grande"
        >
          <Input
            id="codigoBarras"
            className={`font-mono ${CONTROL}`}
            placeholder="7702001012345"
            {...form.register("codigoBarras")}
          />
        </Campo>

        <Campo id="categoriaId" etiqueta="Categoría" escala="grande">
          <Select
            value={form.watch("categoriaId") || "sin"}
            onValueChange={(v) =>
              form.setValue("categoriaId", v === "sin" || v === null ? "" : v)
            }
          >
            <SelectTrigger id="categoriaId" className={`w-full ${CONTROL}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sin">Sin categoría</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo id="unidadMedida" etiqueta="Unidad de medida" escala="grande">
          <Select
            value={form.watch("unidadMedida")}
            onValueChange={(v) =>
              form.setValue("unidadMedida", v as DatosProducto["unidadMedida"])
            }
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
            onValueChange={(v) =>
              form.setValue(
                "ivaTarifa",
                Number(v) as DatosProducto["ivaTarifa"],
              )
            }
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

        {/* Las cuentas del producto son opcionales: sin elegir nada, toma las
            de la empresa (Plan de cuentas → Cuentas automáticas). Quedan a la
            mano para quien necesite otra, sin estorbar a quien no. */}
        <details className="rounded-2xl border border-border p-4 sm:col-span-2">
          <summary className="cursor-pointer select-none text-sm font-semibold">
            Cuentas contables <span className="font-normal text-muted-foreground">(opcional)</span>
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Si no elige ninguna, el producto usa las cuentas de la empresa para inventario, costo de venta e
            ingreso.
          </p>
          <div className="mt-4 grid gap-5">
            {!edicion && (
              <Campo
                id="cuentaInventarioId"
                etiqueta="Cuenta de inventario"
                error={errores.cuentaInventarioId?.message}
                ayuda="No se puede cambiar después de creado"
                escala="grande"
              >
                <SelectorCuenta
                  crear={{ madres: ["1435"] }}
                  valor={cuenta}
                  onElegir={elegirCuenta}
                  invalido={Boolean(errores.cuentaInventarioId)}
                />
              </Campo>
            )}

            <Campo id="cuentaCostoVentaId" etiqueta="Cuenta de costo de venta" escala="grande">
              <SelectorCuenta valor={cuentaCosto} onElegir={onCuentaCosto} crear={{ madres: ["61"] }} />
            </Campo>

            <Campo id="cuentaIngresoId" etiqueta="Cuenta de ingreso" escala="grande">
              <SelectorCuenta valor={cuentaIngreso} onElegir={onCuentaIngreso} crear={{ madres: ["41"] }} />
            </Campo>
          </div>
        </details>

        {!edicion && (
          <Campo
            id="precioVenta"
            etiqueta="Precio de venta inicial *"
            error={errores.precioVenta?.message}
            escala="grande"
          >
            <Controller
              control={form.control}
              name="precioVenta"
              render={({ field }) => (
                <CampoPesos
                  id="precioVenta"
                  className={CONTROL}
                  value={comoTexto(field.value)}
                  onChange={(v) => field.onChange(comoNumero(v))}
                  onBlur={field.onBlur}
                />
              )}
            />
          </Campo>
        )}
      </div>
    </form>
  );
}
