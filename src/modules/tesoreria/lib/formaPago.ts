import type { CajaResumen, MedioAlEmitirInput } from "../types/tesoreria.types";
import type { CuentaBancariaResumen } from "../types/bancos.types";

/**
 * Cómo se elige pagar un documento al emitirlo. Son cinco opciones en
 * pantalla y dos en la API —`CREDITO` o `CONTADO` con sus medios—: efectivo y
 * transferencia son contado con un solo medio, repartido es contado con
 * varios, y anticipo paga con lo que el cliente ya dejó (`aplicar`), sin
 * mover caja.
 */
export type ModoPago = "CREDITO" | "EFECTIVO" | "TRANSFERENCIA" | "ANTICIPO" | "REPARTIDO";

/** Un anticipo o saldo a favor del cliente con lo que le queda. */
export interface AnticipoDisponible {
  tipo: "ANTICIPO" | "SALDO_A_FAVOR";
  /** El movimiento del anticipo, o la factura con saldo a favor. */
  origenId: string;
  /** «Anticipo del 28 sep», «Saldo a favor FEV-1180». */
  etiqueta: string;
  disponible: number;
}

/** Un anticipo elegido para pagar, con cuánto se aplica. */
export interface AplicadoPago extends AnticipoDisponible {
  valor: string;
}

/** Cómo se paga lo que el anticipo no alcanza a cubrir. */
export type RestoDelAnticipo = "EFECTIVO" | "TRANSFERENCIA" | "CREDITO";

/** Un renglón del reparto. El valor vacío significa "se lleva lo que falte". */
export interface RenglonReparto {
  clave: number;
  medio: "CAJA" | "BANCO" | "ANTICIPO";
  caja: CajaResumen | null;
  cuenta: CuentaBancariaResumen | null;
  /** Solo en el renglón de anticipo: cuál. */
  anticipo?: AnticipoDisponible | null;
  valor: string;
}

export interface FormaPagoBorrador {
  /** `null` hasta que alguien elige: crédito no es el valor por defecto. */
  modo: ModoPago | null;
  caja: CajaResumen | null;
  cuenta: CuentaBancariaResumen | null;
  renglones: RenglonReparto[];
  /** Con anticipo: cuáles y cuánto de cada uno. */
  aplicados: AplicadoPago[];
  /** Con anticipo: cómo se paga lo que falte. */
  resto: RestoDelAnticipo;
  /** Cuándo vence, si es a crédito. Vacío: la cartera cuenta 30 días. */
  vence: string;
}

export interface AplicarInput {
  tipo: "ANTICIPO" | "SALDO_A_FAVOR";
  origenId: string;
  valor: number;
}

export type FormaPagoInput = (
  | { formaPago: "CREDITO"; vence?: string }
  | { formaPago: "CONTADO"; pagos: MedioAlEmitirInput[] }
) & { aplicar?: AplicarInput[] };

export function renglonRepartoVacio(
  medio: RenglonReparto["medio"] = "CAJA",
): RenglonReparto {
  return {
    clave: Date.now() + Math.random(),
    medio,
    caja: null,
    cuenta: null,
    anticipo: null,
    valor: "",
  };
}

export function formaPagoVacia(): FormaPagoBorrador {
  return {
    modo: null,
    caja: null,
    cuenta: null,
    renglones: [renglonRepartoVacio("CAJA"), renglonRepartoVacio("BANCO")],
    aplicados: [],
    resto: "EFECTIVO",
    vence: "",
  };
}

/** Lo que se paga con anticipos en esta forma de pago. */
export function aplicadoEn(b: FormaPagoBorrador): number {
  const valores =
    b.modo === "ANTICIPO"
      ? b.aplicados.map((a) => a.valor)
      : b.modo === "REPARTIDO"
        ? b.renglones.filter((r) => r.medio === "ANTICIPO").map((r) => r.valor)
        : [];
  return valores.reduce((t, v) => t + Math.round(Number(v || 0) * 100), 0) / 100;
}

/**
 * Lo que les queda a los anticipos usados después de aplicarlos: eso se le
 * devuelve al cliente, no se queda a favor de nadie.
 */
export function sobranteDeAnticipos(b: FormaPagoBorrador): number {
  const usados =
    b.modo === "ANTICIPO"
      ? b.aplicados.filter((a) => Number(a.valor) > 0).map((a) => ({ disponible: a.disponible, valor: a.valor }))
      : b.modo === "REPARTIDO"
        ? b.renglones
            .filter((r) => r.medio === "ANTICIPO" && r.anticipo)
            .map((r) => ({ disponible: r.anticipo!.disponible, valor: r.valor }))
        : [];
  return (
    usados.reduce((t, u) => t + Math.max(0, Math.round((u.disponible - Number(u.valor || 0)) * 100)), 0) / 100
  );
}

/** Si los anticipos pagan todo `total`: entonces no hay resto que cobrar. */
export function cubiertaPorAnticipo(b: FormaPagoBorrador, total: number | null | undefined): boolean {
  const aplicado = aplicadoEn(b);
  return aplicado > 0 && total !== null && total !== undefined && aplicado >= total - 0.004;
}

