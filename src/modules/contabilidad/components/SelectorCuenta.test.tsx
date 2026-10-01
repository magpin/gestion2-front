import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let rolesActuales: string[] = [];
vi.mock("@/core/store/authStore", () => ({
  useAuthStore: (sel: (s: { roles: string[] }) => unknown) => sel({ roles: rolesActuales }),
}));
import { SelectorCuenta } from "./SelectorCuenta";

const creada = {
  id: "c-nueva",
  codigo: "11100502",
  nombre: "Bancos - Bancolombia ···1234",
  codigo_puc: "111005",
  naturaleza: "DEBITO",
  codigo_padre: "111005",
  es_auxiliar: true,
  exige_tercero: false,
  exige_centro_costo: false,
  exige_base_gravable: false,
  activa: true,
  puc_nombre: "",
  puc_nivel: 6,
  puc_rango_libre: false,
};

const post = vi.fn(() => Promise.resolve({ data: creada }));
vi.mock("@/core/api/api", () => ({
  api: {
    get: vi.fn((url: string) =>
      url.endsWith("/siguiente")
        ? Promise.resolve({ data: { codigo: "11100502" } })
        : Promise.resolve({ data: [] }),
    ),
    post: (...a: unknown[]) => post(...(a as [])),
  },
  mensajeDeError: () => "",
}));
vi.mock("@/lib/avisos", () => ({ aviso: { exito: vi.fn(), falla: vi.fn() } }));

function montar(roles: string[]) {
  rolesActuales = roles;
  const onElegir = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SelectorCuenta valor={null} onElegir={onElegir} crear={{ madres: ["111005"], nombreSugerido: "Bancos - Bancolombia ···1234" }} />
    </QueryClientProvider>,
  );
  return onElegir;
}

describe("SelectorCuenta con «Crear cuenta auxiliar»", () => {
  beforeEach(() => post.mockClear());

  it("no lo ofrece a un rol que no puede crear bajo esa madre", async () => {
    montar(["VENTAS"]);
    await userEvent.click(screen.getByRole("button", { name: /Seleccione una cuenta auxiliar/ }));
    expect(screen.queryByRole("button", { name: /Crear cuenta auxiliar/ })).not.toBeInTheDocument();
  });

  it("CAJA crea la cuenta del banco y queda elegida", async () => {
    const onElegir = montar(["CAJA"]);
    await userEvent.click(screen.getByRole("button", { name: /Seleccione una cuenta auxiliar/ }));
    await userEvent.click(screen.getByRole("button", { name: /Crear cuenta auxiliar/ }));

    expect(await screen.findByText("11100502")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Bancos - Bancolombia ···1234");
    await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await vi.waitFor(() => expect(onElegir).toHaveBeenCalledWith(creada));
    expect(post).toHaveBeenCalledWith("/plan-cuentas/auxiliar", {
      madre: "111005",
      nombre: "Bancos - Bancolombia ···1234",
    });
  });
});
