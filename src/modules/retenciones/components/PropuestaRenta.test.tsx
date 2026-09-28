import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  aiuSinPedir,
  respuestasRentaVacias,
  type ExplicacionRetencion,
  type PropuestaRenta as Propuesta,
  type RenglonPropuesto,
  type RetencionPropuesta,
} from "../types/retenciones.types";
import {
  Explicacion,
  PropuestaRenta,
  estadoRenglon,
  fundamentoEnPalabras,
} from "./PropuestaRenta";

const explicacion = (
  guardas: ExplicacionRetencion["guardas"] = [],
): ExplicacionRetencion => ({
  motor_version: "1",
  fecha_causacion: "2026-09-28",
  uvt: 52374,
  guardas,
  resultado: 57000,
  texto: "ReteIVA",
});

const reteIva: RetencionPropuesta = {
  impuesto: "IVA",
  municipio: null,
  asumida: false,
  conceptoCodigo: "IVA_BIENES",
  nombre: "ReteIVA sobre bienes",
  renglones: [1],
  base: 380000,
  tarifa: 15,
  valor: 57000,
  cuentaId: "c-2367",
  texto: "ReteIVA",
  explicacion: explicacion(),
};

const propuesta = (p: Partial<Propuesta>): Propuesta => ({
  decision: "CALCULADA",
  motivo: "",
  renglones: [],
  retenciones: [],
  sinRetener: [],
  pendientes: 0,
  conceptos: [
    { codigo: "COMPRAS_GENERALES", nombre: "Compras generales" },
    { codigo: "SERVICIOS_GENERALES", nombre: "Servicios generales" },
  ],
  ...p,
});

const renglonClaro: RenglonPropuesto = {
  orden: 1,
  concepto: "COMPRAS_GENERALES",
  origen: "PRODUCTO",
  certeza: "CLARA",
  razon: "Es un producto del inventario: compras generales.",
  elegido: "COMPRAS_GENERALES",
  pendiente: false,
};

const nombreDe = (c: string | null) =>
  ({
    COMPRAS_GENERALES: "Compras generales",
    SERVICIOS_GENERALES: "Servicios generales",
  })[c ?? ""] ?? c ?? "";

describe("PropuestaRenta", () => {
  it("bug #11: sin renglones que clasificar muestra igual la fila del ReteIVA", () => {
    render(
      <PropuestaRenta
        propuesta={propuesta({
          motivo:
            "No retengo renta: el proveedor está en el SIMPLE. Retengo IVA.",
          retenciones: [reteIva],
          sinRetener: [
            {
              conceptoCodigo: "RENTA",
              nombre: "Retención en la fuente",
              texto: "No retengo renta: el proveedor está en el SIMPLE.",
            },
          ],
        })}
        cargando={false}
        error={null}
        respuestas={respuestasRentaVacias()}
        onCambiar={() => {}}
      />,
    );
    expect(screen.getByText(/ReteIVA sobre bienes/)).toBeInTheDocument();
    expect(screen.getAllByText("$ 57.000").length).toBeGreaterThan(0);
    expect(
      screen.getByText("No retengo renta: el proveedor está en el SIMPLE."),
    ).toBeInTheDocument();
  });

  it("sin renglones ni retenciones sigue mostrando solo el motivo", () => {
    render(
      <PropuestaRenta
        propuesta={propuesta({
          decision: "NO_SUJETO",
          motivo: "No retengo: tu empresa no es agente.",
        })}
        cargando={false}
        error={null}
        respuestas={respuestasRentaVacias()}
        onCambiar={() => {}}
      />,
    );
    expect(
      screen.getByText("No retengo: tu empresa no es agente."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Se retiene/)).not.toBeInTheDocument();
  });

  it("bug #12: tras «No es esto» y elegir otro concepto el chip dice «Lo dijiste vos»", async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(
      <PropuestaRenta
        propuesta={propuesta({ renglones: [renglonClaro] })}
        cargando={false}
        error={null}
        respuestas={respuestasRentaVacias()}
        onCambiar={() => {}}
      />,
    );
    expect(screen.getByText("La vi clara")).toBeInTheDocument();
    await usuario.click(screen.getByText("No es esto"));

    // El servidor recalcula con lo contestado y deja la certeza del motor.
    rerender(
      <PropuestaRenta
        propuesta={propuesta({
          renglones: [{ ...renglonClaro, elegido: "SERVICIOS_GENERALES" }],
        })}
        cargando={false}
        error={null}
        respuestas={{
          ...respuestasRentaVacias(),
          conceptos: { 1: "SERVICIOS_GENERALES" },
        }}
        onCambiar={() => {}}
      />,
    );
    expect(screen.getByText("Lo dijiste vos")).toBeInTheDocument();
    expect(screen.queryByText("La vi clara")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Es un producto del inventario: compras generales."),
    ).not.toBeInTheDocument();
  });

  it("bug #19: el selector muestra el nombre del concepto, no el código", () => {
    render(
      <PropuestaRenta
        propuesta={propuesta({
          conceptos: [
            {
              codigo: "EXT_GENERAL",
              nombre:
                "Exterior: intereses, comisiones, honorarios, regalías, arrendamientos, servicios y software",
            },
          ],
          renglones: [
            {
              orden: 1,
              concepto: null,
              origen: null,
              certeza: "PREGUNTA",
              razon: "Es un pago al exterior: decime qué concepto del exterior es.",
              elegido: "EXT_GENERAL",
              pendiente: false,
            },
          ],
        })}
        cargando={false}
        error={null}
        respuestas={{
          ...respuestasRentaVacias(),
          conceptos: { 1: "EXT_GENERAL" },
        }}
        onCambiar={() => {}}
      />,
    );
    expect(screen.queryByText("EXT_GENERAL")).not.toBeInTheDocument();
  });
});

