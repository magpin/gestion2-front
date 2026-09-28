import type { Concepto } from "../types/conceptos.types";

/**
 * Los conceptos en sus grupos, en el orden en que llegan (el backend ya los
 * ordena por grupo y por el orden del catálogo), filtrados por lo buscado.
 *
 * Se busca en el nombre, el grupo y el código de la cuenta: quien sabe
 * contabilidad busca «5135», quien no, «luz».
 */
export function agruparConceptos(
  conceptos: Concepto[],
  busqueda: string,
): Array<{ grupo: string; conceptos: Concepto[] }> {
  const q = normalizar(busqueda.trim());
  const visibles =
    q === ""
      ? conceptos
      : conceptos.filter((c) =>
          [c.nombre, c.grupo, c.cuenta?.codigo ?? "", c.cuenta?.nombre ?? "", ...c.pistas].some(
            (t) => normalizar(t).includes(q),
          ),
        );

  const grupos = new Map<string, Concepto[]>();
  for (const c of visibles) {
    grupos.set(c.grupo, [...(grupos.get(c.grupo) ?? []), c]);
  }
  return [...grupos].map(([grupo, lista]) => ({ grupo, conceptos: lista }));
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
