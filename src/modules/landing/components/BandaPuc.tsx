import styles from "../landing.module.css";

/**
 * Las cuentas del PUC pasando de largo.
 *
 * Es la prueba más barata de que el sistema habla el idioma: nadie que lleve
 * libros en Colombia necesita que le expliquen qué es 1105 o 2365.
 *
 * La lista va escrita dos veces. No es un descuido: la animación desplaza el
 * contenedor un -50 %, así que al terminar, la segunda copia queda exactamente
 * donde empezó la primera y el ciclo se reinicia sin salto.
 */
const CUENTAS = [
  ["1105", "Caja"],
  ["1110", "Bancos"],
  ["1305", "Clientes"],
  ["1435", "Mercancías"],
  ["2205", "Proveedores"],
  ["2365", "Retención en la fuente"],
  ["2408", "IVA por pagar"],
  ["4135", "Comercio"],
  ["5195", "Diversos"],
] as const;

export function BandaPuc() {
  return (
    <div
      aria-hidden="true"
      className={`${styles.banda} ${styles.mascaraBanda} flex h-16 items-center overflow-hidden border-y border-rail-line bg-rail`}
    >
      <div
        className={`${styles.marquee} flex gap-12 pl-12 font-mono text-sm whitespace-nowrap text-rail-muted`}
      >
        {[0, 1].map((copia) =>
          CUENTAS.map(([codigo, nombre]) => (
            <span key={`${copia}-${codigo}`} className="flex gap-12">
              <span>
                <span className="text-rail-foreground">{codigo}</span> {nombre}
              </span>
              <span className="text-brand">·</span>
            </span>
          )),
        )}
      </div>
    </div>
  );
}
