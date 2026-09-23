/**
 * La última empresa que se abrió en este navegador, para entrar directo a ella.
 *
 * Es una comodidad de quien lleva varias —un contador vuelve casi siempre al
 * cliente en el que estaba—, no un dato: si no está o no se puede leer, se
 * entra a la primera, y nada se rompe.
 */
const CLAVE = "ultima-empresa";

export const ultimaEmpresa = {
  leer(): string | null {
    try {
      return window.localStorage.getItem(CLAVE);
    } catch {
      return null;
    }
  },
  guardar(id: string): void {
    try {
      window.localStorage.setItem(CLAVE, id);
    } catch {
      // Sin almacenamiento, la próxima vez se entra a la primera.
    }
  },
};
