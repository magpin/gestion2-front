"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { CampoCantidad, CampoPrecio } from "@/components/shared/CampoNumero";
import { mostrarNumero } from "@/lib/numeros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCOP, formatCOPExacto as pesos } from "@/lib/utils";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
import type { Concepto } from "@/modules/conceptos/types/conceptos.types";
import { SelectorProducto } from "@/modules/inventario/components/SelectorProducto";
import {
  kardexApi,
  precioApi,
} from "@/modules/inventario/services/inventario.service";
import type { ProductoResumen } from "@/modules/inventario/types/inventario.types";
import { useTotalesBorrador } from "../hooks/useTotalesBorrador";

/** Una línea mientras se edita. La cantidad es texto: vacío es "sin llenar", no cero. */
export interface LineaVentaBorrador {
  /** Clave de React. No viaja al servidor: el `orden` lo pone el backend. */
  clave: number;
  producto: ProductoResumen | null;
  cantidad: string;
  /**
   * El precio sin IVA digitado. Vacío en la de producto es «el de lista», y
   * entonces no se manda. En la línea de concepto es el precio que se cobra.
   */
  precioUnitario: string;
  /**
   * Solo en la factura: un producto, o un servicio u otro ingreso por
   * concepto (Fase 8). Sin esto, producto.
   */
  tipo?: "PRODUCTO" | "CONCEPTO";
  /** Solo en la de concepto: el concepto de INGRESO; la cuenta la pone él. */
  concepto?: Concepto | null;
  /** Solo en la de concepto: qué se cobró. */
  detalle?: string;
  /** Solo en la de concepto: la tarifa la decide quien factura. */
  ivaTarifa?: string;
}

/** Una línea de servicio u otro ingreso, vacía. */
export function lineaConceptoVacia(): LineaVentaBorrador {
  return {
    ...lineaVentaVacia(),
    tipo: "CONCEPTO",
    concepto: null,
    detalle: "",
    ivaTarifa: "19",
    cantidad: "1",
  };
}

/** Si la línea ya tiene lo mínimo: el producto, o el concepto y qué se cobró. */
export function lineaVentaCompleta(l: LineaVentaBorrador): boolean {
  return l.tipo === "CONCEPTO"
    ? (l.concepto ?? null) !== null && (l.detalle ?? "").trim().length >= 2
    : l.producto !== null;
}

export function lineaVentaVacia(): LineaVentaBorrador {
  return {
    clave: Date.now() + Math.random(),
    producto: null,
    cantidad: "",
    precioUnitario: "",
  };
}

/** El precio de lista vigente de un producto, o `null` si no tiene ninguno. */
export function usePrecioVigente(producto: ProductoResumen | null) {
  const { data: precios, isFetching } = useQuery({
    queryKey: ["productos", "precios", producto?.id],
    queryFn: () => precioApi.historialDe(producto!.id),
    enabled: producto !== null,
    staleTime: 60_000,
  });
  const vigente = precios?.find((p) => p.fecha_fin === null) ?? null;
  const precio = vigente === null ? null : Number(vigente.precio_venta);
  return {
    precio: precio !== null && precio > 0 ? precio : null,
    cargando: isFetching,
  };
}

/**
 * Las líneas de una cotización o factura: producto y cantidad.
 *
 * El precio sin IVA arranca en el de lista vigente del producto y se puede
 * cambiar: es el que se pacta con el cliente, y la factura que salga de una
 * cotización lo respeta. Sin precio de lista —muchos de los 1.638 importados
 * llegaron así— se digita. El IVA lo decide el backend según si la empresa es
 * responsable.
 *
 * Cada línea muestra su precio sin IVA, el subtotal, el IVA y el total, y al
 * pie van los del documento, calculados igual que el servidor
 * (`lib/totales.ts`). Las retenciones no están: esas las calcula el
 * servidor al emitir.
 */
