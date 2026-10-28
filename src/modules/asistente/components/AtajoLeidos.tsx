import Link from "next/link";
import { ScanLine } from "lucide-react";

import { MARIA_PROXIMAMENTE } from "../proximamente";

/**
 * El atajo de Ventas y Compras a lo que María leyó y espera aprobación.
 *
 * La pantalla vive en María → Documentos leídos, pero quien trabaja en ventas o
 * en compras sin ver a María —los roles VENTAS, COMPRAS y CONSULTA— tiene que
 * seguir llegando a lo suyo. Es una puerta, no otra copia: abre la misma
 * pantalla, parada en su pestaña.
 */
export function AtajoLeidos({ tipo }: { tipo: "facturas" | "pedidos" }) {
  if (MARIA_PROXIMAMENTE) return null;
  return (
    <Link
      href={`/dashboard/asistente/leidos?tipo=${tipo}`}
      className="inline-flex h-12 items-center gap-2 rounded-xl border border-input bg-card px-5 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-accent"
    >
      <ScanLine className="size-4" />
      {tipo === "facturas" ? "Facturas leídas por María" : "Pedidos leídos por María"}
    </Link>
  );
}
