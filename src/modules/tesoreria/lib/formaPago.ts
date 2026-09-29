import type { CajaResumen, MedioAlEmitirInput } from "../types/tesoreria.types";
import type { CuentaBancariaResumen } from "../types/bancos.types";

/**
 * Cómo se elige pagar un documento al emitirlo. Son cuatro opciones en
 * pantalla y dos en la API —`CREDITO` o `CONTADO` con sus medios—: efectivo y
 * transferencia son contado con un solo medio, repartido es contado con
 * varios.
 */
export type ModoPago = "CREDITO" | "EFECTIVO" | "TRANSFERENCIA" | "REPARTIDO";

/** Un renglón del reparto. El valor vacío significa "se lleva lo que falte". */
export interface RenglonReparto {
  clave: number;
  medio: "CAJA" | "BANCO";
  caja: CajaResumen | null;
  cuenta: CuentaBancariaResumen | null;
  valor: string;
}

export interface FormaPagoBorrador {
  /** `null` hasta que alguien elige: crédito no es el valor por defecto. */
  modo: ModoPago | null;
  caja: CajaResumen | null;
  cuenta: CuentaBancariaResumen | null;
  renglones: RenglonReparto[];
  /** Cuándo vence, si es a crédito. Vacío: la cartera cuenta 30 días. */
  vence: string;
}

export type FormaPagoInput =
  | { formaPago: "CREDITO"; vence?: string }
  | { formaPago: "CONTADO"; pagos: MedioAlEmitirInput[] };

export function renglonRepartoVacio(
  medio: "CAJA" | "BANCO" = "CAJA",
): RenglonReparto {
  return {
    clave: Date.now() + Math.random(),
    medio,
    caja: null,
    cuenta: null,
    valor: "",
  };
}

export function formaPagoVacia(): FormaPagoBorrador {
  return {
    modo: null,
    caja: null,
    cuenta: null,
    renglones: [renglonRepartoVacio("CAJA"), renglonRepartoVacio("BANCO")],
    vence: "",
  };
}

/**
 * Qué impide mandar esta forma de pago, o `null`. Solo lo que se puede saber
 * acá: si el reparto suma lo que la factura vale lo dice el servidor, que es
 * quien conoce el total al centavo.
 */
export function problemaFormaPago(b: FormaPagoBorrador): string | null {
  switch (b.modo) {
    case null:
      return "Elegí cómo se paga: crédito, efectivo, transferencia o repartido.";
    case "CREDITO":
      return null;
    case "EFECTIVO":
      return b.caja === null ? "Elegí la caja donde entra el efectivo." : null;
    case "TRANSFERENCIA":
      return b.cuenta === null ? "Elegí la cuenta de la transferencia." : null;
    case "REPARTIDO": {
      if (b.renglones.length < 2)
        return "Un pago repartido necesita al menos dos medios.";
      for (const r of b.renglones) {
        if (r.medio === "CAJA" && r.caja === null)
          return "Elegí la caja de cada medio.";
        if (r.medio === "BANCO" && r.cuenta === null)
          return "Elegí la cuenta de cada medio.";
        if (r.valor.trim() !== "" && !(Number(r.valor) > 0))
          return "Cada valor tiene que ser mayor a cero, o quedar en blanco.";
      }
      const abiertos = b.renglones.filter((r) => r.valor.trim() === "").length;
      if (abiertos > 1)
        return "Dejá en blanco un solo valor: es el medio que se lleva el resto.";
      return null;
    }
  }
}

/** La forma de pago lista para la API. Llamar solo si `problemaFormaPago` es `null`. */
export function aFormaPago(b: FormaPagoBorrador): FormaPagoInput {
  switch (b.modo) {
    case "EFECTIVO":
      return {
        formaPago: "CONTADO",
        pagos: [{ medio: "CAJA", cajaId: b.caja!.id }],
      };
    case "TRANSFERENCIA":
      return {
        formaPago: "CONTADO",
        pagos: [{ medio: "BANCO", cuentaBancariaId: b.cuenta!.id }],
      };
    case "REPARTIDO":
      return {
        formaPago: "CONTADO",
        pagos: b.renglones.map((r) => {
          const valor = r.valor.trim() === "" ? undefined : Number(r.valor);
          return r.medio === "CAJA"
            ? { medio: "CAJA" as const, cajaId: r.caja!.id, valor }
            : {
                medio: "BANCO" as const,
                cuentaBancariaId: r.cuenta!.id,
                valor,
              };
        }),
      };
    default:
      return b.vence === ""
        ? { formaPago: "CREDITO" }
        : { formaPago: "CREDITO", vence: b.vence };
  }
}