export function EditorLineasVenta({
  lineas,
  onCambiar,
  precioSiempreDigitado = false,
  mostrarExistencia = true,
  conConceptos = false,
}: {
  lineas: LineaVentaBorrador[];
  onCambiar: (lineas: LineaVentaBorrador[]) => void;
  /**
   * Solo la nota débito: el precio se digita siempre, tenga o no el producto
   * uno de lista. Lo que se le cobra de más al cliente —un flete, un interés,
   * un mayor valor— es un importe nuevo, y el precio de venta del catálogo no
   * tiene nada que ver con él.
   */
  precioSiempreDigitado?: boolean;
  /**
   * La existencia se muestra donde importa. Una nota débito no mueve el
   * kardex, y ahí el saldo en bodega es ruido.
   */
  mostrarExistencia?: boolean;
  /** Solo la factura: deja agregar servicios y otros ingresos por concepto. */
  conConceptos?: boolean;
}) {
  const actualizar = (clave: number, cambio: Partial<LineaVentaBorrador>) =>
    onCambiar(lineas.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));

  // El IVA de la línea: el del producto, si la empresa lo liquida. Es lo
  // mismo que decide el servidor, que fuerza 0 a quien no es responsable.
  const {
    porLinea: calculos,
    totales,
    pendientes,
    responsable: responsableCargado,
  } = useTotalesBorrador(lineas, { siempreDigitado: precioSiempreDigitado });
  const responsable = responsableCargado ?? true;
  const completas = calculos.filter((c) => c !== null);

  const agregar = () => onCambiar([...lineas, lineaVentaVacia()]);
  const quitar = (clave: number) =>
    onCambiar(lineas.filter((l) => l.clave !== clave));

  // La página de la factura (pantalla 13) lleva la tabla del diseño: qué,
  // tipo y a dónde va, cantidad, precio, IVA y subtotal, con las dos maneras
  // de agregar al pie. La cotización y las notas siguen con la de siempre.
  if (conConceptos) {
    const th = "px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground";
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="border-y border-border">
            <tr>
              <th scope="col" className={cn(th, "min-w-72 pl-6")}>Qué</th>
              <th scope="col" className={th}>Tipo y a dónde va</th>
              <th scope="col" className={cn(th, "text-right")}>Cant.</th>
              <th scope="col" className={cn(th, "text-right")}>Precio sin IVA</th>
              {responsable && <th scope="col" className={cn(th, "text-right")}>IVA</th>}
              <th scope="col" className={cn(th, "text-right")}>Total</th>
              <th scope="col" className="w-12 pr-6" />
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => {
              const c = l.concepto ?? null;
              const esServicio = c?.cuenta?.codigo.startsWith("41") ?? true;
              return (
                <tr key={l.clave} className="border-b border-border align-top">
                  <td className="py-3.5 pr-3 pl-6">
                    {l.tipo === "CONCEPTO" ? (
                      <div className="flex flex-col gap-1">
                        <Input
                          value={l.detalle ?? ""}
                          onChange={(e) => actualizar(l.clave, { detalle: e.target.value })}
                          placeholder="Qué se cobró: transporte a Turbo, arriendo de octubre…"
                          maxLength={200}
                          className="h-11 rounded-xl px-4"
                          aria-label={`Detalle de la línea ${i + 1}`}
                        />
                        <p className="text-xs text-muted-foreground">{esServicio ? "Servicio" : "Otro ingreso"}</p>
                      </div>
                    ) : (
                      <>
                        <SelectorProducto
                          valor={l.producto}
                          onElegir={(producto) => actualizar(l.clave, { producto, precioUnitario: "" })}
                        />
                        {mostrarExistencia && l.producto && <Existencia producto={l.producto} />}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {l.tipo === "CONCEPTO" ? (
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={cn(
                            "w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            esServicio ? "border-info/30 bg-info/15" : "border-warning/30 bg-warning/15",
                          )}
                        >
                          {esServicio ? "Servicio" : "Otro ingreso"}
                        </span>
                        <SelectorConcepto
                          tipos={["INGRESO"]}
                          valor={c}
                          onElegir={(concepto) => actualizar(l.clave, { concepto })}
                          filtro={(x) => x.cuenta !== null && !x.automatico}
                        />
                        {c?.cuenta && (
                          <p className="text-xs text-muted-foreground">
                            {c.operacional === false ? "No operacional" : c.cuenta.nombre} ·{" "}
                            <span className="font-mono">{c.cuenta.codigo}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <span className="w-fit rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium">
                          Producto
                        </span>
                        <p className="text-xs text-muted-foreground">Venta de mercancía</p>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <CampoCantidad
                      unidad={l.producto?.unidad_medida}
                      value={l.cantidad}
                      onChange={(cantidad) => actualizar(l.clave, { cantidad })}
                      placeholder="0"
                      className="ml-auto h-11 w-20 rounded-xl px-3 text-right font-mono"
                      aria-label={`Cantidad de la línea ${i + 1}`}
                    />
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    {l.tipo === "CONCEPTO" ? (
                      <CampoPrecio
                        value={l.precioUnitario}
                        onChange={(precioUnitario) => actualizar(l.clave, { precioUnitario })}
                        placeholder="0"
                        className="ml-auto h-11 w-32 rounded-xl px-3 text-right font-mono"
                        aria-label={`Precio de la línea ${i + 1}`}
                      />
                    ) : (
                      <PrecioDeLinea
                        producto={l.producto}
                        valor={l.precioUnitario}
                        onCambiar={(precioUnitario) => actualizar(l.clave, { precioUnitario })}
                        etiqueta={`Precio de la línea ${i + 1}`}
                        siempreDigitado={precioSiempreDigitado}
                      />
                    )}
                  </td>
                  {responsable && (
                    <td className="px-3 py-3.5 text-right">
                      {l.tipo === "CONCEPTO" ? (
                        <>
                          <select
                            value={l.ivaTarifa ?? "19"}
                            onChange={(e) => actualizar(l.clave, { ivaTarifa: e.target.value })}
                            className="h-11 rounded-xl border border-input bg-card px-2 font-mono text-sm"
                            aria-label={`IVA de la línea ${i + 1}`}
                          >
                            <option value="19">19 %</option>
                            <option value="5">5 %</option>
                            <option value="0">0 %</option>
                          </select>
                          <span className="mt-1 block font-mono text-xs whitespace-nowrap tabular-nums">
                            {calculos[i] === null ? "—" : pesos(calculos[i]!.iva)}
                          </span>
                        </>
                      ) : (
                        <span className="block pt-3 font-mono whitespace-nowrap tabular-nums">
                          {calculos[i] === null ? "—" : pesos(calculos[i]!.iva)}
                          {l.producto && (
                            <span className="mt-0.5 block font-sans text-[10px] text-muted-foreground">
                              {Number(l.producto.iva_tarifa)} %
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3.5 pt-6 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                    {calculos[i] === null ? "—" : pesos(calculos[i]!.total)}
                  </td>
                  <td className="py-3.5 pr-6">
                    {lineas.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar la línea ${i + 1}`}
                        className="text-muted-foreground hover:text-danger"
                        onClick={() => quitar(l.clave)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={responsable ? 7 : 6} className="px-6 py-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-9 rounded-xl border-dashed px-3 text-sm" onClick={agregar}>
                    <Plus className="size-3.5" />
                    Agregar producto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl border-dashed px-3 text-sm"
                    onClick={() => onCambiar([...lineas, lineaConceptoVacia()])}
                  >
                    <Plus className="size-3.5" />
                    Agregar servicio u otro ingreso
                  </Button>
                </div>
                <PieTotales
                  totales={totales}
                  pendientes={pendientes}
                  conIva={responsableCargado === true}
                  hayLineas={completas.length > 0}
                />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                {/* Con servicios, la fila no siempre es un producto. */}
                {conConceptos ? "Qué" : "Producto"}
              </th>
              <th scope="col" className="px-4 py-3">
                Cantidad
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Precio sin IVA
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Subtotal
              </th>
              {responsable && (
                <th scope="col" className="px-4 py-3 text-right">
                  IVA
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-right">
                Total
              </th>
              <th scope="col" className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineas.map((l, i) => (
              <tr key={l.clave} className="align-top">
                <td className="px-4 py-3">
                  {l.tipo === "CONCEPTO" ? (
                    <LineaDeConcepto
                      linea={l}
                      numero={i + 1}
                      conIva={responsable}
                      onCambiar={(cambio) => actualizar(l.clave, cambio)}
                    />
                  ) : (
                    <>
                      {conConceptos && (
                        <span className="mb-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                          Producto
                        </span>
                      )}
                      <SelectorProducto
                        valor={l.producto}
                        onElegir={(producto) =>
                          actualizar(l.clave, { producto, precioUnitario: "" })
                        }
                      />
                      {mostrarExistencia && l.producto && (
                        <Existencia producto={l.producto} />
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CampoCantidad
                    unidad={l.producto?.unidad_medida}
                    value={l.cantidad}
                    onChange={(cantidad) => actualizar(l.clave, { cantidad })}
                    placeholder="0"
                    className="h-11 w-32 rounded-xl px-4 text-right font-mono"
                    aria-label={`Cantidad de la línea ${i + 1}`}
                  />
                </td>
                <td className="px-4 py-3">
                  {l.tipo === "CONCEPTO" ? (
                    <CampoPrecio
                      value={l.precioUnitario}
                      onChange={(precioUnitario) =>
                        actualizar(l.clave, { precioUnitario })
                      }
                      placeholder="0"
                      className="ml-auto h-11 w-32 rounded-xl px-4 text-right font-mono"
                      aria-label={`Precio de la línea ${i + 1}`}
                    />
                  ) : (
                    <PrecioDeLinea
                      producto={l.producto}
                      valor={l.precioUnitario}
                      onCambiar={(precioUnitario) =>
                        actualizar(l.clave, { precioUnitario })
                      }
                      etiqueta={`Precio de la línea ${i + 1}`}
                      siempreDigitado={precioSiempreDigitado}
                    />
                  )}
                </td>
                <td className="px-4 py-3 pt-6 text-right font-mono text-sm tabular-nums">
                  {calculos[i] === null ? "—" : pesos(calculos[i]!.subtotal)}
                </td>
                {responsable && (
                  <td className="px-4 py-3 pt-6 text-right font-mono text-sm tabular-nums">
                    {calculos[i] === null ? (
                      "—"
                    ) : (
                      <>
                        {pesos(calculos[i]!.iva)}
                        <span className="mt-0.5 block font-sans text-[10px] text-muted-foreground">
                          {calculos[i]!.tarifa} %
                        </span>
                      </>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 pt-6 text-right font-mono text-sm font-semibold tabular-nums">
                  {calculos[i] === null ? "—" : pesos(calculos[i]!.total)}
                </td>
                <td className="px-4 py-3">
                  {/* Con una sola línea no se ofrece quitar: es el mínimo del documento. */}
                  {lineas.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar la línea ${i + 1}`}
                      className="text-muted-foreground hover:text-danger"
                      onClick={() => quitar(l.clave)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {conConceptos ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-dashed px-4"
              onClick={agregar}
            >
              <Plus className="size-4" />
              Agregar producto
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-dashed px-4"
              onClick={() => onCambiar([...lineas, lineaConceptoVacia()])}
            >
              <Plus className="size-4" />
              Agregar servicio u otro ingreso
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-xl px-4 text-brand-text"
            onClick={agregar}
          >
            <Plus className="size-4" />
            Agregar línea
          </Button>
        )}

        <PieTotales
          totales={totales}
          pendientes={pendientes}
          conIva={responsable}
          hayLineas={completas.length > 0}
        />
      </div>
    </div>
  );
}

/** Subtotal, IVA y total del documento, y cuántas líneas faltan completar. */
function PieTotales({
  totales,
  pendientes,
  conIva,
  hayLineas,
}: {
  totales: { subtotal: number; iva: number; total: number };
  pendientes: number;
  conIva: boolean;
  hayLineas: boolean;
}) {
  if (!hayLineas) return null;
  return (
    <dl
      aria-label="Totales de las líneas"
      className="grid min-w-[260px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 rounded-2xl border border-border bg-muted/30 p-4 text-sm"
    >
      <dt className="text-muted-foreground">Subtotal</dt>
      <dd className="text-right font-mono tabular-nums">{pesos(totales.subtotal)}</dd>
      {conIva && (
        <>
          <dt className="text-muted-foreground">IVA</dt>
          <dd className="text-right font-mono tabular-nums">{pesos(totales.iva)}</dd>
        </>
      )}
      <dt className="border-t border-border pt-1.5 font-semibold">Total</dt>
      <dd className="border-t border-border pt-1.5 text-right font-mono text-base font-semibold tabular-nums">
        {pesos(totales.total)}
      </dd>
      {pendientes > 0 && (
        <dd className="col-span-2 text-xs text-muted-foreground">
          {pendientes === 1
            ? "Falta completar 1 línea: no está en el total."
            : `Faltan completar ${pendientes} líneas: no están en el total.`}
        </dd>
      )}
    </dl>
  );
}

/**
 * La existencia del producto, como dato y no como traba: una cotización se
 * hace igual sin nada en bodega —el cliente pregunta hoy y la mercancía se
 * compra después—. Es al facturar cuando el kardex decide.
 */
function Existencia({ producto }: { producto: ProductoResumen }) {
  const { data: movimientos } = useQuery({
    queryKey: ["productos", "movimientos", producto.id, 1],
    queryFn: () => kardexApi.listar(producto.id, 1),
    staleTime: 30_000,
  });
  const ultimo = movimientos?.datos[0] ?? null;
  const saldo = Number(ultimo?.saldo_cantidad ?? 0);

  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      {saldo > 0 ? (
        <>
          Quedan <b className="font-mono font-semibold">{saldo}</b> en bodega
        </>
      ) : (
        "Sin existencia — se puede cotizar"
      )}
    </p>
  );
}

/**
 * El precio sin IVA de la línea. Arranca en el de lista —se ve como
 * sugerencia, y vacío quiere decir «el de lista», que no viaja— y se puede
 * cambiar: es el precio que se pacta con el cliente. Si se cambió, dice cuál
 * era el de lista y deja volver a él. Sin precio de lista, se digita.
 */
function PrecioDeLinea({
  producto,
  valor,
  onCambiar,
  etiqueta,
  siempreDigitado = false,
}: {
  producto: ProductoResumen | null;
  valor: string;
  onCambiar: (valor: string) => void;
  etiqueta: string;
  siempreDigitado?: boolean;
}) {
  const { precio, cargando } = usePrecioVigente(producto);

  if (producto === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const deLista = siempreDigitado ? null : precio;
  const digitado = valor.trim() === "" ? null : Number(valor);
  const cambiado = deLista !== null && digitado !== null && digitado !== deLista;
  const efectivo = digitado ?? deLista;
  const costo = Number(producto.saldo_costo_promedio);

  return (
    <div className="ml-auto flex w-36 flex-col items-end">
      <CampoPrecio
        value={valor}
        onChange={onCambiar}
        placeholder={
          deLista !== null
            ? mostrarNumero(String(deLista))
            : cargando && !siempreDigitado
              ? "…"
              : "0"
        }
        className="h-11 w-full rounded-xl px-3 text-right font-mono placeholder:text-foreground/70"
        aria-label={etiqueta}
      />
      <span className="mt-1 block text-right text-[10px] text-muted-foreground">
        {siempreDigitado
          ? "lo que se cobra de más"
          : cambiado
            ? `de lista ${pesos(deLista)}`
            : deLista !== null
              ? "de lista"
              : cargando
                ? ""
                : "sin precio de lista"}
      </span>
      {cambiado && (
        <button
          type="button"
          onClick={() => onCambiar("")}
          className="mt-0.5 text-[10px] font-medium text-brand-text underline-offset-2 hover:underline"
        >
          Volver al de lista
        </button>
      )}
      {/* Avisar acá y no solo al facturar: el precio se decide mientras se
          cotiza, con el cliente esperando. El costo sale del catálogo, que ya
          lo trae. No aplica a la nota débito —lo que se cobra de más no tiene
          costo contra el cual compararse—. */}
      {!siempreDigitado && costo > 0 && efectivo !== null && efectivo > 0 && efectivo < costo && (
        <span className="mt-1 block text-[10px] font-semibold text-danger">
          cuesta {formatCOP(costo)}
        </span>
      )}
    </div>
  );
}

/**
 * Una línea de servicio u otro ingreso: el concepto de INGRESO —que dice la
 * cuenta—, qué se cobró y la tarifa de IVA. No sale de ninguna bodega.
 */
function LineaDeConcepto({
  linea,
  numero,
  conIva,
  onCambiar,
}: {
  linea: LineaVentaBorrador;
  numero: number;
  conIva: boolean;
  onCambiar: (cambio: Partial<LineaVentaBorrador>) => void;
}) {
  const c = linea.concepto ?? null;
  // 41 es de la operación (un servicio); 42, no operacional (otro ingreso).
  const esServicio = c?.cuenta?.codigo.startsWith("41") ?? true;
  return (
    <div className="flex flex-col gap-2">
      <span
        className={cn(
          "inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
          esServicio
            ? "bg-info/15 text-info"
            : "bg-warning/15 text-warning-foreground",
        )}
      >
        {esServicio ? "Servicio" : "Otro ingreso"}
      </span>
      <SelectorConcepto
        tipos={["INGRESO"]}
        valor={c}
        onElegir={(concepto) => onCambiar({ concepto })}
        filtro={(x) => x.cuenta !== null && !x.automatico}
      />
      {c?.cuenta && (
        <p className="-mt-1 text-xs text-muted-foreground">
          {c.operacional === false ? "No operacional" : "Operacional"} ·{" "}
          {c.cuenta.codigo} {c.cuenta.nombre}
        </p>
      )}
      <Input
        value={linea.detalle ?? ""}
        onChange={(e) => onCambiar({ detalle: e.target.value })}
        placeholder="Qué se cobró: transporte a Turbo, arriendo de octubre…"
        maxLength={200}
        className="h-11 rounded-xl px-4"
        aria-label={`Detalle de la línea ${numero}`}
      />
      {conIva && (
        <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
          IVA
          <select
            value={linea.ivaTarifa ?? "19"}
            onChange={(e) => onCambiar({ ivaTarifa: e.target.value })}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground"
            aria-label={`IVA de la línea ${numero}`}
          >
            <option value="19">19 %</option>
            <option value="5">5 %</option>
            <option value="0">Excluido o exento</option>
          </select>
        </label>
      )}
    </div>
  );
}