describe("estadoRenglon", () => {
  it("lo que el motor vio claro y quedó igual sigue «La vi clara»", () => {
    const e = estadoRenglon(renglonClaro, "COMPRAS_GENERALES", nombreDe);
    expect(e.chip.texto).toBe("La vi clara");
    expect(e.razon).toBe(renglonClaro.razon);
  });

  it("cambiado a mano es «Lo dijiste vos» y no repite la razón vieja", () => {
    const e = estadoRenglon(renglonClaro, "SERVICIOS_GENERALES", nombreDe);
    expect(e.chip.texto).toBe("Lo dijiste vos");
    expect(e.razon).toContain("servicios generales");
    expect(e.razon).not.toContain("producto del inventario");
  });
});

describe("fundamentoEnPalabras (bug #19)", () => {
  it.each([
    "pagador_agente_iva",
    "vendedor_responsable_iva",
    "renglones_con_iva",
    "entre_agentes_1_2_5",
  ])("%s sale en palabras", (regla) => {
    expect(fundamentoEnPalabras(regla)).not.toContain("_");
    expect(fundamentoEnPalabras(regla)).not.toBe(regla);
  });

  it("una clave desconocida no sale cruda", () => {
    expect(fundamentoEnPalabras("regla_nueva_x")).toBe("Regla nueva x");
  });

  it("la explicación del ReteIVA no muestra claves internas", () => {
    render(
      <Explicacion
        e={explicacion([
          {
            regla: "pagador_agente_iva",
            resultado: true,
            fundamento: "Art. 437-2 ET",
          },
          {
            regla: "vendedor_responsable_iva",
            resultado: true,
            fundamento: "Art. 437 ET",
          },
          {
            regla: "renglones_con_iva",
            resultado: true,
            fundamento: "Art. 437-1 ET",
          },
          {
            regla: "entre_agentes_1_2_5",
            resultado: false,
            fundamento: "Par. 1 art. 437-2 ET",
          },
        ])}
      />,
    );
    const texto = document.body.textContent ?? "";
    expect(texto).not.toMatch(/[a-z]+_[a-z0-9]+/);
    expect(texto).toContain("Tu empresa es agente de retención de IVA");
  });
});

describe("El AIU de un renglón que ya no lo pide (bug #16)", () => {
  const aseo: RenglonPropuesto = {
    ...renglonClaro,
    concepto: "SERV_VIGILANCIA_ASEO",
    elegido: "SERV_VIGILANCIA_ASEO",
    pideAiu: true,
  };

  it("se quita el del renglón que cambió de concepto y queda el que se pide", () => {
    const p = propuesta({
      renglones: [aseo, { ...renglonClaro, orden: 2 }],
    });
    expect(aiuSinPedir(p, { 1: "1200000", 2: "300000" })).toEqual({
      1: "1200000",
    });
  });

  it("si todos lo piden, o no hay propuesta, no hay nada que quitar", () => {
    expect(
      aiuSinPedir(propuesta({ renglones: [aseo] }), { 1: "1200000" }),
    ).toBeNull();
    expect(aiuSinPedir(undefined, { 1: "1200000" })).toBeNull();
  });

  it("la pantalla lo quita sola y dice que el IVA también va sobre el AIU", () => {
    const onCambiar = vi.fn();
    const { rerender } = render(
      <PropuestaRenta
        propuesta={propuesta({ renglones: [aseo] })}
        cargando={false}
        error={null}
        respuestas={{ ...respuestasRentaVacias(), aiu: { 1: "1200000" } }}
        onCambiar={onCambiar}
      />,
    );
    expect(onCambiar).not.toHaveBeenCalled();
    expect(
      screen.getByText(/El IVA y la retención van sobre el AIU/),
    ).toBeTruthy();

    rerender(
      <PropuestaRenta
        propuesta={propuesta({ renglones: [renglonClaro] })}
        cargando={false}
        error={null}
        respuestas={{ ...respuestasRentaVacias(), aiu: { 1: "1200000" } }}
        onCambiar={onCambiar}
      />,
    );
    expect(onCambiar).toHaveBeenCalledWith(
      expect.objectContaining({ aiu: {} }),
    );
  });
});