/**
 * Qué impide mandar esta forma de pago, o `null`. Solo lo que se puede saber
 * acá: si el reparto suma lo que la factura vale lo dice el servidor, que es
 * quien conoce el total al centavo. Con `total`, un anticipo que lo cubre no
 * pide cómo se paga el resto.
 */
export function problemaFormaPago(b: FormaPagoBorrador, total?: number | null): string | null {
  switch (b.modo) {
    case null:
      return "Elegí cómo se paga: crédito, efectivo, transferencia o repartido.";
    case "CREDITO":
      return null;
    case "EFECTIVO":
      return b.caja === null ? "Elegí la caja donde entra el efectivo." : null;
    case "TRANSFERENCIA":
      return b.cuenta === null ? "Elegí la cuenta de la transferencia." : null;
    case "ANTICIPO": {
      const elegidos = b.aplicados.filter((a) => Number(a.valor) > 0);
      if (elegidos.length === 0) return "Falta marcar el anticipo con que se paga.";
      const pasado = b.aplicados.find((a) => Number(a.valor) > a.disponible + 0.004);
      if (pasado !== undefined) return `A «${pasado.etiqueta}» solo le quedan ${pasado.disponible}.`;
      if (cubiertaPorAnticipo(b, total)) return null;
      if (b.resto === "EFECTIVO" && b.caja === null) return "Falta la caja donde entra el resto.";
      if (b.resto === "TRANSFERENCIA" && b.cuenta === null) return "Falta la cuenta donde entra el resto.";
      return null;
    }
    case "REPARTIDO": {
      if (b.renglones.length < 2)
        return "Un pago repartido necesita al menos dos medios.";
      const anticipos = new Set<string>();
      for (const r of b.renglones) {
        if (r.medio === "ANTICIPO") {
          if (!r.anticipo) return "Falta elegir el anticipo de cada renglón de anticipo.";
          if (anticipos.has(r.anticipo.origenId)) return "El mismo anticipo va en un solo renglón.";
          anticipos.add(r.anticipo.origenId);
          if (!(Number(r.valor) > 0)) return "El renglón de anticipo lleva cuánto se aplica.";
          if (Number(r.valor) > r.anticipo.disponible + 0.004)
            return `A «${r.anticipo.etiqueta}» solo le quedan ${r.anticipo.disponible}.`;
          continue;
        }
        if (r.medio === "CAJA" && r.caja === null)
          return "Elegí la caja de cada medio.";
        if (r.medio === "BANCO" && r.cuenta === null)
          return "Elegí la cuenta de cada medio.";
        if (r.valor.trim() !== "" && !(Number(r.valor) > 0))
          return "Cada valor tiene que ser mayor a cero, o quedar en blanco.";
      }
      const abiertos = b.renglones.filter((r) => r.medio !== "ANTICIPO" && r.valor.trim() === "").length;
      if (abiertos > 1)
        return "Dejá en blanco un solo valor: es el medio que se lleva el resto.";
      return null;
    }
  }
}

function aplicarDe(lista: Array<{ anticipo: AnticipoDisponible; valor: string }>): AplicarInput[] {
  return lista
    .filter((a) => Number(a.valor) > 0)
    .map((a) => ({ tipo: a.anticipo.tipo, origenId: a.anticipo.origenId, valor: Number(a.valor) }));
}

/** La forma de pago lista para la API. Llamar solo si `problemaFormaPago` es `null`. */
export function aFormaPago(b: FormaPagoBorrador): FormaPagoInput {
  const credito = (): FormaPagoInput =>
    b.vence === "" ? { formaPago: "CREDITO" } : { formaPago: "CREDITO", vence: b.vence };
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
    case "ANTICIPO": {
      // El resto va por un solo medio y sin valor: se lleva lo que falte. Si
      // el anticipo cubre la factura, el servidor no cobra nada por él.
      const aplicar = aplicarDe(b.aplicados.map((a) => ({ anticipo: a, valor: a.valor })));
      if (b.resto === "CREDITO") return { ...credito(), aplicar };
      if (b.resto === "TRANSFERENCIA" && b.cuenta !== null)
        return { formaPago: "CONTADO", pagos: [{ medio: "BANCO", cuentaBancariaId: b.cuenta.id }], aplicar };
      return {
        formaPago: "CONTADO",
        pagos: b.caja === null ? [] : [{ medio: "CAJA", cajaId: b.caja.id }],
        aplicar,
      };
    }
    case "REPARTIDO": {
      const aplicar = aplicarDe(
        b.renglones
          .filter((r) => r.medio === "ANTICIPO" && r.anticipo)
          .map((r) => ({ anticipo: r.anticipo!, valor: r.valor })),
      );
      return {
        formaPago: "CONTADO",
        pagos: b.renglones
          .filter((r) => r.medio !== "ANTICIPO")
          .map((r) => {
            const valor = r.valor.trim() === "" ? undefined : Number(r.valor);
            return r.medio === "CAJA"
              ? { medio: "CAJA" as const, cajaId: r.caja!.id, valor }
              : {
                  medio: "BANCO" as const,
                  cuentaBancariaId: r.cuenta!.id,
                  valor,
                };
          }),
        ...(aplicar.length > 0 && { aplicar }),
      };
    }
    default:
      return credito();
  }
}
