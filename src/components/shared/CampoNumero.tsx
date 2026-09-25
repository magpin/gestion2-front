"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import { Input } from "@/components/ui/input";
import {
  DECIMALES_CANTIDAD,
  admiteDecimales,
  esEntero,
  leerNumero,
  mostrarNumero,
} from "@/lib/numeros";

type PropsDeInput = Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type" | "inputMode" | "min" | "max" | "step"
>;

/**
 * El campo de los números: muestra puntos de mil y entrega el valor sin ellos
 * (`lib/numeros.ts`). Lo que el formulario recibe en `onChange` es el mismo
 * texto de siempre —«30000», «1.5»—, así que convertirlo y guardarlo no cambia.
 *
 * Una tecla que no se acepta —una letra, una coma en un campo entero— deja el
 * campo como estaba. La coma, además, **se avisa**: quien escribe «30.000,5»
 * esperando centavos vería llegar el 5 como un dígito más —300.005—, y eso no
 * puede pasar callado. Y el cursor no salta al final cuando aparece un punto de
 * mil: se queda después del mismo dígito.
 */
function CampoNumero({
  value,
  onChange,
  decimales,
  negativo,
  ...props
}: PropsDeInput & {
  /** El valor sin separadores: «30000», «1.5», «». */
  value: string;
  onChange: (valor: string) => void;
  decimales: number;
  negativo?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  /** Cuántos caracteres con valor —dígitos, coma, signo— quedan antes del cursor. */
  const cursor = useRef<number | null>(null);
  const visto = mostrarNumero(value);
  const [sinCentavos, setSinCentavos] = useState(false);

  useEffect(() => {
    if (!sinCentavos) return;
    const t = setTimeout(() => setSinCentavos(false), 4000);
    return () => clearTimeout(t);
  }, [sinCentavos]);

  useLayoutEffect(() => {
    const campo = ref.current;
    if (campo === null || cursor.current === null) return;
    let significativos = cursor.current;
    let posicion = 0;
    while (posicion < visto.length && significativos > 0) {
      if (/[\d,-]/.test(visto[posicion])) significativos--;
      posicion++;
    }
    campo.setSelectionRange(posicion, posicion);
    cursor.current = null;
  }, [visto]);

  const campo = (
    <Input
      {...props}
      ref={ref}
      aria-invalid={sinCentavos || props["aria-invalid"]}
      type="text"
      inputMode={decimales > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      value={visto}
      onChange={(e) => {
        const escrito = e.target.value;
        let leido = leerNumero(escrito, { decimales, negativo });
        // Un valor con decimales en un campo entero —un precio viejo con
        // centavos, o una cantidad de kilos cuando se cambió el producto por
        // uno en unidades— se ve con su coma. Si no se aceptara nada, el campo
        // quedaría trabado: al editarlo, se quedan los enteros, a la vista.
        if (leido === null && decimales === 0 && !esEntero(value)) {
          leido = leerNumero(escrito.split(",")[0], { negativo });
        }
        if (leido === null) {
          if (decimales === 0 && escrito.includes(",")) setSinCentavos(true);
          return;
        }
        const hasta = e.target.selectionStart ?? escrito.length;
        cursor.current = escrito.slice(0, hasta).replace(/[^\d,-]/g, "").length;
        onChange(leido);
      }}
    />
  );

  // El aviso va al lado y no envolviendo el campo: si el campo cambiara de
  // padre, React lo volvería a crear y se perdería el foco a mitad de tecleo.
  return (
    <>
      {campo}
      {sinCentavos && (
        <span role="alert" className="mt-1 block text-[11px] text-danger">
          Sin centavos: solo pesos enteros.
        </span>
      )}
    </>
  );
}

/**
 * Pesos: enteros, con punto de mil. `negativo` solo donde el saldo puede
 * serlo —un banco sobregirado—.
 */
export function CampoPesos(
  props: PropsDeInput & {
    value: string;
    onChange: (valor: string) => void;
    negativo?: boolean;
  },
) {
  return <CampoNumero {...props} decimales={0} />;
}

/**
 * Una cantidad: entera en unidades, cajas, pares y docenas; con decimales
 * —coma— en kilos, litros y metros. Sin unidad —todavía no se eligió el
 * producto— va entera.
 */
export function CampoCantidad({
  unidad,
  fraccionable,
  ...props
}: PropsDeInput & {
  value: string;
  onChange: (valor: string) => void;
  unidad?: string | null;
  /**
   * Para cuando no se tiene la unidad y sí algo que la delata: en una nota
   * crédito, si lo facturado tenía decimales, lo devuelto también puede.
   */
  fraccionable?: boolean;
}) {
  return (
    <CampoNumero
      {...props}
      decimales={
        (fraccionable ?? admiteDecimales(unidad)) ? DECIMALES_CANTIDAD : 0
      }
    />
  );
}

/**
 * El valor de un campo de `react-hook-form` registrado con `valueAsNumber`,
 * como texto para `CampoPesos`. `NaN` —campo vacío— es «».
 */
export function comoTexto(valor: unknown): string {
  return typeof valor === "number" && Number.isFinite(valor)
    ? String(valor)
    : typeof valor === "string"
      ? valor
      : "";
}

/** Y de vuelta: «» es `NaN`, lo mismo que daba `valueAsNumber` vacío. */
export function comoNumero(valor: string): number {
  return valor === "" || valor === "-" ? Number.NaN : Number(valor);
}
