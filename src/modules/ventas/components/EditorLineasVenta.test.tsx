import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EditorLineasVenta, type LineaVentaBorrador } from "./EditorLineasVenta";
import type { ProductoResumen } from "@/modules/inventario/types/inventario.types";

// La tinta: $25.210,08 sin IVA, $30.000 con IVA. Responsable de IVA.
vi.mock("@/core/api/api", () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url.includes("/regimenes/vigente")) return Promise.resolve({ data: ["RESPONSABLE_IVA"] });
      if (url.endsWith("/precios")) return Promise.resolve({ data: [{ fecha_fin: null, precio_venta: "25210.08" }] });
      return Promise.resolve({ data: { datos: [] } });
    }),
  },
  mensajeDeError: () => "",
}));

const tinta = {
  id: "p-1",
  codigo: "T664",
  nombre: "Tinta Epson 664",
  iva_tarifa: "19",
  unidad_medida: "UND",
  saldo_costo_promedio: "18000",
} as unknown as ProductoResumen;

function montar(lineas: LineaVentaBorrador[], props: Partial<Parameters<typeof EditorLineasVenta>[0]> = {}) {
  const onCambiar = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EditorLineasVenta lineas={lineas} onCambiar={onCambiar} {...props} />
    </QueryClientProvider>,
  );
  return onCambiar;
}

describe("EditorLineasVenta en la factura (con conceptos)", () => {
  it("muestra el IVA en pesos, el total con IVA y el pie de totales", async () => {
    montar([{ clave: 1, producto: tinta, cantidad: "2", precioUnitario: "" }], { conConceptos: true });
    expect(screen.getByRole("columnheader", { name: "Precio sin IVA" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Total" })).toBeInTheDocument();
    const totales = await screen.findByLabelText("Totales de las líneas");
    expect(within(totales).getByText("Subtotal")).toBeInTheDocument();
    expect(within(totales).getByText("IVA")).toBeInTheDocument();
    // Los montos se muestran en pesos enteros: 59.999,99 se ve 60.000.
    expect(within(totales).getByText(/60\.000/)).toBeInTheDocument();
    // El IVA de la línea, en pesos, sobre el subtotal de 50.420,16.
    expect(screen.getAllByText(/9\.580/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/9\.579,83/)).toHaveLength(0);
  });

  it("sin líneas completas no hay pie", () => {
    montar([{ clave: 1, producto: null, cantidad: "", precioUnitario: "" }], { conConceptos: true });
    expect(screen.queryByLabelText("Totales de las líneas")).not.toBeInTheDocument();
  });
});

describe("EditorLineasVenta: el precio de la línea", () => {
  it("arranca en el de lista, como sugerencia", async () => {
    montar([{ clave: 1, producto: tinta, cantidad: "1", precioUnitario: "" }]);
    const campo = screen.getByLabelText("Precio de la línea 1");
    expect(campo).toHaveValue("");
    await vi.waitFor(() => expect(campo).toHaveAttribute("placeholder", "25.210,08"));
    expect(screen.getByText("de lista")).toBeInTheDocument();
  });

  it("se puede cambiar, y avisa cuál era el de lista", async () => {
    const onCambiar = montar([{ clave: 1, producto: tinta, cantidad: "1", precioUnitario: "" }]);
    await userEvent.type(screen.getByLabelText("Precio de la línea 1"), "2");
    expect(onCambiar).toHaveBeenLastCalledWith([expect.objectContaining({ precioUnitario: "2" })]);
  });

  it("cambiado: dice el de lista y deja volver a él", async () => {
    const onCambiar = montar([{ clave: 1, producto: tinta, cantidad: "1", precioUnitario: "20000" }]);
    expect(await screen.findByText(/de lista \$\s?25\.210$/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Volver al de lista" }));
    expect(onCambiar).toHaveBeenLastCalledWith([expect.objectContaining({ precioUnitario: "" })]);
  });

  it("bajo el costo, avisa cuánto cuesta", async () => {
    montar([{ clave: 1, producto: tinta, cantidad: "1", precioUnitario: "15000" }]);
    expect(await screen.findByText(/cuesta/)).toBeInTheDocument();
  });
});
