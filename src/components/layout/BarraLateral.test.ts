import { describe, expect, it } from "vitest";

import type { RolCodigo } from "@/modules/auth/types/auth.types";
import { destinosVisibles } from "./BarraLateral";

/**
 * El menú nuevo reordena: nadie gana ni pierde puertas. Cada rol tiene que
 * llegar a lo mismo que antes, solo que con otro nombre donde Tesorería se
 * partió en dos y PUC y CIIU quedaron en Referencia.
 *
 * Las piezas nuevas (Cobros, Pagos, Gastos, Conceptos, Estados financieros)
 * están apagadas: sin `NEXT_PUBLIC_FUNCIONES` no aparecen para nadie.
 */
const casos: Array<[RolCodigo, string[]]> = [
  [
    "CAJA",
    [
      "/dashboard",
      "/dashboard/caja-bancos",
      "/dashboard/control",
      "/dashboard/plan-cuentas",
      "/dashboard/reportes",
      "/dashboard/referencia",
    ],
  ],
  [
    "VENTAS",
    [
      "/dashboard",
      "/dashboard/ventas",
      "/dashboard/inventario",
      "/dashboard/plan-cuentas",
      "/dashboard/terceros",
      "/dashboard/reportes",
      "/dashboard/referencia",
    ],
  ],
  [
    "COMPRAS",
    [
      "/dashboard",
      "/dashboard/compras",
      "/dashboard/inventario",
      "/dashboard/plan-cuentas",
      "/dashboard/terceros",
      "/dashboard/referencia",
    ],
  ],
  [
    "CONSULTA",
    [
      "/dashboard",
      "/dashboard/ventas",
      "/dashboard/compras",
      "/dashboard/caja-bancos",
      "/dashboard/control",
      "/dashboard/inventario",
      "/dashboard/contabilidad",
      "/dashboard/retenciones",
      "/dashboard/plan-cuentas",
      "/dashboard/reportes",
      "/dashboard/referencia",
    ],
  ],
  [
    "CONTADOR",
    [
      "/dashboard",
      "/dashboard/asistente",
      "/dashboard/ventas",
      "/dashboard/compras",
      "/dashboard/caja-bancos",
      "/dashboard/control",
      "/dashboard/inventario",
      "/dashboard/contabilidad",
      "/dashboard/retenciones",
      "/dashboard/plan-cuentas",
      "/dashboard/terceros",
      "/dashboard/reportes",
      "/dashboard/referencia",
      "/configuracion/empresa",
    ],
  ],
];

describe("BarraLateral: las mismas puertas por rol", () => {
  it.each(casos)("%s", (rol, esperado) => {
    expect(destinosVisibles([rol])).toEqual(esperado);
  });

  it("las piezas nuevas no se ven mientras estén apagadas", () => {
    const todos = destinosVisibles(["DIRECTOR", "CONTADOR", "ADMIN_TENANT"]);
    for (const nueva of ["cobros", "pagos", "gastos", "conceptos", "estados-financieros"]) {
      expect(todos).not.toContain(`/dashboard/${nueva}`);
    }
  });
});
