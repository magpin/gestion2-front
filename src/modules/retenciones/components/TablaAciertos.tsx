import type { AciertoFuente } from "../types/retenciones.types";

/** De dónde salió el concepto propuesto, dicho para una persona. */
export const NOMBRE_FUENTE: Record<string, string> = {
  CONFIRMADO: "Lo que ya me dijiste",
  PRODUCTO: "Producto del inventario",
  CIIU: "Actividad del proveedor (CIIU)",
  PALABRAS: "Lo que dice el renglón o la cuenta",
  IA: "La IA",
};

/**
 * Por fuente: cuántas veces se aceptó el concepto propuesto tal cual y cuántas
 * se cambió (plan motor de retenciones, Fase 5, §5.3). La misma tabla para la
 * empresa y para la consola.
 */
export function TablaAciertos({ filas }: { filas: AciertoFuente[] }) {
  if (filas.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        Todavía nada. Aparece cuando se registran compras con retención.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <tr>
            {["Fuente", "Renglones", "Tal cual", "Cambiado", "Acierto"].map(
              (x) => (
                <th key={x} scope="col" className="px-5 py-4">
                  {x}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((f) => {
            const propuso = f.origen !== null;
            return (
              <tr key={f.origen ?? "ninguna"}>
                <td className="px-5 py-3 text-sm font-medium">
                  {propuso
                    ? (NOMBRE_FUENTE[f.origen!] ?? f.origen)
                    : "Ninguna: te pregunté"}
                </td>
                <td className="px-5 py-3 font-mono text-sm">{f.total}</td>
                <td className="px-5 py-3 font-mono text-sm">
                  {propuso ? f.aciertos : "—"}
                </td>
                <td className="px-5 py-3 font-mono text-sm">
                  {propuso ? f.total - f.aciertos : "—"}
                </td>
                <td className="px-5 py-3 font-mono text-sm">
                  {propuso && f.total > 0
                    ? `${Math.round((f.aciertos / f.total) * 100)} %`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
