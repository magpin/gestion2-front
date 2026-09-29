import { useEffect, useState } from "react";

/** El valor, pero solo cuando dejó de cambiar un rato: para no consultar en cada tecla. */
export function useQuieto<T>(valor: T, ms = 400): T {
  const [quieto, setQuieto] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setQuieto(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return quieto;
}
