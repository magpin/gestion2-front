import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ArchivoDelLote, Lote } from "../types/lote.types";
import { caraDelLote, resumen, TurnosDelLote } from "./TarjetaLote";

const archivo = (cambios: Partial<ArchivoDelLote>): ArchivoDelLote => ({
  id: cambios.nombre ?? "a",
  orden: 0,
  nombre: "FC-0231.pdf",
  situacion: "LISTA",
  tipo: "FACTURA_COMPRA",
  titulo: "Papelería Central · FC-0231",
  descripcion: "Factura de compra",
  valor: 2_380_000,
  motivos: [],
  nota: null,
  documentoId: "d1",
  registrado: null,
  duplicadoDe: null,
  ...cambios,
});

const lote = (cambios: Partial<Lote>): Lote => ({
  id: "l1",
  creadoEn: "2026-09-23T10:00:00Z",
  terminadoEn: "2026-09-23T10:01:00Z",
  detenido: false,
  total: 3,
  hechos: 3,
  listas: 1,
  apartadas: 1,
  actual: null,
  archivos: [
    archivo({}),
    archivo({
      id: "b",
      nombre: "FC-9012.jpg",
      titulo: "Ferretería El Tornillo · FC-9012",
      situacion: "APARTADA",
      documentoId: "d2",
      motivos: [{ clave: "DUPLICADO", texto: "Posible duplicado: ya está registrada como FC-9012" }],
      duplicadoDe: { id: "c", numero: "FC-9012", fecha: "2026-09-02", total: 1_155_000 },
    }),
    archivo({
      id: "c",
      nombre: "extracto.csv",
      titulo: "extracto.csv",
      situacion: "NO_SE_LEE",
      tipo: null,
      descripcion: "Extracto bancario",
      valor: null,
      documentoId: null,
      nota: "Extracto bancario: no es algo que yo lea.",
    }),
  ],
  ...cambios,
});

function mostrar(l: Lote) {
  const acciones = { alDetener: vi.fn(), alRevisar: vi.fn(), alDescartar: vi.fn() };
  render(<TurnosDelLote lote={l} deteniendo={false} {...acciones} />);
  return acciones;
}

describe("TurnosDelLote", () => {
  it("terminado: nunca dice «asenté»; separa listas, apartadas y lo demás", () => {
    mostrar(lote({}));
    expect(screen.getByText("Leé estos 3 documentos.")).toBeInTheDocument();
    expect(screen.queryByText(/asent/i)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Listas para aprobar" })).toHaveTextContent(
      "Papelería Central · FC-0231",
    );
    expect(screen.getByRole("region", { name: "Apartadas" })).toHaveTextContent("Posible duplicado");
    expect(screen.getByRole("region", { name: "Lo demás" })).toHaveTextContent("no es algo que yo lea");
  });

  it("la lista se revisa para aprobar; la duplicada ofrece descartarla o revisarla", async () => {
    const { alRevisar, alDescartar } = mostrar(lote({}));
    await userEvent.click(screen.getByRole("button", { name: "Revisar y aprobar" }));
    expect(alRevisar).toHaveBeenCalledWith(expect.objectContaining({ documentoId: "d1" }));

    const apartadas = screen.getByRole("region", { name: "Apartadas" });
    await userEvent.click(within(apartadas).getByRole("button", { name: "Es la misma, descartala" }));
    expect(alDescartar).toHaveBeenCalledWith(expect.objectContaining({ documentoId: "d2" }));
    expect(within(apartadas).getByRole("button", { name: "Es distinta, revisala" })).toBeInTheDocument();
  });

  it("en marcha: cuántos van, cuál se lee, y se puede detener", async () => {
    const { alDetener } = mostrar(
      lote({ terminadoEn: null, hechos: 1, actual: "FC-9012.jpg", listas: 0, apartadas: 0 }),
    );
    expect(screen.getByText("1 de 3 listos")).toBeInTheDocument();
    expect(screen.getByText("Mirando FC-9012.jpg…")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Detener" }));
    expect(alDetener).toHaveBeenCalledWith("l1");
  });
});

describe("resumen", () => {
  it("cuenta listas y apartadas, y recuerda que nada se registra solo", () => {
    expect(resumen(lote({ listas: 9, apartadas: 3 }))).toBe(
      "Listo. **9** están listas para que las apruebes, y **3** las aparté porque hay algo que decidir. Nada se registra hasta que lo apruebes.",
    );
  });
  it("detenido dice hasta dónde llegó", () => {
    expect(resumen(lote({ detenido: true, hechos: 2 }))).toBe(
      "Paré, como pediste. Alcancé a mirar 2 de 3.",
    );
  });
});

describe("caraDelLote — la cara del turno del lote", () => {
  it("leyendo mientras el lote está en marcha", () => {
    expect(caraDelLote(lote({ terminadoEn: null }))).toBe("leyendo");
  });

  it("«no pude» si algún archivo falló", () => {
    expect(caraDelLote(lote({ archivos: [archivo({}), archivo({ id: "f", situacion: "FALLO" })] }))).toBe(
      "noPude",
    );
  });

  it("la de siempre al terminar sin fallos, aunque haya algo apartado", () => {
    expect(caraDelLote(lote({}))).toBeUndefined();
  });
});
