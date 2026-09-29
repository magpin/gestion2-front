import { describe, expect, it } from "vitest";

import { nombrePorDefecto } from "./Traslados";

describe("traslados", () => {
  it("nombra el traslado igual que el backend cuando el detalle va vacío", () => {
    expect(nombrePorDefecto("CAJA", "BANCO")).toBe("Consignación del efectivo");
    expect(nombrePorDefecto("BANCO", "CAJA")).toBe("Retiro para la caja");
    expect(nombrePorDefecto("BANCO", "BANCO")).toBe("Transferencia entre cuentas propias");
    expect(nombrePorDefecto("CAJA", "CAJA")).toBe("Traslado entre cajas");
  });
});
