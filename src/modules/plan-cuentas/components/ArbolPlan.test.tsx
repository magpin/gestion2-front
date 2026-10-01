import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ArbolPlan } from "./ArbolPlan";
import type { CuentaEmpresa } from "../types/plan-cuentas.types";

const cuenta = (p: Partial<CuentaEmpresa> & { codigo: string }): CuentaEmpresa => ({
  id: p.codigo,
  nombre: `Cuenta ${p.codigo}`,
  codigo_puc: p.codigo.slice(0, 6),
  naturaleza: "DEBITO",
  codigo_padre: null,
  es_auxiliar: true,
  exige_tercero: false,
  exige_centro_costo: false,
  exige_base_gravable: false,
  activa: true,
  puc_nombre: "",
  puc_nivel: 6,
  puc_rango_libre: false,
  ...p,
});

describe("ArbolPlan", () => {
  it("cuelga el auxiliar de su cuenta madre y no al mismo nivel", () => {
    // Es lo que distingue esta vista de una lista plana: en la Access de origen
    // los auxiliares colgaban de la subcuenta de seis dígitos.
    render(
      <ArbolPlan
        cuentas={[
          cuenta({ codigo: "110505", nombre: "Caja general" }),
          cuenta({ codigo: "11050501", nombre: "Caja - Apartadó", codigo_padre: "110505" }),
          cuenta({ codigo: "111005", nombre: "Bancos" }),
        ]}
      />,
    );

    const raices = screen.getAllByRole("listitem").filter((li) => li.parentElement?.parentElement?.tagName !== "LI");
    expect(raices).toHaveLength(2);

    const caja = screen.getByText("Caja general").closest("li")!;
    expect(within(caja).getByText("Caja - Apartadó")).toBeInTheDocument();
  });

  it("sin cuentas invita a empezar por las sugerencias", () => {
    render(<ArbolPlan cuentas={[]} />);
    expect(screen.getByText(/Empiece por las sugerencias/)).toBeInTheDocument();
  });

  it("de solo lectura no ofrece acciones", () => {
    // Así lo usa el asistente: ahí el foco es confirmar la sugerencia.
    render(<ArbolPlan cuentas={[cuenta({ codigo: "110505" })]} />);
    expect(screen.queryByRole("button", { name: /Auxiliar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Desactivar/ })).not.toBeInTheDocument();
  });

  it("propone el consecutivo y lo deja bloqueado", () => {
    render(
      <ArbolPlan
        cuentas={[
          cuenta({ codigo: "110505" }),
          cuenta({ codigo: "11050501", codigo_padre: "110505" }),
        ]}
        onCrearAuxiliar={vi.fn()}
      />,
    );

    return userEvent.click(screen.getAllByRole("button", { name: /Auxiliar/ })[0]).then(() => {
      const codigo = screen.getByLabelText("Código del auxiliar");
      expect(codigo).toHaveValue("11050502");
      expect(codigo).toHaveAttribute("readonly");
    });
  });

  it("crea el auxiliar con el código propuesto y el nombre escrito", async () => {
    const onCrear = vi.fn();
    render(<ArbolPlan cuentas={[cuenta({ codigo: "111005" })]} onCrearAuxiliar={onCrear} />);

    await userEvent.click(screen.getByRole("button", { name: /Auxiliar/ }));
    await userEvent.type(screen.getByLabelText("Nombre del auxiliar"), "Bancolombia ahorros");
    await userEvent.click(screen.getByRole("button", { name: /^Crear/ }));

    expect(onCrear).toHaveBeenCalledWith({
      madre: "111005",
      nombre: "Bancolombia ahorros",
    });
  });

  it("no crea nada con un nombre de una letra", async () => {
    const onCrear = vi.fn();
    render(<ArbolPlan cuentas={[cuenta({ codigo: "111005" })]} onCrearAuxiliar={onCrear} />);

    await userEvent.click(screen.getByRole("button", { name: /Auxiliar/ }));
    await userEvent.type(screen.getByLabelText("Nombre del auxiliar"), "x");
    expect(screen.getByRole("button", { name: /^Crear/ })).toBeDisabled();
    expect(onCrear).not.toHaveBeenCalled();
  });

  it("muestra lo que la cuenta le va a exigir a cada asiento", () => {
    // Se ve acá porque es lo que después frena una factura al digitarla.
    render(
      <ArbolPlan
        cuentas={[cuenta({ codigo: "130505", exige_tercero: true, es_auxiliar: false })]}
      />,
    );
    expect(screen.getByText("tercero")).toBeInTheDocument();
    expect(screen.getByText("agrupa")).toBeInTheDocument();
  });

  it("tacha la cuenta desactivada en vez de esconderla", () => {
    // Nada se borra, y eso se ve: lo inactivo se apaga, no desaparece.
    render(<ArbolPlan cuentas={[cuenta({ codigo: "110505", activa: false })]} />);
    expect(screen.getByText("Cuenta 110505")).toHaveClass("line-through");
  });
});
